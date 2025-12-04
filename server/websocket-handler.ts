/**
 * WebSocket Handler - Manages WebSocket connections and message routing
 * 
 * Provides real-time bidirectional communication between clients and server
 */

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { v4 as uuidv4 } from 'uuid';
import type { 
  WSMessage, 
  ConnectionStatus, 
  Heartbeat,
  ErrorResponse,
  Session 
} from './types.js';
import { processManager } from './process-manager.js';
import { fileSystemAPI } from './file-system-api.js';
import { settingsManager } from './settings-manager.js';
import { mcpServerManager } from './mcp-server-manager.js';
import { skillsManager } from './skills-manager.js';

interface ConnectedClient {
  ws: WebSocket;
  sessionId: string;
  userId?: string;
  workingDirectory: string;
  lastActivity: Date;
  isAlive: boolean;
}

export class WebSocketHandler {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ConnectedClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CLIENT_TIMEOUT = 60000; // 60 seconds

  /**
   * Initialize WebSocket server
   */
  initialize(port: number): WebSocketServer {
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });

    // Start heartbeat
    this.startHeartbeat();

    console.log(`WebSocket server started on port ${port}`);
    return this.wss;
  }

  /**
   * Attach to existing HTTP server
   */
  attachToServer(server: import('http').Server): WebSocketServer {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });

    // Start heartbeat
    this.startHeartbeat();

    console.log('WebSocket server attached to HTTP server');
    return this.wss;
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, _req: IncomingMessage): void {
    const sessionId = uuidv4();
    const workingDirectory = process.cwd();

    const client: ConnectedClient = {
      ws,
      sessionId,
      workingDirectory,
      lastActivity: new Date(),
      isAlive: true,
    };

    this.clients.set(sessionId, client);

    console.log(`New WebSocket connection: ${sessionId}`);

    // Send connection status
    this.sendToClient(sessionId, {
      type: 'connection:status',
      payload: {
        connected: true,
        sessionId,
        workingDirectory,
      },
    } as ConnectionStatus);

    // Set up message handler
    ws.on('message', (data) => {
      this.handleMessage(sessionId, data);
    });

    // Handle pong responses
    ws.on('pong', () => {
      const c = this.clients.get(sessionId);
      if (c) {
        c.isAlive = true;
        c.lastActivity = new Date();
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      this.handleDisconnect(sessionId);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for session ${sessionId}:`, error);
      this.handleDisconnect(sessionId);
    });

    // Set up process manager event listeners for this session
    this.setupProcessListeners(sessionId);
  }

  /**
   * Set up listeners for CLI process events
   */
  private setupProcessListeners(sessionId: string): void {
    processManager.on('output', (sid: string, data: string) => {
      if (sid === sessionId) {
        this.sendToClient(sessionId, {
          type: 'cli:output',
          payload: { content: data },
        });
      }
    });

    processManager.on('error', (sid: string, error: string) => {
      if (sid === sessionId) {
        this.sendToClient(sessionId, {
          type: 'cli:output',
          payload: { content: error, isError: true },
        });
      }
    });

    processManager.on('exit', (sid: string, code: number | null) => {
      if (sid === sessionId) {
        this.sendToClient(sessionId, {
          type: 'cli:output',
          payload: { 
            content: `\n[Process exited with code ${code}]\n`,
            isComplete: true 
          },
        });
      }
    });

    processManager.on('toolRequest', (sid: string, tool) => {
      if (sid === sessionId) {
        this.sendToClient(sessionId, {
          type: 'tool:request',
          payload: tool,
        });
      }
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(sessionId: string, data: import('ws').RawData): Promise<void> {
    const client = this.clients.get(sessionId);
    if (!client) return;

    client.lastActivity = new Date();

    let message: WSMessage;
    try {
      message = JSON.parse(data.toString());
    } catch {
      this.sendError(sessionId, 'INVALID_MESSAGE', 'Invalid JSON message');
      return;
    }

    try {
      await this.routeMessage(sessionId, message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.sendError(sessionId, 'HANDLER_ERROR', errorMessage);
    }
  }

  /**
   * Route message to appropriate handler
   */
  private async routeMessage(sessionId: string, message: WSMessage): Promise<void> {
    const client = this.clients.get(sessionId);
    if (!client) return;

    switch (message.type) {
      // CLI Operations
      case 'cli:start':
        await this.handleCLIStart(sessionId, message);
        break;
      case 'cli:input':
        await this.handleCLIInput(sessionId, message);
        break;
      case 'cli:stop':
        await this.handleCLIStop(sessionId);
        break;

      // Tool Operations
      case 'tool:response':
        await this.handleToolResponse(sessionId, message);
        break;

      // File Operations
      case 'file:read':
        await this.handleFileRead(sessionId, message);
        break;
      case 'file:write':
        await this.handleFileWrite(sessionId, message);
        break;
      case 'file:delete':
        await this.handleFileDelete(sessionId, message);
        break;
      case 'directory:list':
        await this.handleDirectoryList(sessionId, message);
        break;

      // Settings Operations
      case 'settings:get':
        await this.handleSettingsGet(sessionId);
        break;
      case 'settings:update':
        await this.handleSettingsUpdate(sessionId, message);
        break;

      // MCP Operations
      case 'mcp:list':
        await this.handleMCPList(sessionId);
        break;
      case 'mcp:add':
        await this.handleMCPAdd(sessionId, message);
        break;
      case 'mcp:remove':
        await this.handleMCPRemove(sessionId, message);
        break;
      case 'mcp:tools':
        await this.handleMCPTools(sessionId);
        break;

      // Skills Operations
      case 'skill:list':
        await this.handleSkillList(sessionId);
        break;
      case 'skill:create':
        await this.handleSkillCreate(sessionId, message);
        break;
      case 'skill:delete':
        await this.handleSkillDelete(sessionId, message);
        break;

      // Terminal Operations
      case 'terminal:input':
        await this.handleTerminalInput(sessionId, message);
        break;

      // Project Operations
      case 'project:switch':
        await this.handleProjectSwitch(sessionId, message);
        break;

      // Heartbeat
      case 'heartbeat':
        this.handleHeartbeat(sessionId);
        break;

      default:
        this.sendError(sessionId, 'UNKNOWN_MESSAGE', `Unknown message type: ${message.type}`);
    }
  }

  // CLI Handlers
  private async handleCLIStart(sessionId: string, message: WSMessage): Promise<void> {
    const client = this.clients.get(sessionId);
    if (!client) return;

    const payload = message.payload as { model?: string; apiKey?: string } | undefined;
    
    try {
      const processInfo = await processManager.spawn(
        sessionId,
        client.workingDirectory,
        {
          model: payload?.model,
          apiKey: payload?.apiKey,
        }
      );

      this.sendToClient(sessionId, {
        type: 'cli:started',
        payload: processInfo,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start CLI';
      this.sendError(sessionId, 'CLI_START_ERROR', errorMessage);
    }
  }

  private async handleCLIInput(sessionId: string, message: WSMessage): Promise<void> {
    const payload = message.payload as { command: string } | undefined;
    if (!payload?.command) {
      this.sendError(sessionId, 'INVALID_PAYLOAD', 'Missing command');
      return;
    }

    const success = await processManager.sendInput(sessionId, payload.command);
    if (!success) {
      this.sendError(sessionId, 'CLI_NOT_RUNNING', 'CLI process is not running');
    }
  }

  private async handleCLIStop(sessionId: string): Promise<void> {
    await processManager.kill(sessionId);
    this.sendToClient(sessionId, {
      type: 'cli:stopped',
      payload: { success: true },
    });
  }

  // Tool Handler
  private async handleToolResponse(sessionId: string, message: WSMessage): Promise<void> {
    const payload = message.payload as { 
      toolName: string; 
      approved: boolean; 
      result?: unknown 
    } | undefined;
    
    if (!payload) {
      this.sendError(sessionId, 'INVALID_PAYLOAD', 'Missing tool response payload');
      return;
    }

    await processManager.sendToolResponse(
      sessionId,
      payload.toolName,
      payload.approved,
      payload.result
    );
  }

  // File Handlers
  private async handleFileRead(sessionId: string, message: WSMessage): Promise<void> {
    const client = this.clients.get(sessionId);
    if (!client) return;

    const payload = message.payload as { path: string } | undefined;
    if (!payload?.path) {
      this.sendError(sessionId, 'INVALID_PAYLOAD', 'Missing file path');
      return;
    }

    try {
      const content = await fileSystemAPI.readFile(payload.path, client.workingDirectory);
      this.sendToClient(sessionId, {
        type: 'file:read:response',
        payload: { path: payload.path, content },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to read file';
      this.sendError(sessionId, 'FILE_READ_ERROR', errorMessage);
    }
  }

  private async handleFileWrite(sessionId: string, message: WSMessage): Promise<void> {
    const client = this.clients.get(sessionId);
    if (!client) return;

    const payload = message.payload as { path: string; content: string } | undefined;
    if (!payload?.path || payload.content === undefined) {
      this.sendError(sessionId, 'INVALID_PAYLOAD', 'Missing path or content');
      return;
    }

    try {
      await fileSystemAPI.writeFile(payload.path, payload.content, client.workingDirectory);
      this.sendToClient(sessionId, {
        type: 'file:write:response',
        payload: { path: payload.path, success: true },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to write file';
      this.sendError(sessionId, 'FILE_WRITE_ERROR', errorMessage);
    }
  }

  private async handleFileDelete(sessionId: string, message: WSMessage): Promise<void> {
    const client = this.clients.get(sessionId);
    if (!client) return;

    const payload = message.payload as { path: string } | undefined;
    if (!payload?.path) {
      this.sendError(sessionId, 'INVALID_PAYLOAD', 'Missing file path');
      return;
    }

    try {
      await fileSystemAPI.deleteFile(payload.path, client.workingDirectory);
      this.sendToClient(sessionId, {
        type: 'file:delete:response',
        payload: { path: payload.path, success: true },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete file';
      this.sendError(sessionId, 'FILE_DELETE_ERROR', errorMessage);
    }
  }

  private async handleDirectoryList(sessionId: string, message: WSMessage): Promise<void> {
    const client = this.clients.get(sessionId);
    if (!client) return;

    const payload = message.payload as { path: string } | undefined;
    const targetPath = payload?.path || '.';

    try {
      const entries = await fileSystemAPI.listDirectory(targetPath, client.workingDirectory);
      this.sendToClient(sessionId, {
        type: 'directory:list:response',
        payload: { path: targetPath, entries },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to list directory';
      this.sendError(sessionId, 'DIRECTORY_LIST_ERROR', errorMessage);
    }
  }

  // Settings Handlers
  private async handleSettingsGet(sessionId: string): Promise<void> {
    try {
      const settings = await settingsManager.getSettings();
      this.sendToClient(sessionId, {
        type: 'settings:get:response',
        payload: settings,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get settings';
      this.sendError(sessionId, 'SETTINGS_ERROR', errorMessage);
    }
  }

  private async handleSettingsUpdate(sessionId: string, message: WSMessage): Promise<void> {
    const payload = message.payload as Record<string, unknown> | undefined;
    if (!payload) {
      this.sendError(sessionId, 'INVALID_PAYLOAD', 'Missing settings payload');
      return;
    }

    try {
      await settingsManager.updateSettings(payload);
      this.sendToClient(sessionId, {
        type: 'settings:update:response',
        payload: { success: true },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update settings';
      this.sendError(sessionId, 'SETTINGS_ERROR', errorMessage);
    }
  }

  // MCP Handlers
  private async handleMCPList(sessionId: string): Promise<void> {
    try {
      const servers = await mcpServerManager.listServers();
      this.sendToClient(sessionId, {
        type: 'mcp:list:response',
        payload: { servers },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to list MCP servers';
      this.sendError(sessionId, 'MCP_ERROR', errorMessage);
    }
  }

  private async handleMCPAdd(sessionId: string, message: WSMessage): Promise<void> {
    const payload = message.payload as { 
      name: string; 
      config: Record<string, unknown> 
    } | undefined;
    
    if (!payload?.name || !payload.config) {
      this.sendError(sessionId, 'INVALID_PAYLOAD', 'Missing name or config');
      return;
    }

    try {
      await mcpServerManager.addServer(payload.name, payload.config);
      this.sendToClient(sessionId, {
        type: 'mcp:add:response',
        payload: { success: true, name: payload.name },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add MCP server';
      this.sendError(sessionId, 'MCP_ERROR', errorMessage);
    }
  }

  private async handleMCPRemove(sessionId: string, message: WSMessage): Promise<void> {
    const payload = message.payload as { name: string } | undefined;
    if (!payload?.name) {
      this.sendError(sessionId, 'INVALID_PAYLOAD', 'Missing server name');
      return;
    }

    try {
      await mcpServerManager.removeServer(payload.name);
      this.sendToClient(sessionId, {
        type: 'mcp:remove:response',
        payload: { success: true, name: payload.name },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove MCP server';
      this.sendError(sessionId, 'MCP_ERROR', errorMessage);
    }
  }

  private async handleMCPTools(sessionId: string): Promise<void> {
    try {
      const tools = await mcpServerManager.listTools();
      this.sendToClient(sessionId, {
        type: 'mcp:tools:response',
        payload: { tools },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to list MCP tools';
      this.sendError(sessionId, 'MCP_ERROR', errorMessage);
    }
  }

  // Skills Handlers
  private async handleSkillList(sessionId: string): Promise<void> {
    try {
      const skills = await skillsManager.listSkills();
      this.sendToClient(sessionId, {
        type: 'skill:list:response',
        payload: { skills },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to list skills';
      this.sendError(sessionId, 'SKILL_ERROR', errorMessage);
    }
  }

  private async handleSkillCreate(sessionId: string, message: WSMessage): Promise<void> {
    const payload = message.payload as {
      name: string;
      description: string;
      instructions: string;
      files: Array<{ name: string; content: string }>;
    } | undefined;

    if (!payload?.name || !payload.instructions) {
      this.sendError(sessionId, 'INVALID_PAYLOAD', 'Missing skill data');
      return;
    }

    try {
      await skillsManager.createSkill(payload);
      this.sendToClient(sessionId, {
        type: 'skill:create:response',
        payload: { success: true, name: payload.name },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create skill';
      this.sendError(sessionId, 'SKILL_ERROR', errorMessage);
    }
  }

  private async handleSkillDelete(sessionId: string, message: WSMessage): Promise<void> {
    const payload = message.payload as { name: string } | undefined;
    if (!payload?.name) {
      this.sendError(sessionId, 'INVALID_PAYLOAD', 'Missing skill name');
      return;
    }

    try {
      await skillsManager.deleteSkill(payload.name);
      this.sendToClient(sessionId, {
        type: 'skill:delete:response',
        payload: { success: true, name: payload.name },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete skill';
      this.sendError(sessionId, 'SKILL_ERROR', errorMessage);
    }
  }

  // Terminal Handler
  private async handleTerminalInput(sessionId: string, message: WSMessage): Promise<void> {
    const client = this.clients.get(sessionId);
    if (!client) return;

    const payload = message.payload as { command: string } | undefined;
    if (!payload?.command) {
      this.sendError(sessionId, 'INVALID_PAYLOAD', 'Missing command');
      return;
    }

    try {
      const { stdout, stderr } = await fileSystemAPI.executeCommand(
        payload.command,
        client.workingDirectory
      );

      this.sendToClient(sessionId, {
        type: 'terminal:output',
        payload: { content: stdout },
      });

      if (stderr) {
        this.sendToClient(sessionId, {
          type: 'terminal:output',
          payload: { content: stderr, isError: true },
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Command failed';
      this.sendToClient(sessionId, {
        type: 'terminal:output',
        payload: { content: errorMessage, isError: true },
      });
    }
  }

  // Project Handler
  private async handleProjectSwitch(sessionId: string, message: WSMessage): Promise<void> {
    const payload = message.payload as { path: string } | undefined;
    if (!payload?.path) {
      this.sendError(sessionId, 'INVALID_PAYLOAD', 'Missing project path');
      return;
    }

    const client = this.clients.get(sessionId);
    if (!client) return;

    try {
      // Validate the path exists and is a directory
      const isValid = await fileSystemAPI.isDirectory(payload.path);
      if (!isValid) {
        this.sendError(sessionId, 'INVALID_PATH', 'Path is not a valid directory');
        return;
      }

      // Kill existing CLI process
      await processManager.kill(sessionId);

      // Update working directory
      client.workingDirectory = payload.path;

      this.sendToClient(sessionId, {
        type: 'project:switch:response',
        payload: { 
          success: true, 
          path: payload.path,
          workingDirectory: payload.path 
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch project';
      this.sendError(sessionId, 'PROJECT_ERROR', errorMessage);
    }
  }

  // Heartbeat Handler
  private handleHeartbeat(sessionId: string): void {
    this.sendToClient(sessionId, {
      type: 'heartbeat',
      payload: { timestamp: Date.now() },
    } as Heartbeat);
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, sessionId) => {
        if (!client.isAlive) {
          console.log(`Client ${sessionId} timed out, disconnecting`);
          this.handleDisconnect(sessionId);
          return;
        }

        client.isAlive = false;
        client.ws.ping();
      });
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(sessionId: string): void {
    console.log(`Client disconnected: ${sessionId}`);

    // Kill CLI process
    processManager.kill(sessionId);

    // Remove client
    const client = this.clients.get(sessionId);
    if (client) {
      try {
        client.ws.terminate();
      } catch {
        // Ignore errors during cleanup
      }
    }
    this.clients.delete(sessionId);
  }

  /**
   * Send message to a specific client
   */
  sendToClient(sessionId: string, message: WSMessage): boolean {
    const client = this.clients.get(sessionId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Broadcast message to all clients
   */
  broadcast(message: WSMessage): void {
    this.clients.forEach((client, sessionId) => {
      this.sendToClient(sessionId, message);
    });
  }

  /**
   * Send error to client
   */
  sendError(sessionId: string, code: string, message: string): void {
    this.sendToClient(sessionId, {
      type: 'error',
      payload: { code, message },
    } as ErrorResponse);
  }

  /**
   * Get session info
   */
  getSession(sessionId: string): Session | null {
    const client = this.clients.get(sessionId);
    if (!client) return null;

    return {
      id: sessionId,
      userId: client.userId || '',
      createdAt: client.lastActivity,
      lastActivity: client.lastActivity,
      workingDirectory: client.workingDirectory,
      cliProcess: processManager.getProcessInfo(sessionId) || undefined,
    };
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): Session[] {
    return Array.from(this.clients.entries()).map(([sessionId, client]) => ({
      id: sessionId,
      userId: client.userId || '',
      createdAt: client.lastActivity,
      lastActivity: client.lastActivity,
      workingDirectory: client.workingDirectory,
      cliProcess: processManager.getProcessInfo(sessionId) || undefined,
    }));
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down WebSocket server...');

    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Kill all CLI processes
    await processManager.killAll();

    // Close all connections
    this.clients.forEach((client, sessionId) => {
      this.sendToClient(sessionId, {
        type: 'connection:status',
        payload: { connected: false },
      });
      client.ws.close();
    });

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }
  }
}

// Export singleton instance
export const wsHandler = new WebSocketHandler();
