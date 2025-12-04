/**
 * Server-side type definitions for GeminiBuilder
 */

// WebSocket Message Types
export interface WSMessage {
  type: string;
  payload?: unknown;
  id?: string;
  sessionId?: string;
}

// CLI Messages
export interface CLIInput extends WSMessage {
  type: 'cli:input';
  payload: {
    command: string;
  };
}

export interface CLIOutput extends WSMessage {
  type: 'cli:output';
  payload: {
    content: string;
    isError?: boolean;
    isComplete?: boolean;
  };
}

// Tool Confirmation Messages
export interface ToolRequest extends WSMessage {
  type: 'tool:request';
  payload: {
    toolName: string;
    description: string;
    parameters: Record<string, unknown>;
    preview?: string;
  };
}

export interface ToolResponse extends WSMessage {
  type: 'tool:response';
  payload: {
    approved: boolean;
    alwaysAllow?: boolean;
    toolName: string;
  };
}

export interface ToolResult extends WSMessage {
  type: 'tool:result';
  payload: {
    toolName: string;
    success: boolean;
    result?: unknown;
    error?: string;
  };
}

// File System Messages
export interface FileReadRequest extends WSMessage {
  type: 'file:read';
  payload: {
    path: string;
  };
}

export interface FileReadResponse extends WSMessage {
  type: 'file:read:response';
  payload: {
    path: string;
    content: string;
    encoding?: string;
  };
}

export interface FileWriteRequest extends WSMessage {
  type: 'file:write';
  payload: {
    path: string;
    content: string;
  };
}

export interface FileDeleteRequest extends WSMessage {
  type: 'file:delete';
  payload: {
    path: string;
  };
}

export interface DirectoryListRequest extends WSMessage {
  type: 'directory:list';
  payload: {
    path: string;
  };
}

export interface DirectoryListResponse extends WSMessage {
  type: 'directory:list:response';
  payload: {
    path: string;
    entries: FileEntry[];
  };
}

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  isHidden?: boolean;
}

export interface FileChangeEvent extends WSMessage {
  type: 'file:change';
  payload: {
    path: string;
    changeType: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  };
}

// Settings Messages
export interface SettingsGetRequest extends WSMessage {
  type: 'settings:get';
}

export interface SettingsGetResponse extends WSMessage {
  type: 'settings:get:response';
  payload: GeminiSettings;
}

export interface SettingsUpdateRequest extends WSMessage {
  type: 'settings:update';
  payload: Partial<GeminiSettings>;
}

// Gemini Settings
export interface GeminiSettings {
  theme?: 'system' | 'light' | 'dark' | 'GitHub';
  autoAccept?: boolean;
  model?: string;
  checkpointing?: {
    enabled?: boolean;
  };
  telemetry?: {
    enabled?: boolean;
    target?: 'local' | 'gcp' | string;
  };
  includeDirectories?: string[];
  excludeTools?: string[];
  mcpServers?: Record<string, MCPServerConfig>;
  codeExecution?: {
    enabled?: boolean;
    model?: string;
  };
}

export interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  transport?: 'stdio' | 'sse' | 'http';
}

// MCP Messages
export interface MCPServerListRequest extends WSMessage {
  type: 'mcp:list';
}

export interface MCPServerListResponse extends WSMessage {
  type: 'mcp:list:response';
  payload: {
    servers: Array<{
      name: string;
      config: MCPServerConfig;
      status: 'connected' | 'disconnected' | 'error';
    }>;
  };
}

export interface MCPServerAddRequest extends WSMessage {
  type: 'mcp:add';
  payload: {
    name: string;
    config: MCPServerConfig;
  };
}

export interface MCPServerRemoveRequest extends WSMessage {
  type: 'mcp:remove';
  payload: {
    name: string;
  };
}

export interface MCPToolListRequest extends WSMessage {
  type: 'mcp:tools';
  payload: {
    serverName?: string;
  };
}

