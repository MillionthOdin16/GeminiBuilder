/**
 * Extensions Manager - Manage Gemini CLI extensions
 * 
 * Handles installation, uninstallation, and configuration of extensions
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

export interface ExtensionInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  repository?: string;
  homepage?: string;
  installed: boolean;
  enabled: boolean;
  hasUpdate?: boolean;
  latestVersion?: string;
  config?: Record<string, unknown>;
  mcpServers?: string[];
  commands?: string[];
  size?: number;
  installedAt?: Date;
}

export interface ExtensionRegistry {
  extensions: ExtensionRegistryEntry[];
  lastUpdated: Date;
}

export interface ExtensionRegistryEntry {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  repository: string;
  homepage?: string;
  keywords?: string[];
  dependencies?: string[];
}

export interface InstallProgress {
  extension: string;
  stage: 'downloading' | 'extracting' | 'configuring' | 'complete' | 'error';
  progress: number;
  message: string;
}

export class ExtensionsManager extends EventEmitter {
  private extensionsDir: string;
  private settingsPath: string;
  private registryUrl: string;
  private installedExtensions: Map<string, ExtensionInfo> = new Map();

  constructor() {
    super();
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
    this.extensionsDir = path.join(homeDir, '.gemini', 'extensions');
    this.settingsPath = path.join(homeDir, '.gemini', 'settings.json');
    this.registryUrl = 'https://raw.githubusercontent.com/google-gemini/gemini-cli/main/extensions-registry.json';
  }

  /**
   * Initialize extensions directory
   */
  async init(): Promise<void> {
    try {
      await fs.mkdir(this.extensionsDir, { recursive: true });
      await this.loadInstalledExtensions();
    } catch (error) {
      console.error('Failed to initialize extensions directory:', error);
    }
  }

  /**
   * Load installed extensions from disk
   */
  private async loadInstalledExtensions(): Promise<void> {
    try {
      const entries = await fs.readdir(this.extensionsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            const manifestPath = path.join(this.extensionsDir, entry.name, 'manifest.json');
            const manifestContent = await fs.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);
            
            const info: ExtensionInfo = {
              id: entry.name,
              name: manifest.name || entry.name,
              version: manifest.version || '0.0.0',
              description: manifest.description || '',
              author: manifest.author || 'Unknown',
              repository: manifest.repository,
              homepage: manifest.homepage,
              installed: true,
              enabled: await this.isExtensionEnabled(entry.name),
              config: manifest.config,
              mcpServers: manifest.mcpServers,
              commands: manifest.commands,
              installedAt: await this.getInstallDate(entry.name),
            };
            
            this.installedExtensions.set(entry.name, info);
          } catch {
            // Invalid extension, skip
          }
        }
      }
    } catch {
      // Extensions directory doesn't exist yet
    }
  }

  /**
   * Check if extension is enabled in settings
   */
  private async isExtensionEnabled(extensionId: string): Promise<boolean> {
    try {
      const content = await fs.readFile(this.settingsPath, 'utf-8');
      const settings = JSON.parse(content);
      const disabledExtensions = settings.disabledExtensions || [];
      return !disabledExtensions.includes(extensionId);
    } catch {
      return true; // Enabled by default
    }
  }

  /**
   * Get extension install date
   */
  private async getInstallDate(extensionId: string): Promise<Date | undefined> {
    try {
      const extPath = path.join(this.extensionsDir, extensionId);
      const stats = await fs.stat(extPath);
      return stats.birthtime;
    } catch {
      return undefined;
    }
  }

  /**
   * List all installed extensions
   */
  async listInstalled(): Promise<ExtensionInfo[]> {
    await this.loadInstalledExtensions();
    return Array.from(this.installedExtensions.values());
  }

  /**
   * Get extension info
   */
  async getExtension(extensionId: string): Promise<ExtensionInfo | null> {
    return this.installedExtensions.get(extensionId) || null;
  }

  /**
   * Fetch registry from remote
   */
  async fetchRegistry(): Promise<ExtensionRegistryEntry[]> {
    // Return curated list of known extensions
    // In production, this would fetch from the registry URL
    return [
      {
        id: 'cloud-run',
        name: 'Cloud Run',
        version: '1.0.0',
        description: 'Deploy and manage Google Cloud Run services directly from Gemini CLI',
        author: 'Google',
        repository: 'https://github.com/google-gemini/gemini-cli-extension-cloud-run',
        keywords: ['cloud', 'deployment', 'gcp'],
      },
      {
        id: 'flutter-extension',
        name: 'Flutter',
        version: '1.0.0',
        description: 'Flutter development tools and code generation for Gemini CLI',
        author: 'Flutter Team',
        repository: 'https://github.com/flutter/gemini-cli-extension',
        keywords: ['flutter', 'mobile', 'dart'],
      },
      {
        id: 'prompt-library',
        name: 'Prompt Library',
        version: '1.0.0',
        description: '30+ professional prompts for code review, testing, debugging, and architecture',
        author: 'Harish Garg',
        repository: 'https://github.com/harish-garg/gemini-cli-prompt-library',
        keywords: ['prompts', 'templates'],
      },
      {
        id: 'linear-extension',
        name: 'Linear',
        version: '1.0.0',
        description: 'Integrate Linear issue tracking with Gemini CLI',
        author: 'Linear',
        repository: 'https://github.com/linear/gemini-cli-extension',
        keywords: ['project-management', 'issues'],
      },
      {
        id: 'stripe-extension',
        name: 'Stripe',
        version: '1.0.0',
        description: 'Stripe payment integration and API tools for Gemini CLI',
        author: 'Stripe',
        repository: 'https://github.com/stripe/gemini-cli-extension',
        keywords: ['payments', 'api'],
      },
      {
        id: 'skillz-collection',
        name: 'Skillz Collection',
        version: '1.0.0',
        description: 'Collection of agent skills including Git Expert, Code Reviewer, and more',
        author: 'Intellectronica',
        repository: 'https://github.com/intellectronica/gemini-cli-skillz',
        keywords: ['skills', 'agents'],
      },
    ];
  }

  /**
   * Search extensions in registry
   */
  async searchExtensions(query: string): Promise<ExtensionRegistryEntry[]> {
    const registry = await this.fetchRegistry();
    const lowerQuery = query.toLowerCase();
    
    return registry.filter(ext => 
      ext.name.toLowerCase().includes(lowerQuery) ||
      ext.description.toLowerCase().includes(lowerQuery) ||
      (ext.keywords || []).some(kw => kw.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Install an extension from repository
   */
  async install(extensionId: string, repoUrl?: string): Promise<void> {
    this.emit('progress', {
      extension: extensionId,
      stage: 'downloading',
      progress: 0,
      message: `Starting installation of ${extensionId}...`,
    } as InstallProgress);

    const extPath = path.join(this.extensionsDir, extensionId);

    try {
      // Create extension directory
      await fs.mkdir(extPath, { recursive: true });

      this.emit('progress', {
        extension: extensionId,
        stage: 'downloading',
        progress: 20,
        message: 'Cloning repository...',
      } as InstallProgress);

      // If repo URL provided, clone it
      if (repoUrl) {
        await execAsync(`git clone --depth 1 ${repoUrl} ${extPath}`, {
          timeout: 60000,
        });
      } else {
        // Try to find in registry
        const registry = await this.fetchRegistry();
        const entry = registry.find(e => e.id === extensionId);
        if (entry?.repository) {
          await execAsync(`git clone --depth 1 ${entry.repository} ${extPath}`, {
            timeout: 60000,
          });
        } else {
          throw new Error(`Extension ${extensionId} not found in registry`);
        }
      }

      this.emit('progress', {
        extension: extensionId,
        stage: 'extracting',
        progress: 50,
        message: 'Processing extension files...',
      } as InstallProgress);

      // Check for package.json and install dependencies
      const packageJsonPath = path.join(extPath, 'package.json');
      try {
        await fs.access(packageJsonPath);
        
        this.emit('progress', {
          extension: extensionId,
          stage: 'configuring',
          progress: 70,
          message: 'Installing dependencies...',
        } as InstallProgress);

        await execAsync('npm install --production', {
          cwd: extPath,
          timeout: 120000,
        });
      } catch {
        // No package.json, skip npm install
      }

      // Create manifest if doesn't exist
      const manifestPath = path.join(extPath, 'manifest.json');
      try {
        await fs.access(manifestPath);
      } catch {
        // Create basic manifest
        const manifest = {
          id: extensionId,
          name: extensionId,
          version: '1.0.0',
          description: '',
        };
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      }

      this.emit('progress', {
        extension: extensionId,
        stage: 'complete',
        progress: 100,
        message: 'Installation complete!',
      } as InstallProgress);

      // Reload installed extensions
      await this.loadInstalledExtensions();

    } catch (error) {
      // Cleanup on failure
      try {
        await fs.rm(extPath, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }

      this.emit('progress', {
        extension: extensionId,
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Installation failed',
      } as InstallProgress);

      throw error;
    }
  }

  /**
   * Uninstall an extension
   */
  async uninstall(extensionId: string): Promise<void> {
    const extPath = path.join(this.extensionsDir, extensionId);

    try {
      await fs.access(extPath);
      await fs.rm(extPath, { recursive: true, force: true });
      this.installedExtensions.delete(extensionId);
    } catch (error) {
      throw new Error(`Failed to uninstall extension: ${extensionId}`);
    }
  }

  /**
   * Enable an extension
   */
  async enable(extensionId: string): Promise<void> {
    try {
      const content = await fs.readFile(this.settingsPath, 'utf-8');
      const settings = JSON.parse(content);
      settings.disabledExtensions = (settings.disabledExtensions || []).filter(
        (id: string) => id !== extensionId
      );
      await fs.writeFile(this.settingsPath, JSON.stringify(settings, null, 2));

      const ext = this.installedExtensions.get(extensionId);
      if (ext) {
        ext.enabled = true;
      }
    } catch (error) {
      throw new Error(`Failed to enable extension: ${extensionId}`);
    }
  }

  /**
   * Disable an extension
   */
  async disable(extensionId: string): Promise<void> {
    try {
      let settings: Record<string, unknown> = {};
      try {
        const content = await fs.readFile(this.settingsPath, 'utf-8');
        settings = JSON.parse(content);
      } catch {
        // Settings file doesn't exist
      }

      const disabledExtensions = (settings.disabledExtensions as string[]) || [];
      if (!disabledExtensions.includes(extensionId)) {
        disabledExtensions.push(extensionId);
      }
      settings.disabledExtensions = disabledExtensions;

      await fs.writeFile(this.settingsPath, JSON.stringify(settings, null, 2));

      const ext = this.installedExtensions.get(extensionId);
      if (ext) {
        ext.enabled = false;
      }
    } catch (error) {
      throw new Error(`Failed to disable extension: ${extensionId}`);
    }
  }

  /**
   * Update an extension
   */
  async update(extensionId: string): Promise<void> {
    const extPath = path.join(this.extensionsDir, extensionId);

    try {
      // Pull latest changes
      await execAsync('git pull', {
        cwd: extPath,
        timeout: 60000,
      });

      // Reinstall dependencies if needed
      const packageJsonPath = path.join(extPath, 'package.json');
      try {
        await fs.access(packageJsonPath);
        await execAsync('npm install --production', {
          cwd: extPath,
          timeout: 120000,
        });
      } catch {
        // No package.json
      }

      // Reload
      await this.loadInstalledExtensions();
    } catch (error) {
      throw new Error(`Failed to update extension: ${extensionId}`);
    }
  }

  /**
   * Check for updates
   */
  async checkForUpdates(): Promise<Map<string, string>> {
    const updates = new Map<string, string>();

    for (const [id, ext] of this.installedExtensions) {
      try {
        const extPath = path.join(this.extensionsDir, id);
        const { stdout } = await execAsync('git fetch && git log HEAD..origin/main --oneline', {
          cwd: extPath,
          timeout: 30000,
        });

        if (stdout.trim().length > 0) {
          // There are new commits
          const lines = stdout.trim().split('\n');
          updates.set(id, `${lines.length} new commits available`);
          ext.hasUpdate = true;
        }
      } catch {
        // Skip extensions without git or fetch errors
      }
    }

    return updates;
  }

  /**
   * Get extension configuration
   */
  async getConfig(extensionId: string): Promise<Record<string, unknown> | null> {
    try {
      const configPath = path.join(this.extensionsDir, extensionId, 'config.json');
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Save extension configuration
   */
  async saveConfig(extensionId: string, config: Record<string, unknown>): Promise<void> {
    const configPath = path.join(this.extensionsDir, extensionId, 'config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Get extension readme
   */
  async getReadme(extensionId: string): Promise<string | null> {
    const extPath = path.join(this.extensionsDir, extensionId);

    // Try different readme file names
    const readmeNames = ['README.md', 'readme.md', 'Readme.md', 'README', 'readme'];

    for (const name of readmeNames) {
      try {
        return await fs.readFile(path.join(extPath, name), 'utf-8');
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Get extension changelog
   */
  async getChangelog(extensionId: string): Promise<string | null> {
    const extPath = path.join(this.extensionsDir, extensionId);

    const changelogNames = ['CHANGELOG.md', 'changelog.md', 'CHANGES.md', 'History.md'];

    for (const name of changelogNames) {
      try {
        return await fs.readFile(path.join(extPath, name), 'utf-8');
      } catch {
        continue;
      }
    }

    return null;
  }
}

// Export singleton instance
export const extensionsManager = new ExtensionsManager();
