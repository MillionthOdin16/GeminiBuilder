/**
 * File System API - Handles all disk operations with security boundaries
 * 
 * Provides safe file I/O operations with working directory sandboxing
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { watch, FSWatcher } from 'chokidar';
import type { FileEntry } from './types.js';

const execAsync = promisify(exec);

// File size limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DIRECTORY_DEPTH = 20;

// Patterns for .gitignore style matching
const DEFAULT_IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.DS_Store',
  'dist',
  'build',
  '__pycache__',
  '*.pyc',
  '.env',
  '.env.local',
  'coverage',
  '.nyc_output',
];

export class FileSystemAPI {
  private watchers: Map<string, FSWatcher> = new Map();
  private ignorePatterns: string[] = [...DEFAULT_IGNORE_PATTERNS];

  /**
   * Resolve and validate a path within the working directory
   */
  private resolvePath(filePath: string, workingDirectory: string): string {
    // Normalize the path
    const normalized = path.normalize(filePath);
    
    // Handle absolute paths
    if (path.isAbsolute(normalized)) {
      // Check if the absolute path is within working directory
      const relative = path.relative(workingDirectory, normalized);
      if (relative.startsWith('..')) {
        throw new Error('Access denied: Path is outside working directory');
      }
      return normalized;
    }

    // Resolve relative path
    const resolved = path.resolve(workingDirectory, normalized);
    
    // Security check: ensure resolved path is within working directory
    const relative = path.relative(workingDirectory, resolved);
    if (relative.startsWith('..')) {
      throw new Error('Access denied: Path is outside working directory');
    }

    return resolved;
  }

  /**
   * Check if a path is a symbolic link pointing outside working directory
   */
  private async checkSymlink(filePath: string, workingDirectory: string): Promise<void> {
    try {
      const stats = await fs.lstat(filePath);
      if (stats.isSymbolicLink()) {
        const realPath = await fs.realpath(filePath);
        const relative = path.relative(workingDirectory, realPath);
        if (relative.startsWith('..')) {
          throw new Error('Access denied: Symbolic link points outside working directory');
        }
      }
    } catch (error) {
      // If file doesn't exist, that's fine (for write operations)
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Read a file
   */
  async readFile(filePath: string, workingDirectory: string): Promise<string> {
    const resolved = this.resolvePath(filePath, workingDirectory);
    await this.checkSymlink(resolved, workingDirectory);

    // Check file size before reading
    const stats = await fs.stat(resolved);
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${stats.size} bytes (max: ${MAX_FILE_SIZE})`);
    }

    const content = await fs.readFile(resolved, 'utf-8');
    return content;
  }

  /**
   * Read a binary file
   */
  async readBinaryFile(filePath: string, workingDirectory: string): Promise<Buffer> {
    const resolved = this.resolvePath(filePath, workingDirectory);
    await this.checkSymlink(resolved, workingDirectory);

    const stats = await fs.stat(resolved);
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${stats.size} bytes (max: ${MAX_FILE_SIZE})`);
    }

    return fs.readFile(resolved);
  }

  /**
   * Write a file
   */
  async writeFile(filePath: string, content: string, workingDirectory: string): Promise<void> {
    const resolved = this.resolvePath(filePath, workingDirectory);
    
    // Ensure parent directory exists
    const parentDir = path.dirname(resolved);
    await fs.mkdir(parentDir, { recursive: true });

    await this.checkSymlink(resolved, workingDirectory);
    await fs.writeFile(resolved, content, 'utf-8');
  }

  /**
   * Write a binary file
   */
  async writeBinaryFile(filePath: string, content: Buffer, workingDirectory: string): Promise<void> {
    const resolved = this.resolvePath(filePath, workingDirectory);
    
    const parentDir = path.dirname(resolved);
    await fs.mkdir(parentDir, { recursive: true });

    await this.checkSymlink(resolved, workingDirectory);
    await fs.writeFile(resolved, content);
  }

  /**
   * Delete a file
   */
  async deleteFile(filePath: string, workingDirectory: string): Promise<void> {
    const resolved = this.resolvePath(filePath, workingDirectory);
    await this.checkSymlink(resolved, workingDirectory);
    await fs.unlink(resolved);
  }

  /**
   * Delete a directory recursively
   */
  async deleteDirectory(dirPath: string, workingDirectory: string): Promise<void> {
    const resolved = this.resolvePath(dirPath, workingDirectory);
    await this.checkSymlink(resolved, workingDirectory);
    await fs.rm(resolved, { recursive: true, force: true });
  }

  /**
   * Create a directory
   */
  async createDirectory(dirPath: string, workingDirectory: string): Promise<void> {
    const resolved = this.resolvePath(dirPath, workingDirectory);
    await fs.mkdir(resolved, { recursive: true });
  }

  /**
   * Rename/move a file or directory
   */
  async rename(oldPath: string, newPath: string, workingDirectory: string): Promise<void> {
    const resolvedOld = this.resolvePath(oldPath, workingDirectory);
    const resolvedNew = this.resolvePath(newPath, workingDirectory);
    
    await this.checkSymlink(resolvedOld, workingDirectory);
    await fs.rename(resolvedOld, resolvedNew);
  }

  /**
   * Copy a file
   */
  async copyFile(srcPath: string, destPath: string, workingDirectory: string): Promise<void> {
    const resolvedSrc = this.resolvePath(srcPath, workingDirectory);
    const resolvedDest = this.resolvePath(destPath, workingDirectory);
    
    await this.checkSymlink(resolvedSrc, workingDirectory);
    
    // Ensure parent directory exists
    const parentDir = path.dirname(resolvedDest);
    await fs.mkdir(parentDir, { recursive: true });
    
    await fs.copyFile(resolvedSrc, resolvedDest);
  }

  /**
   * Check if a file exists
   */
  async exists(filePath: string, workingDirectory: string): Promise<boolean> {
    try {
      const resolved = this.resolvePath(filePath, workingDirectory);
      await fs.access(resolved);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a path is a directory
   */
  async isDirectory(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if a path is a file
   */
  async isFile(filePath: string, workingDirectory: string): Promise<boolean> {
    try {
      const resolved = this.resolvePath(filePath, workingDirectory);
      const stats = await fs.stat(resolved);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Get file stats
   */
  async getStats(filePath: string, workingDirectory: string): Promise<{
    size: number;
    modified: Date;
    created: Date;
    isDirectory: boolean;
    isFile: boolean;
  }> {
    const resolved = this.resolvePath(filePath, workingDirectory);
    const stats = await fs.stat(resolved);

    return {
      size: stats.size,
      modified: stats.mtime,
      created: stats.birthtime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
    };
  }

  /**
   * List directory contents
   */
  async listDirectory(
    dirPath: string, 
    workingDirectory: string,
    options: {
      showHidden?: boolean;
      recursive?: boolean;
      maxDepth?: number;
    } = {}
  ): Promise<FileEntry[]> {
    const resolved = this.resolvePath(dirPath, workingDirectory);
    await this.checkSymlink(resolved, workingDirectory);

    const { showHidden = false, recursive = false, maxDepth = 2 } = options;

    return this.readDirectoryRecursive(
      resolved,
      workingDirectory,
      showHidden,
      recursive,
      maxDepth,
      0
    );
  }

  private async readDirectoryRecursive(
    dirPath: string,
    workingDirectory: string,
    showHidden: boolean,
    recursive: boolean,
    maxDepth: number,
    currentDepth: number
  ): Promise<FileEntry[]> {
    if (currentDepth > MAX_DIRECTORY_DEPTH) {
      throw new Error('Maximum directory depth exceeded');
    }

    const entries: FileEntry[] = [];
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const isHidden = item.name.startsWith('.');
      
      // Skip hidden files if not requested
      if (!showHidden && isHidden) {
        continue;
      }

      // Skip ignored patterns
      if (this.shouldIgnore(item.name)) {
        continue;
      }

      const fullPath = path.join(dirPath, item.name);
      const relativePath = path.relative(workingDirectory, fullPath);

      try {
        const stats = await fs.stat(fullPath);
        
        const entry: FileEntry = {
          name: item.name,
          path: relativePath,
          type: item.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime.toISOString(),
          isHidden,
        };

        entries.push(entry);

        // Recurse into directories if requested
        if (recursive && item.isDirectory() && currentDepth < maxDepth) {
          const children = await this.readDirectoryRecursive(
            fullPath,
            workingDirectory,
            showHidden,
            recursive,
            maxDepth,
            currentDepth + 1
          );
          entries.push(...children);
        }
      } catch {
        // Skip files we can't stat (permission issues, etc.)
      }
    }

    return entries.sort((a, b) => {
      // Directories first, then alphabetically
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Check if a file/directory should be ignored
   */
  private shouldIgnore(name: string): boolean {
    return this.ignorePatterns.some(pattern => {
      if (pattern.includes('*')) {
        // Simple wildcard matching
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(name);
      }
      return name === pattern;
    });
  }

  /**
   * Set ignore patterns
   */
  setIgnorePatterns(patterns: string[]): void {
    this.ignorePatterns = patterns;
  }

  /**
   * Load .gitignore patterns
   */
  async loadGitignore(workingDirectory: string): Promise<void> {
    try {
      const gitignorePath = path.join(workingDirectory, '.gitignore');
      const content = await fs.readFile(gitignorePath, 'utf-8');
      const patterns = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      
      this.ignorePatterns = [...DEFAULT_IGNORE_PATTERNS, ...patterns];
    } catch {
      // No .gitignore, use defaults
      this.ignorePatterns = [...DEFAULT_IGNORE_PATTERNS];
    }
  }

  /**
   * Search for files matching a pattern
   */
  async searchFiles(
    pattern: string,
    workingDirectory: string,
    options: {
      maxResults?: number;
      searchContent?: boolean;
    } = {}
  ): Promise<FileEntry[]> {
    const { maxResults = 100, searchContent = false } = options;
    const results: FileEntry[] = [];
    const regex = new RegExp(pattern, 'i');

    const search = async (dirPath: string, depth: number): Promise<void> => {
      if (results.length >= maxResults || depth > MAX_DIRECTORY_DEPTH) return;

      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        if (results.length >= maxResults) break;

        if (this.shouldIgnore(item.name)) continue;

        const fullPath = path.join(dirPath, item.name);
        const relativePath = path.relative(workingDirectory, fullPath);

        if (item.isDirectory()) {
          await search(fullPath, depth + 1);
        } else {
          // Match filename
          if (regex.test(item.name)) {
            const stats = await fs.stat(fullPath);
            results.push({
              name: item.name,
              path: relativePath,
              type: 'file',
              size: stats.size,
              modified: stats.mtime.toISOString(),
            });
          } else if (searchContent) {
            // Search file content
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              if (regex.test(content)) {
                const stats = await fs.stat(fullPath);
                results.push({
                  name: item.name,
                  path: relativePath,
                  type: 'file',
                  size: stats.size,
                  modified: stats.mtime.toISOString(),
                });
              }
            } catch {
              // Skip binary files or files we can't read
            }
          }
        }
      }
    };

    await search(workingDirectory, 0);
    return results;
  }

  /**
   * Watch a directory for changes
   */
  watchDirectory(
    dirPath: string,
    callback: (event: string, filePath: string) => void
  ): void {
    if (this.watchers.has(dirPath)) {
      return; // Already watching
    }

    const watcher = watch(dirPath, {
      ignored: this.ignorePatterns.map(p => `**/${p}/**`),
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on('all', (event, eventFilePath) => {
      callback(event, eventFilePath);
    });

    this.watchers.set(dirPath, watcher);
  }

  /**
   * Stop watching a directory
   */
  async unwatchDirectory(dirPath: string): Promise<void> {
    const watcher = this.watchers.get(dirPath);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(dirPath);
    }
  }

  /**
   * Stop all watchers
   */
  async unwatchAll(): Promise<void> {
    for (const [, watcher] of this.watchers) {
      await watcher.close();
    }
    this.watchers.clear();
  }

  /**
   * Execute a shell command
   */
  async executeCommand(
    command: string,
    workingDirectory: string,
    options: {
      timeout?: number;
      maxOutput?: number;
    } = {}
  ): Promise<{ stdout: string; stderr: string }> {
    const { timeout = 30000, maxOutput = 1024 * 1024 } = options;

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: workingDirectory,
        timeout,
        maxBuffer: maxOutput,
        env: process.env,
      });

      return { stdout, stderr };
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string; message?: string };
      return {
        stdout: execError.stdout || '',
        stderr: execError.stderr || execError.message || 'Command failed',
      };
    }
  }

  /**
   * Create a backup of a file
   */
  async backupFile(filePath: string, workingDirectory: string): Promise<string> {
    const resolved = this.resolvePath(filePath, workingDirectory);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${resolved}.backup-${timestamp}`;
    
    await fs.copyFile(resolved, backupPath);
    return path.relative(workingDirectory, backupPath);
  }

  /**
   * Get file extension
   */
  getExtension(filePath: string): string {
    return path.extname(filePath).toLowerCase();
  }

  /**
   * Get file type based on extension
   */
  getFileType(filePath: string): string {
    const ext = this.getExtension(filePath);
    const types: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.java': 'java',
      '.c': 'c',
      '.cpp': 'cpp',
      '.h': 'c',
      '.hpp': 'cpp',
      '.css': 'css',
      '.scss': 'scss',
      '.less': 'less',
      '.html': 'html',
      '.htm': 'html',
      '.json': 'json',
      '.md': 'markdown',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.xml': 'xml',
      '.sql': 'sql',
      '.sh': 'shell',
      '.bash': 'shell',
      '.zsh': 'shell',
      '.fish': 'shell',
      '.toml': 'toml',
      '.ini': 'ini',
      '.env': 'env',
    };

    return types[ext] || 'text';
  }
}

// Export singleton instance
export const fileSystemAPI = new FileSystemAPI();
