/**
 * Git Manager - Git integration for project management
 * 
 * Provides git operations like status, diff, stage, unstage, commit
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

export interface GitStatus {
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  untracked: string[];
  branch: string;
  ahead: number;
  behind: number;
  hasConflicts: boolean;
  isClean: boolean;
}

export interface GitFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'unmerged';
  oldPath?: string; // For renamed files
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  body?: string;
}

export interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
  tracking?: string;
  ahead?: number;
  behind?: number;
}

export interface GitDiff {
  filePath: string;
  additions: number;
  deletions: number;
  hunks: GitDiffHunk[];
}

export interface GitDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}

export interface GitStash {
  index: number;
  message: string;
  branch: string;
  date: Date;
}

export class GitManager {
  private workingDirectory: string;

  constructor(workingDirectory: string = process.cwd()) {
    this.workingDirectory = workingDirectory;
  }

  /**
   * Set working directory
   */
  setWorkingDirectory(dir: string): void {
    this.workingDirectory = dir;
  }

  /**
   * Execute git command
   */
  private async exec(args: string[], options: { maxBuffer?: number } = {}): Promise<string> {
    const { stdout } = await execAsync(`git ${args.join(' ')}`, {
      cwd: this.workingDirectory,
      maxBuffer: options.maxBuffer || 10 * 1024 * 1024, // 10MB
    });
    return stdout.trim();
  }

  /**
   * Check if directory is a git repository
   */
  async isGitRepository(): Promise<boolean> {
    try {
      await this.exec(['rev-parse', '--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize a new git repository
   */
  async init(): Promise<void> {
    await this.exec(['init']);
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    try {
      return await this.exec(['branch', '--show-current']);
    } catch {
      return 'HEAD'; // Detached HEAD state
    }
  }

  /**
   * Get git status
   */
  async getStatus(): Promise<GitStatus> {
    const isRepo = await this.isGitRepository();
    if (!isRepo) {
      throw new Error('Not a git repository');
    }

    const staged: GitFileChange[] = [];
    const unstaged: GitFileChange[] = [];
    const untracked: string[] = [];

    // Get porcelain status
    const statusOutput = await this.exec(['status', '--porcelain=v1', '-z']);
    const entries = statusOutput.split('\0').filter(Boolean);

    for (const entry of entries) {
      if (entry.length < 3) continue;

      const indexStatus = entry[0];
      const workingStatus = entry[1];
      const filePath = entry.substring(3);

      // Handle staged changes (index)
      if (indexStatus !== ' ' && indexStatus !== '?') {
        staged.push({
          path: filePath,
          status: this.parseStatusCode(indexStatus),
        });
      }

      // Handle unstaged changes (working tree)
      if (workingStatus !== ' ' && workingStatus !== '?') {
        unstaged.push({
          path: filePath,
          status: this.parseStatusCode(workingStatus),
        });
      }

      // Handle untracked files
      if (indexStatus === '?' && workingStatus === '?') {
        untracked.push(filePath);
      }
    }

    // Get branch info
    const branch = await this.getCurrentBranch();
    const { ahead, behind } = await this.getAheadBehind();
    const hasConflicts = staged.some(f => f.status === 'unmerged') || 
                         unstaged.some(f => f.status === 'unmerged');
    const isClean = staged.length === 0 && unstaged.length === 0 && untracked.length === 0;

    return {
      staged,
      unstaged,
      untracked,
      branch,
      ahead,
      behind,
      hasConflicts,
      isClean,
    };
  }

  /**
   * Parse git status code to change type
   */
  private parseStatusCode(code: string): GitFileChange['status'] {
    switch (code) {
      case 'A': return 'added';
      case 'M': return 'modified';
      case 'D': return 'deleted';
      case 'R': return 'renamed';
      case 'C': return 'copied';
      case 'U': return 'unmerged';
      default: return 'modified';
    }
  }

  /**
   * Get ahead/behind count from upstream
   */
  private async getAheadBehind(): Promise<{ ahead: number; behind: number }> {
    try {
      const output = await this.exec(['rev-list', '--left-right', '--count', '@{upstream}...HEAD']);
      const [behind, ahead] = output.split('\t').map(Number);
      return { ahead: ahead || 0, behind: behind || 0 };
    } catch {
      return { ahead: 0, behind: 0 };
    }
  }

  /**
   * Stage files
   */
  async stage(files: string[]): Promise<void> {
    if (files.length === 0) return;
    await this.exec(['add', '--', ...files]);
  }

  /**
   * Stage all changes
   */
  async stageAll(): Promise<void> {
    await this.exec(['add', '-A']);
  }

  /**
   * Unstage files
   */
  async unstage(files: string[]): Promise<void> {
    if (files.length === 0) return;
    await this.exec(['reset', 'HEAD', '--', ...files]);
  }

  /**
   * Unstage all files
   */
  async unstageAll(): Promise<void> {
    await this.exec(['reset', 'HEAD']);
  }

  /**
   * Discard changes in working directory
   */
  async discardChanges(files: string[]): Promise<void> {
    if (files.length === 0) return;
    await this.exec(['checkout', '--', ...files]);
  }

  /**
   * Get diff for a file
   */
  async getDiff(filePath?: string, staged: boolean = false): Promise<string> {
    const args = ['diff'];
    if (staged) args.push('--cached');
    if (filePath) args.push('--', filePath);
    return this.exec(args);
  }

  /**
   * Get parsed diff
   */
  async getParsedDiff(filePath?: string, staged: boolean = false): Promise<GitDiff[]> {
    const args = ['diff', '--numstat'];
    if (staged) args.push('--cached');
    if (filePath) args.push('--', filePath);

    const numstatOutput = await this.exec(args);
    const diffs: GitDiff[] = [];

    const lines = numstatOutput.split('\n').filter(Boolean);
    for (const line of lines) {
      const [additions, deletions, path] = line.split('\t');
      diffs.push({
        filePath: path,
        additions: additions === '-' ? 0 : parseInt(additions, 10),
        deletions: deletions === '-' ? 0 : parseInt(deletions, 10),
        hunks: [], // Simplified - full hunk parsing would be more complex
      });
    }

    return diffs;
  }

  /**
   * Commit staged changes
   */
  async commit(message: string, options: { amend?: boolean; allowEmpty?: boolean } = {}): Promise<string> {
    const args = ['commit', '-m', message];
    if (options.amend) args.push('--amend');
    if (options.allowEmpty) args.push('--allow-empty');

    const output = await this.exec(args);
    // Extract commit hash from output
    const match = output.match(/\[[\w-]+ ([a-f0-9]+)\]/);
    return match ? match[1] : '';
  }

  /**
   * Get commit log
   */
  async getLog(limit: number = 50, filePath?: string): Promise<GitCommit[]> {
    const format = '%H%x00%h%x00%an%x00%ae%x00%at%x00%s%x00%b%x00';
    const args = ['log', `--format=${format}`, `-n${limit}`];
    if (filePath) args.push('--', filePath);

    const output = await this.exec(args);
    const commits: GitCommit[] = [];

    const entries = output.split('%x00\n').filter(Boolean);
    for (const entry of entries) {
      const parts = entry.split('%x00');
      if (parts.length >= 6) {
        commits.push({
          hash: parts[0],
          shortHash: parts[1],
          author: parts[2],
          email: parts[3],
          date: new Date(parseInt(parts[4], 10) * 1000),
          message: parts[5],
          body: parts[6] || undefined,
        });
      }
    }

    return commits;
  }

  /**
   * Get list of branches
   */
  async getBranches(): Promise<GitBranch[]> {
    const output = await this.exec(['branch', '-vv', '--format=%(HEAD)%00%(refname:short)%00%(upstream:short)%00%(upstream:track)']);
    const branches: GitBranch[] = [];

    const lines = output.split('\n').filter(Boolean);
    for (const line of lines) {
      const [head, name, upstream, track] = line.split('\0');
      const current = head === '*';

      let ahead = 0;
      let behind = 0;
      if (track) {
        const aheadMatch = track.match(/ahead (\d+)/);
        const behindMatch = track.match(/behind (\d+)/);
        if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);
        if (behindMatch) behind = parseInt(behindMatch[1], 10);
      }

      branches.push({
        name,
        current,
        tracking: upstream || undefined,
        ahead,
        behind,
      });
    }

    return branches;
  }

  /**
   * Create a new branch
   */
  async createBranch(name: string, startPoint?: string): Promise<void> {
    const args = ['checkout', '-b', name];
    if (startPoint) args.push(startPoint);
    await this.exec(args);
  }

  /**
   * Switch to a branch
   */
  async switchBranch(name: string): Promise<void> {
    await this.exec(['checkout', name]);
  }

  /**
   * Delete a branch
   */
  async deleteBranch(name: string, force: boolean = false): Promise<void> {
    const flag = force ? '-D' : '-d';
    await this.exec(['branch', flag, name]);
  }

  /**
   * Merge a branch
   */
  async merge(branch: string, options: { noCommit?: boolean; squash?: boolean } = {}): Promise<void> {
    const args = ['merge', branch];
    if (options.noCommit) args.push('--no-commit');
    if (options.squash) args.push('--squash');
    await this.exec(args);
  }

  /**
   * Abort a merge
   */
  async abortMerge(): Promise<void> {
    await this.exec(['merge', '--abort']);
  }

  /**
   * Pull from remote
   */
  async pull(remote: string = 'origin', branch?: string): Promise<string> {
    const args = ['pull', remote];
    if (branch) args.push(branch);
    return this.exec(args);
  }

  /**
   * Push to remote
   */
  async push(remote: string = 'origin', branch?: string, options: { force?: boolean; setUpstream?: boolean } = {}): Promise<string> {
    const args = ['push', remote];
    if (branch) args.push(branch);
    if (options.force) args.push('--force');
    if (options.setUpstream) args.push('--set-upstream');
    return this.exec(args);
  }

  /**
   * Fetch from remote
   */
  async fetch(remote: string = 'origin', options: { all?: boolean; prune?: boolean } = {}): Promise<void> {
    const args = ['fetch'];
    if (options.all) {
      args.push('--all');
    } else {
      args.push(remote);
    }
    if (options.prune) args.push('--prune');
    await this.exec(args);
  }

  /**
   * Get stash list
   */
  async getStashes(): Promise<GitStash[]> {
    try {
      const output = await this.exec(['stash', 'list', '--format=%gd%x00%s%x00%ar']);
      const stashes: GitStash[] = [];

      const lines = output.split('\n').filter(Boolean);
      for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split('\0');
        if (parts.length >= 2) {
          stashes.push({
            index: i,
            message: parts[1],
            branch: '', // Would need additional parsing
            date: new Date(),
          });
        }
      }

      return stashes;
    } catch {
      return [];
    }
  }

  /**
   * Create a stash
   */
  async stash(message?: string, options: { includeUntracked?: boolean } = {}): Promise<void> {
    const args = ['stash', 'push'];
    if (message) args.push('-m', message);
    if (options.includeUntracked) args.push('-u');
    await this.exec(args);
  }

  /**
   * Pop a stash
   */
  async stashPop(index: number = 0): Promise<void> {
    await this.exec(['stash', 'pop', `stash@{${index}}`]);
  }

  /**
   * Apply a stash
   */
  async stashApply(index: number = 0): Promise<void> {
    await this.exec(['stash', 'apply', `stash@{${index}}`]);
  }

  /**
   * Drop a stash
   */
  async stashDrop(index: number = 0): Promise<void> {
    await this.exec(['stash', 'drop', `stash@{${index}}`]);
  }

  /**
   * Get file content at a specific commit
   */
  async showFile(filePath: string, ref: string = 'HEAD'): Promise<string> {
    return this.exec(['show', `${ref}:${filePath}`]);
  }

  /**
   * Get remotes
   */
  async getRemotes(): Promise<{ name: string; url: string; type: 'fetch' | 'push' }[]> {
    const output = await this.exec(['remote', '-v']);
    const remotes: { name: string; url: string; type: 'fetch' | 'push' }[] = [];

    const lines = output.split('\n').filter(Boolean);
    for (const line of lines) {
      const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
      if (match) {
        remotes.push({
          name: match[1],
          url: match[2],
          type: match[3] as 'fetch' | 'push',
        });
      }
    }

    return remotes;
  }

  /**
   * Add a remote
   */
  async addRemote(name: string, url: string): Promise<void> {
    await this.exec(['remote', 'add', name, url]);
  }

  /**
   * Remove a remote
   */
  async removeRemote(name: string): Promise<void> {
    await this.exec(['remote', 'remove', name]);
  }

  /**
   * Get blame for a file
   */
  async getBlame(filePath: string): Promise<string> {
    return this.exec(['blame', '--porcelain', filePath]);
  }

  /**
   * Reset to a specific commit
   */
  async reset(ref: string, mode: 'soft' | 'mixed' | 'hard' = 'mixed'): Promise<void> {
    await this.exec(['reset', `--${mode}`, ref]);
  }

  /**
   * Revert a commit
   */
  async revert(commitHash: string, options: { noCommit?: boolean } = {}): Promise<void> {
    const args = ['revert', commitHash];
    if (options.noCommit) args.push('--no-commit');
    await this.exec(args);
  }

  /**
   * Cherry-pick a commit
   */
  async cherryPick(commitHash: string, options: { noCommit?: boolean } = {}): Promise<void> {
    const args = ['cherry-pick', commitHash];
    if (options.noCommit) args.push('--no-commit');
    await this.exec(args);
  }

  /**
   * Get tags
   */
  async getTags(): Promise<string[]> {
    const output = await this.exec(['tag', '-l']);
    return output.split('\n').filter(Boolean);
  }

  /**
   * Create a tag
   */
  async createTag(name: string, message?: string, ref?: string): Promise<void> {
    const args = ['tag'];
    if (message) {
      args.push('-a', name, '-m', message);
    } else {
      args.push(name);
    }
    if (ref) args.push(ref);
    await this.exec(args);
  }

  /**
   * Delete a tag
   */
  async deleteTag(name: string): Promise<void> {
    await this.exec(['tag', '-d', name]);
  }

  /**
   * Check if there are merge conflicts
   */
  async hasConflicts(): Promise<boolean> {
    try {
      const output = await this.exec(['diff', '--name-only', '--diff-filter=U']);
      return output.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get conflicted files
   */
  async getConflictedFiles(): Promise<string[]> {
    try {
      const output = await this.exec(['diff', '--name-only', '--diff-filter=U']);
      return output.split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }
}

// Export singleton instance
export const gitManager = new GitManager();
