/**
 * Project Manager - Manage development projects
 * 
 * Handles project listing, switching, initialization, and settings
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

export interface Project {
  id: string;
  name: string;
  path: string;
  description?: string;
  lastOpened: Date;
  created: Date;
  gitRepo?: boolean;
  language?: string;
  framework?: string;
  size?: number;
  fileCount?: number;
}

export interface ProjectSettings {
  name: string;
  description?: string;
  defaultModel?: string;
  customPrompts?: string[];
  excludePaths?: string[];
  environment?: Record<string, string>;
}

export interface RecentProject {
  path: string;
  name: string;
  lastOpened: Date;
}

export class ProjectManager {
  private configDir: string;
  private projectsFile: string;
  private recentProjects: RecentProject[] = [];
  private currentProject: Project | null = null;

  constructor() {
    this.configDir = path.join(os.homedir(), '.gemini');
    this.projectsFile = path.join(this.configDir, 'projects.json');
  }

  /**
   * Initialize project manager
   */
  async init(): Promise<void> {
    try {
      await fs.mkdir(this.configDir, { recursive: true });
      await this.loadRecentProjects();
    } catch (error) {
      console.error('Failed to initialize project manager:', error);
    }
  }

  /**
   * Load recent projects from config
   */
  private async loadRecentProjects(): Promise<void> {
    try {
      const content = await fs.readFile(this.projectsFile, 'utf-8');
      this.recentProjects = JSON.parse(content);
    } catch {
      this.recentProjects = [];
    }
  }

  /**
   * Save recent projects to config
   */
  private async saveRecentProjects(): Promise<void> {
    await fs.writeFile(this.projectsFile, JSON.stringify(this.recentProjects, null, 2));
  }

  /**
   * Get list of recent projects
   */
  async getRecentProjects(limit: number = 10): Promise<RecentProject[]> {
    await this.loadRecentProjects();
    return this.recentProjects
      .sort((a, b) => new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime())
      .slice(0, limit);
  }

  /**
   * Add to recent projects
   */
  async addToRecent(projectPath: string, name?: string): Promise<void> {
    await this.loadRecentProjects();
    
    // Remove if already exists
    this.recentProjects = this.recentProjects.filter(p => p.path !== projectPath);
    
    // Add to beginning
    this.recentProjects.unshift({
      path: projectPath,
      name: name || path.basename(projectPath),
      lastOpened: new Date(),
    });
    
    // Keep only last 20
    this.recentProjects = this.recentProjects.slice(0, 20);
    
    await this.saveRecentProjects();
  }

  /**
   * Remove from recent projects
   */
  async removeFromRecent(projectPath: string): Promise<void> {
    await this.loadRecentProjects();
    this.recentProjects = this.recentProjects.filter(p => p.path !== projectPath);
    await this.saveRecentProjects();
  }

  /**
   * Scan a directory and return project info
   */
  async scanProject(projectPath: string): Promise<Project> {
    const stats = await fs.stat(projectPath);
    if (!stats.isDirectory()) {
      throw new Error('Path is not a directory');
    }

    const name = path.basename(projectPath);
    const files = await fs.readdir(projectPath);

    // Check for git
    const hasGit = files.includes('.git');

    // Detect language/framework
    let language: string | undefined;
    let framework: string | undefined;

    if (files.includes('package.json')) {
      language = 'JavaScript/TypeScript';
      try {
        const pkgContent = await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8');
        const pkg = JSON.parse(pkgContent);
        if (pkg.dependencies?.react || pkg.devDependencies?.react) {
          framework = 'React';
        } else if (pkg.dependencies?.vue || pkg.devDependencies?.vue) {
          framework = 'Vue';
        } else if (pkg.dependencies?.angular || pkg.devDependencies?.angular) {
          framework = 'Angular';
        } else if (pkg.dependencies?.next || pkg.devDependencies?.next) {
          framework = 'Next.js';
        }
      } catch {
        // Ignore parse errors
      }
    } else if (files.includes('requirements.txt') || files.includes('setup.py') || files.includes('pyproject.toml')) {
      language = 'Python';
      if (files.includes('manage.py')) {
        framework = 'Django';
      } else if (files.some(f => f.includes('flask'))) {
        framework = 'Flask';
      }
    } else if (files.includes('Cargo.toml')) {
      language = 'Rust';
    } else if (files.includes('go.mod')) {
      language = 'Go';
    } else if (files.includes('pom.xml') || files.includes('build.gradle')) {
      language = 'Java';
      if (files.some(f => f.includes('spring'))) {
        framework = 'Spring';
      }
    } else if (files.includes('Gemfile')) {
      language = 'Ruby';
      if (files.includes('config.ru') || files.includes('Rakefile')) {
        framework = 'Rails';
      }
    } else if (files.some(f => f.endsWith('.csproj') || f.endsWith('.sln'))) {
      language = 'C#/.NET';
    }

    // Calculate size (simplified)
    let totalSize = 0;
    let fileCount = 0;
    
    async function walkDir(dir: string, depth: number = 0): Promise<void> {
      if (depth > 3) return; // Limit depth for performance
      
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          
          const fullPath = path.join(dir, entry.name);
          if (entry.isFile()) {
            try {
              const stats = await fs.stat(fullPath);
              totalSize += stats.size;
              fileCount++;
            } catch {
              // Skip inaccessible files
            }
          } else if (entry.isDirectory()) {
            await walkDir(fullPath, depth + 1);
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    }
    
    await walkDir(projectPath);

    return {
      id: Buffer.from(projectPath).toString('base64').slice(0, 16),
      name,
      path: projectPath,
      lastOpened: new Date(),
      created: stats.birthtime,
      gitRepo: hasGit,
      language,
      framework,
      size: totalSize,
      fileCount,
    };
  }

  /**
   * List projects in a directory
   */
  async listProjectsInDirectory(basePath: string): Promise<Project[]> {
    const projects: Project[] = [];
    
    try {
      const entries = await fs.readdir(basePath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        
        const fullPath = path.join(basePath, entry.name);
        
        try {
          const project = await this.scanProject(fullPath);
          projects.push(project);
        } catch {
          // Skip invalid projects
        }
      }
    } catch (error) {
      throw new Error(`Failed to list projects: ${error}`);
    }
    
    return projects;
  }

  /**
   * Get current project
   */
  getCurrentProject(): Project | null {
    return this.currentProject;
  }

  /**
   * Switch to a project
   */
  async switchProject(projectPath: string): Promise<Project> {
    const project = await this.scanProject(projectPath);
    this.currentProject = project;
    await this.addToRecent(projectPath, project.name);
    return project;
  }

  /**
   * Initialize a new project
   */
  async initializeProject(
    projectPath: string,
    options: {
      name?: string;
      template?: 'blank' | 'node' | 'python' | 'react' | 'next';
      gitInit?: boolean;
    } = {}
  ): Promise<Project> {
    // Create directory if doesn't exist
    await fs.mkdir(projectPath, { recursive: true });
    
    const name = options.name || path.basename(projectPath);
    
    // Initialize based on template
    switch (options.template) {
      case 'node':
        await this.createNodeProject(projectPath, name);
        break;
      case 'python':
        await this.createPythonProject(projectPath, name);
        break;
      case 'react':
        await this.createReactProject(projectPath, name);
        break;
      case 'next':
        await this.createNextProject(projectPath, name);
        break;
      default:
        // Blank project - just create GEMINI.md
        await this.createBlankProject(projectPath, name);
    }
    
    // Initialize git if requested
    if (options.gitInit) {
      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        await execAsync('git init', { cwd: projectPath });
      } catch {
        // Git not available
      }
    }
    
    return this.switchProject(projectPath);
  }

  /**
   * Create a blank project
   */
  private async createBlankProject(projectPath: string, name: string): Promise<void> {
    const geminiMd = `# ${name}

## Project Overview
[Describe your project here]

## Tech Stack
- [List your technologies]

## Getting Started
1. [Step 1]
2. [Step 2]

## Project Structure
\`\`\`
${name}/
├── src/
└── README.md
\`\`\`
`;

    await fs.writeFile(path.join(projectPath, 'GEMINI.md'), geminiMd);
    await fs.writeFile(path.join(projectPath, 'README.md'), `# ${name}\n\nA new project.\n`);
  }

  /**
   * Create a Node.js project
   */
  private async createNodeProject(projectPath: string, name: string): Promise<void> {
    const packageJson = {
      name: name.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      description: '',
      main: 'index.js',
      scripts: {
        start: 'node index.js',
        test: 'echo "Error: no test specified" && exit 1',
      },
      keywords: [],
      author: '',
      license: 'ISC',
    };

    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    await fs.writeFile(
      path.join(projectPath, 'index.js'),
      `console.log('Hello, ${name}!');\n`
    );

    await fs.writeFile(
      path.join(projectPath, '.gitignore'),
      `node_modules/\n.env\n.DS_Store\n`
    );

    await this.createBlankProject(projectPath, name);
  }

  /**
   * Create a Python project
   */
  private async createPythonProject(projectPath: string, name: string): Promise<void> {
    const moduleName = name.toLowerCase().replace(/\s+/g, '_');
    
    await fs.mkdir(path.join(projectPath, moduleName), { recursive: true });
    
    await fs.writeFile(
      path.join(projectPath, moduleName, '__init__.py'),
      `"""${name} package."""\n`
    );

    await fs.writeFile(
      path.join(projectPath, 'requirements.txt'),
      `# Add your dependencies here\n`
    );

    await fs.writeFile(
      path.join(projectPath, 'main.py'),
      `"""Main entry point for ${name}."""\n\nif __name__ == '__main__':\n    print('Hello, ${name}!')\n`
    );

    await fs.writeFile(
      path.join(projectPath, '.gitignore'),
      `__pycache__/\n*.py[cod]\n.env\nvenv/\n.DS_Store\n`
    );

    await this.createBlankProject(projectPath, name);
  }

  /**
   * Create a React project (skeleton)
   */
  private async createReactProject(projectPath: string, name: string): Promise<void> {
    const packageJson = {
      name: name.toLowerCase().replace(/\s+/g, '-'),
      version: '0.1.0',
      private: true,
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
      },
      devDependencies: {
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        typescript: '^5.0.0',
        vite: '^5.0.0',
        '@vitejs/plugin-react': '^4.0.0',
      },
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
    };

    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    await fs.mkdir(path.join(projectPath, 'src'), { recursive: true });

    await fs.writeFile(
      path.join(projectPath, 'src', 'App.tsx'),
      `import React from 'react';\n\nexport default function App() {\n  return <h1>Hello, ${name}!</h1>;\n}\n`
    );

    await fs.writeFile(
      path.join(projectPath, 'src', 'main.tsx'),
      `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n`
    );

    await fs.writeFile(
      path.join(projectPath, 'index.html'),
      `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${name}</title>\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="/src/main.tsx"></script>\n</body>\n</html>\n`
    );

    await fs.writeFile(
      path.join(projectPath, '.gitignore'),
      `node_modules/\ndist/\n.env\n.DS_Store\n`
    );

    await this.createBlankProject(projectPath, name);
  }

  /**
   * Create a Next.js project (skeleton)
   */
  private async createNextProject(projectPath: string, name: string): Promise<void> {
    const packageJson = {
      name: name.toLowerCase().replace(/\s+/g, '-'),
      version: '0.1.0',
      private: true,
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        next: '^14.0.0',
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        typescript: '^5.0.0',
      },
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
      },
    };

    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    await fs.mkdir(path.join(projectPath, 'app'), { recursive: true });

    await fs.writeFile(
      path.join(projectPath, 'app', 'page.tsx'),
      `export default function Home() {\n  return <h1>Hello, ${name}!</h1>;\n}\n`
    );

    await fs.writeFile(
      path.join(projectPath, 'app', 'layout.tsx'),
      `export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  );\n}\n`
    );

    await fs.writeFile(
      path.join(projectPath, '.gitignore'),
      `node_modules/\n.next/\nout/\n.env\n.DS_Store\n`
    );

    await this.createBlankProject(projectPath, name);
  }

  /**
   * Get project settings
   */
  async getProjectSettings(projectPath: string): Promise<ProjectSettings | null> {
    try {
      const settingsPath = path.join(projectPath, '.gemini', 'project.json');
      const content = await fs.readFile(settingsPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Save project settings
   */
  async saveProjectSettings(projectPath: string, settings: ProjectSettings): Promise<void> {
    const settingsDir = path.join(projectPath, '.gemini');
    await fs.mkdir(settingsDir, { recursive: true });
    
    const settingsPath = path.join(settingsDir, 'project.json');
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
  }

  /**
   * Delete a project (remove from recent, optionally delete files)
   */
  async deleteProject(projectPath: string, deleteFiles: boolean = false): Promise<void> {
    await this.removeFromRecent(projectPath);
    
    if (deleteFiles) {
      await fs.rm(projectPath, { recursive: true, force: true });
    }
  }

  /**
   * Get project statistics
   */
  async getProjectStats(projectPath: string): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
    languages: Record<string, number>;
  }> {
    let totalFiles = 0;
    let totalSize = 0;
    const filesByType: Record<string, number> = {};
    const languages: Record<string, number> = {};

    const extensionToLanguage: Record<string, string> = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.py': 'Python',
      '.rb': 'Ruby',
      '.go': 'Go',
      '.rs': 'Rust',
      '.java': 'Java',
      '.c': 'C',
      '.cpp': 'C++',
      '.h': 'C/C++',
      '.cs': 'C#',
      '.php': 'PHP',
      '.swift': 'Swift',
      '.kt': 'Kotlin',
      '.scala': 'Scala',
      '.html': 'HTML',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.json': 'JSON',
      '.yaml': 'YAML',
      '.yml': 'YAML',
      '.md': 'Markdown',
      '.sql': 'SQL',
      '.sh': 'Shell',
    };

    async function walkDir(dir: string): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          // Skip common unneeded directories
          if (entry.isDirectory()) {
            if (['node_modules', '.git', '.next', 'dist', 'build', '__pycache__', 'venv'].includes(entry.name)) {
              continue;
            }
            await walkDir(fullPath);
          } else if (entry.isFile()) {
            try {
              const stats = await fs.stat(fullPath);
              totalFiles++;
              totalSize += stats.size;

              const ext = path.extname(entry.name).toLowerCase();
              filesByType[ext] = (filesByType[ext] || 0) + 1;

              const language = extensionToLanguage[ext];
              if (language) {
                languages[language] = (languages[language] || 0) + 1;
              }
            } catch {
              // Skip inaccessible files
            }
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    }

    await walkDir(projectPath);

    return { totalFiles, totalSize, filesByType, languages };
  }
}

// Export singleton instance
export const projectManager = new ProjectManager();
