/**
 * Process Manager - Manages Gemini CLI child processes
 * 
 * Handles spawning, lifecycle, and communication with Gemini CLI processes
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import type { CLIProcessInfo } from './types.js';

export interface ProcessManagerEvents {
  output: (sessionId: string, data: string) => void;
  error: (sessionId: string, error: string) => void;
  exit: (sessionId: string, code: number | null) => void;
  toolRequest: (sessionId: string, tool: ToolRequestData) => void;
}

export interface ToolRequestData {
  toolName: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface ManagedProcess {
  process: ChildProcess;
  sessionId: string;
  startedAt: Date;
  model?: string;
  workingDirectory: string;
  outputBuffer: string;
  isWaitingForInput: boolean;
}

export class ProcessManager extends EventEmitter {
  private processes: Map<string, ManagedProcess> = new Map();
  private defaultModel: string = 'gemini-2.5-flash';
  private geminiCommand: string = 'gemini';

  constructor() {
    super();
  }

  /**
   * Spawn a new Gemini CLI process for a session
   */
  async spawn(
    sessionId: string,
    workingDirectory: string,
    options: {
      model?: string;
      apiKey?: string;
      args?: string[];
    } = {}
  ): Promise<CLIProcessInfo> {
    // Kill existing process for this session if any
    await this.kill(sessionId);

    const model = options.model || this.defaultModel;
    const args = options.args || [];

    // Build environment
    const env: NodeJS.ProcessEnv = {
      ...process.env,
    };

    if (options.apiKey) {
      env.GEMINI_API_KEY = options.apiKey;
    }

    // Spawn the Gemini CLI
    const cliProcess = spawn(this.geminiCommand, args, {
      cwd: workingDirectory,
      env,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const managedProcess: ManagedProcess = {
      process: cliProcess,
      sessionId,
      startedAt: new Date(),
      model,
      workingDirectory,
      outputBuffer: '',
      isWaitingForInput: false,
    };

    this.processes.set(sessionId, managedProcess);

    // Set up event handlers
    this.setupProcessHandlers(managedProcess);

    return {
      pid: cliProcess.pid || 0,
      startedAt: managedProcess.startedAt,
      model,
    };
  }

  private setupProcessHandlers(managed: ManagedProcess): void {
    const { process, sessionId } = managed;

    // Handle stdout
    process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      managed.outputBuffer += output;
      this.emit('output', sessionId, output);

      // Parse for tool requests (simplified detection)
      this.detectToolRequest(sessionId, output);
    });

    // Handle stderr
    process.stderr?.on('data', (data: Buffer) => {
      const error = data.toString();
      this.emit('error', sessionId, error);
    });

    // Handle process exit
    process.on('exit', (code) => {
      this.emit('exit', sessionId, code);
      this.processes.delete(sessionId);
    });

    // Handle process error
    process.on('error', (err) => {
      this.emit('error', sessionId, `Process error: ${err.message}`);
    });
  }

  /**
   * Detect tool requests in CLI output
   * This is a simplified parser - actual implementation would parse Gemini's output format
   */
  private detectToolRequest(sessionId: string, output: string): void {
    // Simple pattern matching for tool requests
    // Real implementation would parse structured output from Gemini CLI
    const toolRequestPattern = /\[TOOL_REQUEST\]\s*(\w+)\s*\n([\s\S]*?)\[\/TOOL_REQUEST\]/g;
    let match;

    while ((match = toolRequestPattern.exec(output)) !== null) {
      const toolName = match[1];
      const paramsStr = match[2];

      try {
        const parameters = JSON.parse(paramsStr);
        this.emit('toolRequest', sessionId, {
          toolName,
          description: `Execute ${toolName}`,
          parameters,
        });
      } catch {
        // Invalid JSON, skip
      }
    }
  }

  /**
   * Send input to a running CLI process
   */
  async sendInput(sessionId: string, input: string): Promise<boolean> {
    const managed = this.processes.get(sessionId);
    if (!managed || !managed.process.stdin) {
      return false;
    }

    return new Promise((resolve) => {
      managed.process.stdin?.write(input + '\n', (err) => {
        resolve(!err);
      });
    });
  }

  /**
   * Send a tool response to the CLI
   */
  async sendToolResponse(
    sessionId: string,
    toolName: string,
    approved: boolean,
    result?: unknown
  ): Promise<boolean> {
    const managed = this.processes.get(sessionId);
    if (!managed || !managed.process.stdin) {
      return false;
    }

    // Format response for Gemini CLI
    const response = approved
      ? result !== undefined
        ? JSON.stringify({ approved: true, result })
        : 'yes'
      : 'no';

    return this.sendInput(sessionId, response);
  }

  /**
   * Kill a running CLI process
   */
  async kill(sessionId: string): Promise<boolean> {
    const managed = this.processes.get(sessionId);
    if (!managed) {
      return false;
    }

    return new Promise((resolve) => {
      managed.process.on('exit', () => {
        this.processes.delete(sessionId);
        resolve(true);
      });

      // Try graceful shutdown first
      managed.process.stdin?.write('/quit\n');
      
      // Force kill after timeout
      setTimeout(() => {
        if (this.processes.has(sessionId)) {
          managed.process.kill('SIGTERM');
        }
      }, 2000);
    });
  }

  /**
   * Get process info for a session
   */
  getProcessInfo(sessionId: string): CLIProcessInfo | null {
    const managed = this.processes.get(sessionId);
    if (!managed) {
      return null;
    }

    return {
      pid: managed.process.pid || 0,
      startedAt: managed.startedAt,
      model: managed.model,
    };
  }

  /**
   * Check if a session has a running process
   */
  isRunning(sessionId: string): boolean {
    const managed = this.processes.get(sessionId);
    return managed !== undefined && !managed.process.killed;
  }

  /**
   * Get output buffer for a session
   */
  getOutputBuffer(sessionId: string): string {
    const managed = this.processes.get(sessionId);
    return managed?.outputBuffer || '';
  }

  /**
   * Clear output buffer for a session
   */
  clearOutputBuffer(sessionId: string): void {
    const managed = this.processes.get(sessionId);
    if (managed) {
      managed.outputBuffer = '';
    }
  }

  /**
   * Get all active session IDs
   */
  getActiveSessions(): string[] {
    return Array.from(this.processes.keys());
  }

  /**
   * Kill all processes (for shutdown)
   */
  async killAll(): Promise<void> {
    const killPromises = Array.from(this.processes.keys()).map((sessionId) =>
      this.kill(sessionId)
    );
    await Promise.all(killPromises);
  }

  /**
   * Restart a CLI process
   */
  async restart(sessionId: string): Promise<CLIProcessInfo | null> {
    const managed = this.processes.get(sessionId);
    if (!managed) {
      return null;
    }

    const { workingDirectory, model } = managed;
    await this.kill(sessionId);

    return this.spawn(sessionId, workingDirectory, { model });
  }

  /**
   * Change the model for a session (requires restart)
   */
  async changeModel(sessionId: string, model: string): Promise<CLIProcessInfo | null> {
    const managed = this.processes.get(sessionId);
    if (!managed) {
      return null;
    }

    const { workingDirectory } = managed;
    await this.kill(sessionId);

    return this.spawn(sessionId, workingDirectory, { model });
  }

  /**
   * Set the default Gemini CLI command
   */
  setGeminiCommand(command: string): void {
    this.geminiCommand = command;
  }

  /**
   * Set the default model
   */
  setDefaultModel(model: string): void {
    this.defaultModel = model;
  }
}

// Export singleton instance
export const processManager = new ProcessManager();
