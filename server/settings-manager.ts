/**
 * Settings Manager - Manages Gemini CLI settings.json
 * 
 * Handles reading, writing, and validating Gemini CLI configuration
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { GeminiSettings, MCPServerConfig } from './types.js';

// Default settings location
const GEMINI_DIR = path.join(os.homedir(), '.gemini');
const SETTINGS_FILE = path.join(GEMINI_DIR, 'settings.json');

// Default settings
const DEFAULT_SETTINGS: GeminiSettings = {
  theme: 'system',
  autoAccept: false,
  model: 'gemini-2.5-flash',
  checkpointing: {
    enabled: true,
  },
  telemetry: {
    enabled: false,
    target: 'local',
  },
  includeDirectories: [],
  excludeTools: [],
  mcpServers: {},
  codeExecution: {
    enabled: false,
  },
};

// Valid model options
const VALID_MODELS = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
];

export class SettingsManager {
  private settingsPath: string;
  private cachedSettings: GeminiSettings | null = null;
  private lastLoadTime: number = 0;
  private cacheTimeout: number = 5000; // 5 seconds

  constructor(customPath?: string) {
    this.settingsPath = customPath || SETTINGS_FILE;
  }

  /**
   * Ensure the .gemini directory exists
   */
  private async ensureDirectory(): Promise<void> {
    const dir = path.dirname(this.settingsPath);
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * Load settings from disk
   */
  async getSettings(): Promise<GeminiSettings> {
    // Check cache
    const now = Date.now();
    if (this.cachedSettings && (now - this.lastLoadTime) < this.cacheTimeout) {
      return this.cachedSettings;
    }

    try {
      const content = await fs.readFile(this.settingsPath, 'utf-8');
      const settings = JSON.parse(content) as GeminiSettings;
      
      // Merge with defaults to ensure all fields exist
      this.cachedSettings = this.mergeWithDefaults(settings);
      this.lastLoadTime = now;
      
      return this.cachedSettings;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        // File doesn't exist, return defaults
        this.cachedSettings = { ...DEFAULT_SETTINGS };
        return this.cachedSettings;
      }
      throw error;
    }
  }

  /**
   * Merge settings with defaults
   */
  private mergeWithDefaults(settings: Partial<GeminiSettings>): GeminiSettings {
    return {
      ...DEFAULT_SETTINGS,
      ...settings,
      checkpointing: {
        ...DEFAULT_SETTINGS.checkpointing,
        ...settings.checkpointing,
      },
      telemetry: {
        ...DEFAULT_SETTINGS.telemetry,
        ...settings.telemetry,
      },
      codeExecution: {
        ...DEFAULT_SETTINGS.codeExecution,
        ...settings.codeExecution,
      },
      mcpServers: settings.mcpServers || {},
      includeDirectories: settings.includeDirectories || [],
      excludeTools: settings.excludeTools || [],
    };
  }

  /**
   * Update settings
   */
  async updateSettings(updates: Partial<GeminiSettings>): Promise<GeminiSettings> {
    // Load current settings
    const current = await this.getSettings();

    // Create backup before modifying
    await this.backupSettings();

    // Merge updates
    const updated = this.mergeSettings(current, updates);

    // Validate
    this.validateSettings(updated);

    // Save
    await this.saveSettings(updated);

    return updated;
  }

  /**
   * Merge settings updates
   */
  private mergeSettings(current: GeminiSettings, updates: Partial<GeminiSettings>): GeminiSettings {
    const merged: GeminiSettings = { ...current };

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;

      if (key === 'checkpointing' && typeof value === 'object') {
        merged.checkpointing = { ...current.checkpointing, ...value };
      } else if (key === 'telemetry' && typeof value === 'object') {
        merged.telemetry = { ...current.telemetry, ...value };
      } else if (key === 'codeExecution' && typeof value === 'object') {
        merged.codeExecution = { ...current.codeExecution, ...value };
      } else if (key === 'mcpServers' && typeof value === 'object') {
        merged.mcpServers = { ...current.mcpServers, ...value };
      } else {
        (merged as Record<string, unknown>)[key] = value;
      }
    }

    return merged;
  }

  /**
   * Validate settings
   */
  private validateSettings(settings: GeminiSettings): void {
    // Validate theme
    if (settings.theme && !['system', 'light', 'dark', 'GitHub'].includes(settings.theme)) {
      throw new Error(`Invalid theme: ${settings.theme}`);
    }

    // Validate model
    if (settings.model && !VALID_MODELS.includes(settings.model)) {
      console.warn(`Unknown model: ${settings.model}. This may not be supported.`);
    }

    // Validate MCP servers
    if (settings.mcpServers) {
      for (const [name, config] of Object.entries(settings.mcpServers)) {
        this.validateMCPConfig(name, config);
      }
    }

    // Validate exclude tools
    if (settings.excludeTools && !Array.isArray(settings.excludeTools)) {
      throw new Error('excludeTools must be an array');
    }

    // Validate include directories
    if (settings.includeDirectories && !Array.isArray(settings.includeDirectories)) {
      throw new Error('includeDirectories must be an array');
    }
  }

  /**
   * Validate MCP server configuration
   */
  private validateMCPConfig(name: string, config: MCPServerConfig): void {
    if (!config.command && !config.url) {
      throw new Error(`MCP server "${name}" must have either 'command' or 'url'`);
    }

    if (config.transport && !['stdio', 'sse', 'http'].includes(config.transport)) {
      throw new Error(`Invalid transport for MCP server "${name}": ${config.transport}`);
    }

    if (config.args && !Array.isArray(config.args)) {
      throw new Error(`MCP server "${name}" args must be an array`);
    }

    if (config.env && typeof config.env !== 'object') {
      throw new Error(`MCP server "${name}" env must be an object`);
    }
  }

  /**
   * Save settings to disk
   */
  private async saveSettings(settings: GeminiSettings): Promise<void> {
    await this.ensureDirectory();
    
    const content = JSON.stringify(settings, null, 2);
    await fs.writeFile(this.settingsPath, content, 'utf-8');
    
    // Update cache
    this.cachedSettings = settings;
    this.lastLoadTime = Date.now();
  }

  /**
   * Create a backup of settings
   */
  async backupSettings(): Promise<string | null> {
    try {
      const exists = await this.settingsExists();
      if (!exists) return null;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = this.settingsPath.replace('.json', `.backup-${timestamp}.json`);
      
      await fs.copyFile(this.settingsPath, backupPath);
      return backupPath;
    } catch {
      return null;
    }
  }

  /**
   * Check if settings file exists
   */
  async settingsExists(): Promise<boolean> {
    try {
      await fs.access(this.settingsPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(): Promise<GeminiSettings> {
    await this.backupSettings();
    await this.saveSettings({ ...DEFAULT_SETTINGS });
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * Add an MCP server
   */
  async addMCPServer(name: string, config: MCPServerConfig): Promise<void> {
    this.validateMCPConfig(name, config);
    
    const settings = await this.getSettings();
    settings.mcpServers = settings.mcpServers || {};
    settings.mcpServers[name] = config;
    
    await this.saveSettings(settings);
  }

  /**
   * Remove an MCP server
   */
  async removeMCPServer(name: string): Promise<void> {
    const settings = await this.getSettings();
    
    if (settings.mcpServers && settings.mcpServers[name]) {
      delete settings.mcpServers[name];
      await this.saveSettings(settings);
    }
  }

  /**
   * Get MCP servers
   */
  async getMCPServers(): Promise<Record<string, MCPServerConfig>> {
    const settings = await this.getSettings();
    return settings.mcpServers || {};
  }

  /**
   * Update a specific MCP server
   */
  async updateMCPServer(name: string, config: Partial<MCPServerConfig>): Promise<void> {
    const settings = await this.getSettings();
    
    if (!settings.mcpServers || !settings.mcpServers[name]) {
      throw new Error(`MCP server "${name}" not found`);
    }

    settings.mcpServers[name] = {
      ...settings.mcpServers[name],
      ...config,
    };

    this.validateMCPConfig(name, settings.mcpServers[name]);
    await this.saveSettings(settings);
  }

  /**
   * Add a directory to include
   */
  async addIncludeDirectory(dir: string): Promise<void> {
    const settings = await this.getSettings();
    const dirs = settings.includeDirectories || [];
    
    if (!dirs.includes(dir)) {
      dirs.push(dir);
      settings.includeDirectories = dirs;
      await this.saveSettings(settings);
    }
  }

  /**
   * Remove a directory from include list
   */
  async removeIncludeDirectory(dir: string): Promise<void> {
    const settings = await this.getSettings();
    const dirs = settings.includeDirectories || [];
    const index = dirs.indexOf(dir);
    
    if (index > -1) {
      dirs.splice(index, 1);
      settings.includeDirectories = dirs;
      await this.saveSettings(settings);
    }
  }

  /**
   * Add a tool to exclude list
   */
  async addExcludeTool(tool: string): Promise<void> {
    const settings = await this.getSettings();
    const tools = settings.excludeTools || [];
    
    if (!tools.includes(tool)) {
      tools.push(tool);
      settings.excludeTools = tools;
      await this.saveSettings(settings);
    }
  }

  /**
   * Remove a tool from exclude list
   */
  async removeExcludeTool(tool: string): Promise<void> {
    const settings = await this.getSettings();
    const tools = settings.excludeTools || [];
    const index = tools.indexOf(tool);
    
    if (index > -1) {
      tools.splice(index, 1);
      settings.excludeTools = tools;
      await this.saveSettings(settings);
    }
  }

  /**
   * Set the model
   */
  async setModel(model: string): Promise<void> {
    if (!VALID_MODELS.includes(model)) {
      console.warn(`Unknown model: ${model}. This may not be supported.`);
    }
    
    await this.updateSettings({ model });
  }

  /**
   * Get the current model
   */
  async getModel(): Promise<string> {
    const settings = await this.getSettings();
    return settings.model || DEFAULT_SETTINGS.model!;
  }

  /**
   * Set theme
   */
  async setTheme(theme: 'system' | 'light' | 'dark' | 'GitHub'): Promise<void> {
    await this.updateSettings({ theme });
  }

  /**
   * Toggle auto-accept (YOLO mode)
   */
  async setAutoAccept(enabled: boolean): Promise<void> {
    await this.updateSettings({ autoAccept: enabled });
  }

  /**
   * Toggle checkpointing
   */
  async setCheckpointing(enabled: boolean): Promise<void> {
    await this.updateSettings({
      checkpointing: { enabled },
    });
  }

  /**
   * Toggle telemetry
   */
  async setTelemetry(enabled: boolean, target?: string): Promise<void> {
    await this.updateSettings({
      telemetry: { enabled, target },
    });
  }

  /**
   * Clear cache to force reload
   */
  clearCache(): void {
    this.cachedSettings = null;
    this.lastLoadTime = 0;
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return [...VALID_MODELS];
  }

  /**
   * Export settings as JSON string
   */
  async exportSettings(): Promise<string> {
    const settings = await this.getSettings();
    return JSON.stringify(settings, null, 2);
  }

  /**
   * Import settings from JSON string
   */
  async importSettings(json: string): Promise<GeminiSettings> {
    const settings = JSON.parse(json) as GeminiSettings;
    this.validateSettings(settings);
    
    await this.backupSettings();
    await this.saveSettings(settings);
    
    return settings;
  }
}

// Export singleton instance
export const settingsManager = new SettingsManager();
