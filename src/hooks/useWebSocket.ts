/**
 * useWebSocket - React hook for WebSocket connection management
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { wsClient } from '../lib/ws-client';
import type { WSMessage } from '../lib/ws-client';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onMessage?: (message: WSMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  sessionId: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  send: (message: WSMessage) => boolean;
  subscribe: (type: string, handler: (message: WSMessage) => void) => () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { autoConnect = true, onMessage, onConnect, onDisconnect } = options;
  const [isConnected, setIsConnected] = useState(wsClient.getConnectionStatus());
  const [sessionId, setSessionId] = useState<string | null>(wsClient.getSessionId());
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    try {
      await wsClient.connect();
      setIsConnected(true);
      setSessionId(wsClient.getSessionId());
      onConnect?.();
    } catch (error) {
      console.error('Failed to connect:', error);
      setIsConnected(false);
    }
  }, [onConnect]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    wsClient.disconnect();
    setIsConnected(false);
    setSessionId(null);
    onDisconnect?.();
  }, [onDisconnect]);

  // Send a message
  const send = useCallback((message: WSMessage) => {
    return wsClient.send(message);
  }, []);

  // Subscribe to a message type
  const subscribe = useCallback((type: string, handler: (message: WSMessage) => void) => {
    return wsClient.on(type, handler);
  }, []);

  // Auto-connect on mount
   
  useEffect(() => {
    if (autoConnect && !isConnected) {
      connect();
    }

    return () => {
      // Don't disconnect on unmount, keep connection alive
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]);

  // Global message handler
  useEffect(() => {
    if (onMessage) {
      unsubscribeRef.current = wsClient.onAny(onMessage);
    }

    return () => {
      unsubscribeRef.current?.();
    };
  }, [onMessage]);

  // Listen for connection status changes
  useEffect(() => {
    const unsubscribeConnection = wsClient.on('connection:status', (message) => {
      const payload = message.payload as { connected: boolean; sessionId?: string };
      setIsConnected(payload.connected);
      if (payload.sessionId) {
        setSessionId(payload.sessionId);
      }
    });

    return () => {
      unsubscribeConnection();
    };
  }, []);

  return {
    isConnected,
    sessionId,
    connect,
    disconnect,
    send,
    subscribe,
  };
}
