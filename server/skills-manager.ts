/**
 * Skills Manager - Manages Gemini Agent Skills
 * 
 * Handles discovery, creation, and management of agent skills
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { SkillInfo } from './types.js';

// Default skills directory
const DEFAULT_SKILLS_DIR = path.join(os.homedir(), '.skillz');

interface SkillDefinition {
  name: string;
  description: string;
  instructions: string;
  files: Array<{ name: string; content: string }>;
}

interface SkillMetadata {
  name: string;
  description: string;
  author?: string;
  version?: string;
  tags?: string[];
}

export class SkillsManager {
  private skillsDir: string;
  private cache: Map<string, SkillInfo> = new Map();
  private lastCacheTime: number = 0;
  private cacheTimeout: number = 5000;

  constructor(customDir?: string) {
    this.skillsDir = customDir || DEFAULT_SKILLS_DIR;
  }

  /**
   * Set the skills directory
   */
  setSkillsDirectory(dir: string): void {
    this.skillsDir = dir;
    this.cache.clear();
  }

  /**
   * Get the skills directory
   */
  getSkillsDirectory(): string {
    return this.skillsDir;
  }

  /**
   * Ensure the skills directory exists
   */
  private async ensureDirectory(): Promise<void> {
    await fs.mkdir(this.skillsDir, { recursive: true });
  }

  /**
   * List all available skills
   */
  async listSkills(): Promise<SkillInfo[]> {
    const now = Date.now();
    if (this.cache.size > 0 && (now - this.lastCacheTime) < this.cacheTimeout) {
      return Array.from(this.cache.values());
    }

    await this.ensureDirectory();
    const skills: SkillInfo[] = [];

    try {
      const entries = await fs.readdir(this.skillsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          try {
            const skill = await this.loadSkill(entry.name);
            skills.push(skill);
            this.cache.set(entry.name, skill);
          } catch {
            // Skip invalid skills
            console.warn(`Failed to load skill: ${entry.name}`);
          }
        }
      }

      this.lastCacheTime = now;
      return skills;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Load a specific skill
   */
  async loadSkill(name: string): Promise<SkillInfo> {
    const skillPath = path.join(this.skillsDir, name);
    const skillMdPath = path.join(skillPath, 'SKILL.md');

    // Check if skill exists
    try {
      await fs.access(skillMdPath);
    } catch {
      throw new Error(`Skill "${name}" not found or missing SKILL.md`);
    }

    // Read SKILL.md
    const content = await fs.readFile(skillMdPath, 'utf-8');
    const metadata = this.parseSkillMd(content);

    // Get list of files in skill directory
    const entries = await fs.readdir(skillPath);
    const files = entries.filter(f => f !== 'SKILL.md' && !f.startsWith('.'));

    return {
      id: name,
      name: metadata.name || name,
      description: metadata.description || '',
      path: skillPath,
      files,
    };
  }

  /**
   * Parse SKILL.md frontmatter and content
   */
  private parseSkillMd(content: string): SkillMetadata {
    const metadata: SkillMetadata = { name: '', description: '' };

    // Parse YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const lines = frontmatter.split('\n');

      for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();

        switch (key.trim()) {
          case 'name':
            metadata.name = value;
            break;
          case 'description':
            metadata.description = value;
            break;
          case 'author':
            metadata.author = value;
            break;
          case 'version':
            metadata.version = value;
            break;
          case 'tags':
            metadata.tags = value.split(',').map(t => t.trim());
            break;
        }
      }
    }

    return metadata;
  }

  /**
   * Create a new skill
   */
  async createSkill(definition: SkillDefinition): Promise<SkillInfo> {
    const skillName = this.sanitizeName(definition.name);
    const skillPath = path.join(this.skillsDir, skillName);

    // Check if skill already exists
    try {
      await fs.access(skillPath);
      throw new Error(`Skill "${skillName}" already exists`);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code !== 'ENOENT') {
        throw error;
      }
    }

    // Create skill directory
    await fs.mkdir(skillPath, { recursive: true });

    // Create SKILL.md with frontmatter
    const skillMdContent = `---
name: ${skillName}
description: ${definition.description}
---

${definition.instructions}`;

    await fs.writeFile(
      path.join(skillPath, 'SKILL.md'),
      skillMdContent,
      'utf-8'
    );

    // Create helper files
    for (const file of definition.files) {
      await fs.writeFile(
        path.join(skillPath, file.name),
        file.content,
        'utf-8'
      );
    }

    // Clear cache
    this.cache.delete(skillName);

    return {
      id: skillName,
      name: skillName,
      description: definition.description,
      path: skillPath,
      files: definition.files.map(f => f.name),
    };
  }

  /**
   * Update a skill
   */
  async updateSkill(name: string, updates: Partial<SkillDefinition>): Promise<SkillInfo> {
    const skillPath = path.join(this.skillsDir, name);
    const skillMdPath = path.join(skillPath, 'SKILL.md');

    // Check if skill exists
    try {
      await fs.access(skillMdPath);
    } catch {
      throw new Error(`Skill "${name}" not found`);
    }

    // Read current content
    const currentContent = await fs.readFile(skillMdPath, 'utf-8');
    const currentMetadata = this.parseSkillMd(currentContent);

    // Update SKILL.md if needed
    if (updates.description || updates.instructions) {
      const newDescription = updates.description || currentMetadata.description;
      const newInstructions = updates.instructions || 
        currentContent.replace(/^---[\s\S]*?---\n*/, '').trim();

      const newContent = `---
name: ${name}
description: ${newDescription}
---

${newInstructions}`;

      await fs.writeFile(skillMdPath, newContent, 'utf-8');
    }

    // Update files if needed
    if (updates.files) {
      for (const file of updates.files) {
        await fs.writeFile(
          path.join(skillPath, file.name),
          file.content,
          'utf-8'
        );
      }
    }

    // Clear cache
    this.cache.delete(name);

    return this.loadSkill(name);
  }

  /**
   * Delete a skill
   */
  async deleteSkill(name: string): Promise<void> {
    const skillPath = path.join(this.skillsDir, name);

    // Check if skill exists
    try {
      await fs.access(skillPath);
    } catch {
      throw new Error(`Skill "${name}" not found`);
    }

    // Backup before deleting
    await this.backupSkill(name);

    // Delete the skill directory
    await fs.rm(skillPath, { recursive: true, force: true });

    // Clear cache
    this.cache.delete(name);
  }

  /**
   * Backup a skill
   */
  async backupSkill(name: string): Promise<string> {
    const skillPath = path.join(this.skillsDir, name);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.skillsDir, `.${name}.backup-${timestamp}`);

    await this.copyDirectory(skillPath, backupPath);
    return backupPath;
  }

  /**
   * Copy a directory recursively
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Get skill content (SKILL.md)
   */
  async getSkillContent(name: string): Promise<string> {
    const skillMdPath = path.join(this.skillsDir, name, 'SKILL.md');
    return fs.readFile(skillMdPath, 'utf-8');
  }

  /**
   * Get a skill file content
   */
  async getSkillFile(name: string, fileName: string): Promise<string> {
    const filePath = path.join(this.skillsDir, name, fileName);
    
    // Security check
    const resolved = path.resolve(filePath);
    const skillPath = path.resolve(path.join(this.skillsDir, name));
    if (!resolved.startsWith(skillPath)) {
      throw new Error('Access denied: Path traversal detected');
    }

    return fs.readFile(filePath, 'utf-8');
  }

  /**
   * Add a file to a skill
   */
  async addSkillFile(name: string, fileName: string, content: string): Promise<void> {
    const filePath = path.join(this.skillsDir, name, fileName);
    
    // Security check
    const resolved = path.resolve(filePath);
    const skillPath = path.resolve(path.join(this.skillsDir, name));
    if (!resolved.startsWith(skillPath)) {
      throw new Error('Access denied: Path traversal detected');
    }

    await fs.writeFile(filePath, content, 'utf-8');
    this.cache.delete(name);
  }

  /**
   * Remove a file from a skill
   */
  async removeSkillFile(name: string, fileName: string): Promise<void> {
    const filePath = path.join(this.skillsDir, name, fileName);
    
    // Don't allow removing SKILL.md
    if (fileName === 'SKILL.md') {
      throw new Error('Cannot remove SKILL.md');
    }

    // Security check
    const resolved = path.resolve(filePath);
    const skillPath = path.resolve(path.join(this.skillsDir, name));
    if (!resolved.startsWith(skillPath)) {
      throw new Error('Access denied: Path traversal detected');
    }

    await fs.unlink(filePath);
    this.cache.delete(name);
  }

  /**
   * Rename a skill
   */
  async renameSkill(oldName: string, newName: string): Promise<SkillInfo> {
    const sanitizedNew = this.sanitizeName(newName);
    const oldPath = path.join(this.skillsDir, oldName);
    const newPath = path.join(this.skillsDir, sanitizedNew);

    // Check if old skill exists
    try {
      await fs.access(oldPath);
    } catch {
      throw new Error(`Skill "${oldName}" not found`);
    }

    // Check if new name is taken
    try {
      await fs.access(newPath);
      throw new Error(`Skill "${sanitizedNew}" already exists`);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code !== 'ENOENT') {
        throw error;
      }
    }

    // Update SKILL.md with new name
    const skillMdPath = path.join(oldPath, 'SKILL.md');
    let content = await fs.readFile(skillMdPath, 'utf-8');
    content = content.replace(/^(---[\s\S]*?name:)\s*\S+/m, `$1 ${sanitizedNew}`);
    await fs.writeFile(skillMdPath, content, 'utf-8');

    // Rename directory
    await fs.rename(oldPath, newPath);

    // Clear cache
    this.cache.delete(oldName);
    this.cache.delete(sanitizedNew);

    return this.loadSkill(sanitizedNew);
  }

  /**
   * Duplicate a skill
   */
  async duplicateSkill(name: string, newName: string): Promise<SkillInfo> {
    const sanitizedNew = this.sanitizeName(newName);
    const srcPath = path.join(this.skillsDir, name);
    const destPath = path.join(this.skillsDir, sanitizedNew);

    // Check if source exists
    try {
      await fs.access(srcPath);
    } catch {
      throw new Error(`Skill "${name}" not found`);
    }

    // Check if destination exists
    try {
      await fs.access(destPath);
      throw new Error(`Skill "${sanitizedNew}" already exists`);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code !== 'ENOENT') {
        throw error;
      }
    }

    // Copy directory
    await this.copyDirectory(srcPath, destPath);

    // Update name in SKILL.md
    const skillMdPath = path.join(destPath, 'SKILL.md');
    let content = await fs.readFile(skillMdPath, 'utf-8');
    content = content.replace(/^(---[\s\S]*?name:)\s*\S+/m, `$1 ${sanitizedNew}`);
    await fs.writeFile(skillMdPath, content, 'utf-8');

    return this.loadSkill(sanitizedNew);
  }

  /**
   * Import a skill from a path
   */
  async importSkill(sourcePath: string): Promise<SkillInfo> {
    const skillMdPath = path.join(sourcePath, 'SKILL.md');

    // Verify it's a valid skill
    try {
      await fs.access(skillMdPath);
    } catch {
      throw new Error('Invalid skill: missing SKILL.md');
    }

    // Get skill name from SKILL.md
    const content = await fs.readFile(skillMdPath, 'utf-8');
    const metadata = this.parseSkillMd(content);
    const name = metadata.name || path.basename(sourcePath);
    const sanitized = this.sanitizeName(name);

    const destPath = path.join(this.skillsDir, sanitized);

    // Check if skill already exists
    try {
      await fs.access(destPath);
      throw new Error(`Skill "${sanitized}" already exists`);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code !== 'ENOENT') {
        throw error;
      }
    }

    // Copy skill
    await this.copyDirectory(sourcePath, destPath);

    return this.loadSkill(sanitized);
  }

  /**
   * Export a skill to a path
   */
  async exportSkill(name: string, destPath: string): Promise<void> {
    const srcPath = path.join(this.skillsDir, name);

    // Check if skill exists
    try {
      await fs.access(srcPath);
    } catch {
      throw new Error(`Skill "${name}" not found`);
    }

    await this.copyDirectory(srcPath, destPath);
  }

  /**
   * Search skills by name or description
   */
  async searchSkills(query: string): Promise<SkillInfo[]> {
    const skills = await this.listSkills();
    const lowerQuery = query.toLowerCase();

    return skills.filter(skill =>
      skill.name.toLowerCase().includes(lowerQuery) ||
      skill.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Sanitize skill name to be a valid directory name
   */
  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    this.lastCacheTime = 0;
  }

  /**
   * Get skill count
   */
  async getSkillCount(): Promise<number> {
    const skills = await this.listSkills();
    return skills.length;
  }

  /**
   * Validate skill structure
   */
  async validateSkill(name: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const skillPath = path.join(this.skillsDir, name);

    try {
      await fs.access(skillPath);
    } catch {
      return { valid: false, errors: ['Skill directory not found'] };
    }

    // Check SKILL.md exists
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    try {
      await fs.access(skillMdPath);
    } catch {
      errors.push('SKILL.md not found');
    }

    // Validate SKILL.md content
    try {
      const content = await fs.readFile(skillMdPath, 'utf-8');
      const metadata = this.parseSkillMd(content);

      if (!metadata.name) {
        errors.push('Missing name in SKILL.md frontmatter');
      }
      if (!metadata.description) {
        errors.push('Missing description in SKILL.md frontmatter');
      }
    } catch {
      errors.push('Could not read SKILL.md');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const skillsManager = new SkillsManager();
