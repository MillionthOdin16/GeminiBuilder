/**
 * MCP Server Manager - Manages Model Context Protocol servers
 * 
 * Handles discovery, configuration, and communication with MCP servers
 */

import { spawn, ChildProcess } from 'child_process';
import { settingsManager } from './settings-manager.js';
import type { MCPServerConfig, MCPTool } from './types.js';

interface MCPServerStatus {
  name: string;
  config: MCPServerConfig;
  status: 'connected' | 'disconnected' | 'error';
  error?: string;
  pid?: number;
  lastCheck?: Date;
}

interface MCPServerProcess {
  process: ChildProcess;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  tools: MCPTool[];
}

export class MCPServerManager {
  private processes: Map<string, MCPServerProcess> = new Map();
  private statusCache: Map<string, MCPServerStatus> = new Map();
  private toolsCache: Map<string, MCPTool[]> = new Map();

  /**
   * List all configured MCP servers with their status
   */
  async listServers(): Promise<MCPServerStatus[]> {
    const servers = await settingsManager.getMCPServers();
    const statuses: MCPServerStatus[] = [];

    for (const [name, config] of Object.entries(servers)) {
      const status = await this.getServerStatus(name, config);
      statuses.push(status);
    }

    return statuses;
  }

  /**
   * Get status of a specific server
   */
  async getServerStatus(name: string, config: MCPServerConfig): Promise<MCPServerStatus> {
    const cached = this.statusCache.get(name);
    if (cached && cached.lastCheck && (Date.now() - cached.lastCheck.getTime()) < 5000) {
      return cached;
    }

    const status: MCPServerStatus = {
      name,
      config,
      status: 'disconnected',
      lastCheck: new Date(),
    };

    const proc = this.processes.get(name);
    if (proc) {
      if (proc.status === 'running') {
        status.status = 'connected';
        status.pid = proc.process.pid;
      } else if (proc.status === 'error') {
        status.status = 'error';
      }
    }

    this.statusCache.set(name, status);
    return status;
  }

  /**
   * Add a new MCP server configuration
   */
  async addServer(name: string, config: Record<string, unknown>): Promise<void> {
    const mcpConfig: MCPServerConfig = {
      command: config.command as string,
      args: config.args as string[] | undefined,
      env: config.env as Record<string, string> | undefined,
      url: config.url as string | undefined,
      transport: config.transport as 'stdio' | 'sse' | 'http' | undefined,
    };

    await settingsManager.addMCPServer(name, mcpConfig);
    
    // Clear cache
    this.statusCache.delete(name);
    this.toolsCache.delete(name);
  }

  /**
   * Remove an MCP server configuration
   */
  async removeServer(name: string): Promise<void> {
    // Stop the server if running
    await this.stopServer(name);
    
    // Remove from settings
    await settingsManager.removeMCPServer(name);
    
    // Clear cache
    this.statusCache.delete(name);
    this.toolsCache.delete(name);
  }

  /**
   * Update an MCP server configuration
   */
  async updateServer(name: string, config: Partial<MCPServerConfig>): Promise<void> {
    // Stop and restart if running
    const wasRunning = this.processes.has(name);
    if (wasRunning) {
      await this.stopServer(name);
    }

    await settingsManager.updateMCPServer(name, config);

    if (wasRunning) {
      await this.startServer(name);
    }

    // Clear cache
    this.statusCache.delete(name);
    this.toolsCache.delete(name);
  }

