/**
 * WebSocket Client - Manages real-time connection to the server
 */

export interface WSMessage {
  type: string;
  payload?: unknown;
  id?: string;
  sessionId?: string;
}

type MessageHandler = (message: WSMessage) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private globalHandlers: Set<MessageHandler> = new Set();
  private messageQueue: WSMessage[] = [];
  private isConnected: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private sessionId: string | null = null;

  constructor(url: string = 'ws://localhost:3001') {
    this.url = url;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.flushMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WSMessage;
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnected = false;
          this.stopHeartbeat();
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  /**
   * Send a message to the server
   */
  send(message: WSMessage): boolean {
    if (!this.isConnected || !this.ws) {
      this.messageQueue.push(message);
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      this.messageQueue.push(message);
      return false;
    }
  }

  /**
   * Subscribe to a specific message type
   */
  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  /**
   * Subscribe to all messages
   */
  onAny(handler: MessageHandler): () => void {
    this.globalHandlers.add(handler);
    return () => {
      this.globalHandlers.delete(handler);
    };
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: WSMessage): void {
    // Handle connection status
    if (message.type === 'connection:status') {
      const payload = message.payload as { connected: boolean; sessionId?: string };
      if (payload.sessionId) {
        this.sessionId = payload.sessionId;
      }
    }

    // Notify global handlers
    this.globalHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in global message handler:', error);
      }
    });

    // Notify type-specific handlers
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in ${message.type} handler:`, error);
        }
      });
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'heartbeat', payload: { timestamp: Date.now() } });
    }, 30000);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Set WebSocket URL
   */
  setUrl(url: string): void {
    this.url = url;
    if (this.isConnected) {
      this.disconnect();
      this.connect();
    }
  }
}

// Export singleton instance
export const wsClient = new WebSocketClient();

// Export helper methods
export const sendCLIInput = (command: string): boolean => {
  return wsClient.send({
    type: 'cli:input',
    payload: { command },
  });
};

export const startCLI = (options?: { model?: string; apiKey?: string }): boolean => {
  return wsClient.send({
    type: 'cli:start',
    payload: options,
  });
};

export const stopCLI = (): boolean => {
  return wsClient.send({
    type: 'cli:stop',
  });
};

export const sendToolResponse = (
  toolName: string,
  approved: boolean,
  result?: unknown
): boolean => {
  return wsClient.send({
    type: 'tool:response',
    payload: { toolName, approved, result },
  });
};

export const readFile = (path: string): boolean => {
  return wsClient.send({
    type: 'file:read',
    payload: { path },
  });
};

export const writeFile = (path: string, content: string): boolean => {
  return wsClient.send({
    type: 'file:write',
    payload: { path, content },
  });
};

export const listDirectory = (path: string = '.'): boolean => {
  return wsClient.send({
    type: 'directory:list',
    payload: { path },
  });
};

export const getSettings = (): boolean => {
  return wsClient.send({
    type: 'settings:get',
  });
};

export const updateSettings = (settings: Record<string, unknown>): boolean => {
  return wsClient.send({
    type: 'settings:update',
    payload: settings,
  });
};

export const switchProject = (path: string): boolean => {
  return wsClient.send({
    type: 'project:switch',
    payload: { path },
  });
};

export const executeTerminalCommand = (command: string): boolean => {
  return wsClient.send({
    type: 'terminal:input',
    payload: { command },
  });
};
