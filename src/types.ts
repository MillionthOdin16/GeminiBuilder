// All available Gemini CLI themes
export type GeminiTheme = 
  | 'ANSI' 
  | 'Atom One' 
  | 'Ayu' 
  | 'Default' 
  | 'Dracula' 
  | 'GitHub'
  | 'ANSI Light' 
  | 'Ayu Light' 
  | 'Default Light' 
  | 'GitHub Light' 
  | 'Google Code' 
  | 'Xcode';

export interface McpServer {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface Settings {
  // UI Settings
  theme?: GeminiTheme;
  ui?: {
    hideWindowTitle?: boolean;
    showStatusInTitle?: boolean;
    hideTips?: boolean;
    hideBanner?: boolean;
    hideContextSummary?: boolean;
    hideFooter?: boolean;
    showMemoryUsage?: boolean;
    showLineNumbers?: boolean;
    showCitations?: boolean;
    useFullWidth?: boolean;
    useAlternateBuffer?: boolean;
    footer?: {
      hideCWD?: boolean;
      hideSandboxStatus?: boolean;
      hideModelInfo?: boolean;
      hideContextPercentage?: boolean;
    };
    accessibility?: {
      disableLoadingPhrases?: boolean;
      screenReader?: boolean;
    };
  };
  
  // Tools Settings
  tools?: {
    autoAccept?: boolean; // YOLO mode
    useRipgrep?: boolean;
    enableToolOutputTruncation?: boolean;
    truncateToolOutputThreshold?: number;
    truncateToolOutputLines?: number;
    shell?: {
      enableInteractiveShell?: boolean;
      showColor?: boolean;
    };
  };
  
  // Security Settings
  security?: {
    disableYoloMode?: boolean;
    blockGitExtensions?: boolean;
    folderTrust?: {
      enabled?: boolean;
    };
  };
  
  // Context Settings
  context?: {
    fileName?: string[];
    discoveryMaxDirs?: number;
    loadMemoryFromIncludeDirectories?: boolean;
    fileFiltering?: {
      respectGitIgnore?: boolean;
      respectGeminiIgnore?: boolean;
      enableRecursiveFileSearch?: boolean;
      disableFuzzySearch?: boolean;
    };
  };
  
  // Model Settings
  model?: {
    maxSessionTurns?: number;
    compressionThreshold?: number;
    skipNextSpeakerCheck?: boolean;
  };
  
  // Legacy/simplified settings (for backwards compatibility)
  autoAccept?: boolean; // YOLO mode shortcut
  checkpointing?: {
    enabled?: boolean;
  };
  telemetry?: {
    enabled?: boolean;
    target?: 'local' | 'gcp' | string;
  };
  includeDirectories?: string[];
  excludeTools?: string[];
  mcpServers?: Record<string, McpServer>;
  
  // Allow other keys for extensibility
  [key: string]: unknown;
}

export interface CustomCommand {
  id: string; // Internal UUID
  name: string; // The slash command (e.g., "test:gen")
  description: string;
  prompt: string;
}

export interface ContextSection {
    id: string;
    title: string; // e.g. "Project Persona", "Tech Stack"
    content: string;
    enabled: boolean;
}

export interface Extension {
    id: string;
    name: string;
    description: string;
    url: string;
    mcpConfig?: Record<string, unknown>; // If adding this extension adds MCP config
}

export interface SkillFile {
    id: string;
    name: string;
    content: string;
}

export interface AgentSkill {
    id: string;
    name: string; // e.g., "summarize-docs"
    description: string;
    instructions: string; // The markdown body of SKILL.md
    files: SkillFile[];
}

export interface Persona {
    id: string;
    name: string;
    description: string;
    settings: Partial<Settings>;
    contextSections: ContextSection[];
    skills: AgentSkill[];
    commands: CustomCommand[];
}

export interface AppState {
    settings: Settings;
    commands: CustomCommand[];
    contextSections: ContextSection[];
    activeExtensions: Extension[];
    skills: AgentSkill[];
    
    // Actions
    updateSettings: (settings: Partial<Settings>) => void;
    addCommand: (command: CustomCommand) => void;
    updateCommand: (id: string, command: Partial<CustomCommand>) => void;
    removeCommand: (id: string) => void;
    
    addContextSection: (section: ContextSection) => void;
    updateContextSection: (id: string, update: string | Partial<ContextSection>) => void;
    toggleContextSection: (id: string) => void;
    removeContextSection: (id: string) => void;
    reorderContextSections: (newOrder: ContextSection[]) => void; // Optional but good for MD generation

    toggleExtension: (extension: Extension) => void;

    addSkill: (skill: AgentSkill) => void;
    updateSkill: (id: string, skill: Partial<AgentSkill>) => void;
    removeSkill: (id: string) => void;

    loadPersona: (persona: Persona) => void;
}