export interface MCPToolListResponse extends WSMessage {
  type: 'mcp:tools:response';
  payload: {
    tools: MCPTool[];
  };
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  server: string;
}

// Extension Messages
export interface ExtensionListRequest extends WSMessage {
  type: 'extension:list';
}

export interface ExtensionListResponse extends WSMessage {
  type: 'extension:list:response';
  payload: {
    extensions: ExtensionInfo[];
  };
}

export interface ExtensionInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  url?: string;
  mcpServers?: string[];
}

export interface ExtensionInstallRequest extends WSMessage {
  type: 'extension:install';
  payload: {
    url: string;
  };
}

export interface ExtensionUninstallRequest extends WSMessage {
  type: 'extension:uninstall';
  payload: {
    id: string;
  };
}

// Skills Messages
export interface SkillListRequest extends WSMessage {
  type: 'skill:list';
}

export interface SkillListResponse extends WSMessage {
  type: 'skill:list:response';
  payload: {
    skills: SkillInfo[];
  };
}

export interface SkillInfo {
  id: string;
  name: string;
  description: string;
  path: string;
  files: string[];
}

export interface SkillCreateRequest extends WSMessage {
  type: 'skill:create';
  payload: {
    name: string;
    description: string;
    instructions: string;
    files: Array<{ name: string; content: string }>;
  };
}

export interface SkillDeleteRequest extends WSMessage {
  type: 'skill:delete';
  payload: {
    name: string;
  };
}

// Session Management
export interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  cliProcess?: CLIProcessInfo;
  workingDirectory: string;
}

export interface CLIProcessInfo {
  pid: number;
  startedAt: Date;
  model?: string;
}

// Authentication
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
  apiKeyEncrypted?: string;
}

export interface AuthTokenPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

// Chat/Conversation
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  toolName?: string;
  toolResult?: unknown;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  sessionId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  title?: string;
  tags?: string[];
}

// Git Messages
export interface GitStatusRequest extends WSMessage {
  type: 'git:status';
}

export interface GitStatusResponse extends WSMessage {
  type: 'git:status:response';
  payload: GitStatus;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  conflicted: string[];
}

export interface GitCommitRequest extends WSMessage {
  type: 'git:commit';
  payload: {
    message: string;
    files?: string[];
  };
}

export interface GitDiffRequest extends WSMessage {
  type: 'git:diff';
  payload: {
    file?: string;
    staged?: boolean;
  };
}

export interface GitDiffResponse extends WSMessage {
  type: 'git:diff:response';
  payload: {
    diff: string;
  };
}

// Project Messages
export interface ProjectListRequest extends WSMessage {
  type: 'project:list';
}

export interface ProjectListResponse extends WSMessage {
  type: 'project:list:response';
  payload: {
    projects: ProjectInfo[];
  };
}

export interface ProjectInfo {
  name: string;
  path: string;
  lastAccessed: Date;
  hasGeminiConfig: boolean;
  hasGit: boolean;
}

export interface ProjectSwitchRequest extends WSMessage {
  type: 'project:switch';
  payload: {
    path: string;
  };
}

// Terminal Messages
export interface TerminalInput extends WSMessage {
  type: 'terminal:input';
  payload: {
    command: string;
  };
}

export interface TerminalOutput extends WSMessage {
  type: 'terminal:output';
  payload: {
    content: string;
    isError?: boolean;
  };
}

// Error Response
export interface ErrorResponse extends WSMessage {
  type: 'error';
  payload: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Success Response
export interface SuccessResponse extends WSMessage {
  type: 'success';
  payload: {
    message: string;
    data?: unknown;
  };
}

// Connection Messages
export interface ConnectionStatus extends WSMessage {
  type: 'connection:status';
  payload: {
    connected: boolean;
    sessionId?: string;
    workingDirectory?: string;
  };
}

export interface Heartbeat extends WSMessage {
  type: 'heartbeat';
  payload: {
    timestamp: number;
  };
}