  /**
   * Start an MCP server
   */
  async startServer(name: string): Promise<boolean> {
    const servers = await settingsManager.getMCPServers();
    const config = servers[name];

    if (!config) {
      throw new Error(`MCP server "${name}" not found`);
    }

    // Kill existing process if any
    await this.stopServer(name);

    if (!config.command) {
      throw new Error(`MCP server "${name}" has no command configured`);
    }

    try {
      const proc = spawn(config.command, config.args || [], {
        env: {
          ...process.env,
          ...config.env,
        },
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      const mcpProcess: MCPServerProcess = {
        process: proc,
        name,
        status: 'starting',
        tools: [],
      };

      this.processes.set(name, mcpProcess);

      // Handle startup
      proc.on('spawn', () => {
        mcpProcess.status = 'running';
        this.statusCache.set(name, {
          name,
          config,
          status: 'connected',
          pid: proc.pid,
          lastCheck: new Date(),
        });
      });

      // Handle exit
      proc.on('exit', (code) => {
        mcpProcess.status = 'stopped';
        this.processes.delete(name);
        this.statusCache.set(name, {
          name,
          config,
          status: 'disconnected',
          lastCheck: new Date(),
        });
        console.log(`MCP server "${name}" exited with code ${code}`);
      });

      // Handle errors
      proc.on('error', (err) => {
        mcpProcess.status = 'error';
        this.statusCache.set(name, {
          name,
          config,
          status: 'error',
          error: err.message,
          lastCheck: new Date(),
        });
        console.error(`MCP server "${name}" error:`, err);
      });

      // Capture output for debugging
      proc.stdout?.on('data', (data) => {
        // Parse MCP protocol messages
        this.handleMCPMessage(name, data.toString());
      });

      proc.stderr?.on('data', (data) => {
        console.error(`MCP server "${name}" stderr:`, data.toString());
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.statusCache.set(name, {
        name,
        config,
        status: 'error',
        error: errorMessage,
        lastCheck: new Date(),
      });
      return false;
    }
  }

  /**
   * Stop an MCP server
   */
  async stopServer(name: string): Promise<void> {
    const proc = this.processes.get(name);
    if (!proc) return;

    return new Promise((resolve) => {
      proc.process.on('exit', () => {
        this.processes.delete(name);
        resolve();
      });

      proc.process.kill('SIGTERM');

      // Force kill after timeout
      setTimeout(() => {
        if (this.processes.has(name)) {
          proc.process.kill('SIGKILL');
          this.processes.delete(name);
        }
        resolve();
      }, 5000);
    });
  }

  /**
   * Restart an MCP server
   */
  async restartServer(name: string): Promise<boolean> {
    await this.stopServer(name);
    return this.startServer(name);
  }

  /**
   * Stop all MCP servers
   */
  async stopAllServers(): Promise<void> {
    const promises = Array.from(this.processes.keys()).map((name) =>
      this.stopServer(name)
    );
    await Promise.all(promises);
  }

  /**
   * Start all configured MCP servers
   */
  async startAllServers(): Promise<void> {
    const servers = await settingsManager.getMCPServers();
    for (const name of Object.keys(servers)) {
      await this.startServer(name);
    }
  }

  /**
   * Handle MCP protocol messages
   */
  private handleMCPMessage(serverName: string, message: string): void {
    try {
      // Try to parse as JSON-RPC
      const lines = message.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          
          // Handle tool list response
          if (msg.result?.tools) {
            const tools: MCPTool[] = msg.result.tools.map((t: Record<string, unknown>) => ({
              name: t.name as string,
              description: t.description as string || '',
              parameters: t.inputSchema as Record<string, unknown> || {},
              server: serverName,
            }));
            
            this.toolsCache.set(serverName, tools);
            
            const proc = this.processes.get(serverName);
            if (proc) {
              proc.tools = tools;
            }
          }
        } catch {
          // Not valid JSON, might be partial message
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  /**
   * Send a message to an MCP server
   */
  async sendMessage(serverName: string, message: Record<string, unknown>): Promise<void> {
    const proc = this.processes.get(serverName);
    if (!proc || proc.status !== 'running') {
      throw new Error(`MCP server "${serverName}" is not running`);
    }

    const json = JSON.stringify(message);
    proc.process.stdin?.write(json + '\n');
  }

  /**
   * Request tool list from an MCP server
   */
  async requestTools(serverName: string): Promise<void> {
    await this.sendMessage(serverName, {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/list',
    });
  }

  /**
   * List all available tools across all servers
   */
  async listTools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = [];

    for (const [serverName, proc] of this.processes) {
      if (proc.status === 'running') {
        // Try to get cached tools
        const cached = this.toolsCache.get(serverName);
        if (cached) {
          allTools.push(...cached);
        } else {
          // Request tools from server
          await this.requestTools(serverName);
        }
      }
    }

    return allTools;
  }

  /**
   * Get tools for a specific server
   */
  getServerTools(serverName: string): MCPTool[] {
    return this.toolsCache.get(serverName) || [];
  }

  /**
   * Test connection to an MCP server
   */
  async testConnection(name: string): Promise<{
    success: boolean;
    message: string;
    latency?: number;
  }> {
    const servers = await settingsManager.getMCPServers();
    const config = servers[name];

    if (!config) {
      return { success: false, message: 'Server not found' };
    }

    const start = Date.now();

    try {
      // For HTTP/SSE servers, try a health check
      if (config.url) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        try {
          const response = await fetch(config.url, {
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (response.ok) {
            return {
              success: true,
              message: 'Connected successfully',
              latency: Date.now() - start,
            };
          } else {
            return {
              success: false,
              message: `HTTP ${response.status}: ${response.statusText}`,
            };
          }
        } catch (error) {
          clearTimeout(timeout);
          throw error;
        }
      }

      // For stdio servers, try to start and immediately check
      const wasRunning = this.processes.has(name);
      
      if (!wasRunning) {
        const started = await this.startServer(name);
        if (!started) {
          return { success: false, message: 'Failed to start server' };
        }
        
        // Give it a moment to start
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const proc = this.processes.get(name);
        if (proc && proc.status === 'running') {
          // Stop if we started it just for testing
          await this.stopServer(name);
          
          return {
            success: true,
            message: 'Server started successfully',
            latency: Date.now() - start,
          };
        } else {
          return { success: false, message: 'Server failed to start' };
        }
      }

      return {
        success: true,
        message: 'Server is running',
        latency: Date.now() - start,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: errorMessage };
    }
  }

  /**
   * Discover MCP servers from common locations
   */
  async discoverServers(): Promise<Array<{ name: string; config: MCPServerConfig }>> {
    const discovered: Array<{ name: string; config: MCPServerConfig }> = [];

    // Common MCP server locations and packages
    const commonServers = [
      {
        name: 'filesystem',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
      },
      {
        name: 'github',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
      },
      {
        name: 'sqlite',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-sqlite'],
      },
    ];

    for (const server of commonServers) {
      discovered.push({
        name: server.name,
        config: {
          command: server.command,
          args: server.args,
          transport: 'stdio',
        },
      });
    }

    return discovered;
  }

  /**
   * Get running server count
   */
  getRunningCount(): number {
    let count = 0;
    for (const proc of this.processes.values()) {
      if (proc.status === 'running') {
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.statusCache.clear();
    this.toolsCache.clear();
  }
}

// Export singleton instance
export const mcpServerManager = new MCPServerManager();
