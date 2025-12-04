export interface Settings {
  theme?: 'system' | 'light' | 'dark' | 'GitHub';
  autoAccept?: boolean; // YOLO mode
  checkpointing?: {
    enabled?: boolean;
  };
  telemetry?: {
    enabled?: boolean;
    target?: 'local' | 'gcp' | string;
  };
  includeDirectories?: string[];
  excludeTools?: string[];
  mcpServers?: Record<string, {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>;
  // Allow other keys
  [key: string]: any;
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
    mcpConfig?: Record<string, any>; // If adding this extension adds MCP config
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

    loadPersona: (persona: any) => void; // Using 'any' briefly to avoid circular deps or complex import in types.ts, or better define interface here
}
