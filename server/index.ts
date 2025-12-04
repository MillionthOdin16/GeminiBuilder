/**
 * GeminiBuilder Server - Main Express Application
 * 
 * Enterprise-grade backend for Gemini CLI web interface
 */

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import dotenv from 'dotenv';

import { wsHandler } from './websocket-handler.js';
import { processManager } from './process-manager.js';
import { fileSystemAPI } from './file-system-api.js';
import { settingsManager } from './settings-manager.js';
import { mcpServerManager } from './mcp-server-manager.js';
import { skillsManager } from './skills-manager.js';
import { gitManager } from './git-manager.js';
import { extensionsManager } from './extensions-manager.js';
import { projectManager } from './project-manager.js';
import { conversationManager } from './conversation-manager.js';
import { authManager, authMiddleware } from './auth-manager.js';
import { rateLimiters } from './rate-limiter.js';

// Load environment variables
dotenv.config();

// Configuration
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || 'localhost';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/', rateLimiters.general.middleware());
app.use('/api/auth/', rateLimiters.auth.middleware());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Initialize managers
(async () => {
  await authManager.init();
  await extensionsManager.init();
  await projectManager.init();
  await conversationManager.init();
})();

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Settings API
app.get('/api/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await settingsManager.getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

app.put('/api/settings', async (req: Request, res: Response) => {
  try {
    const updated = await settingsManager.updateSettings(req.body);
    res.json(updated);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update settings';
    res.status(400).json({ error: errorMessage });
  }
});

app.post('/api/settings/reset', async (_req: Request, res: Response) => {
  try {
    const settings = await settingsManager.resetSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset settings' });
  }
});

app.get('/api/settings/models', (_req: Request, res: Response) => {
  res.json(settingsManager.getAvailableModels());
});

// MCP Servers API
app.get('/api/mcp/servers', async (_req: Request, res: Response) => {
  try {
    const servers = await mcpServerManager.listServers();
    res.json(servers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list MCP servers' });
  }
});

app.post('/api/mcp/servers', async (req: Request, res: Response) => {
  try {
    const { name, config } = req.body;
    if (!name || !config) {
      return res.status(400).json({ error: 'Missing name or config' });
    }
    await mcpServerManager.addServer(name, config);
    res.json({ success: true, name });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to add MCP server';
    res.status(400).json({ error: errorMessage });
  }
});

app.delete('/api/mcp/servers/:name', async (req: Request, res: Response) => {
  try {
    await mcpServerManager.removeServer(req.params.name);
    res.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to remove MCP server';
    res.status(400).json({ error: errorMessage });
  }
});

app.post('/api/mcp/servers/:name/start', async (req: Request, res: Response) => {
  try {
    const success = await mcpServerManager.startServer(req.params.name);
    res.json({ success });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to start MCP server';
    res.status(400).json({ error: errorMessage });
  }
});

app.post('/api/mcp/servers/:name/stop', async (req: Request, res: Response) => {
  try {
    await mcpServerManager.stopServer(req.params.name);
    res.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to stop MCP server';
    res.status(400).json({ error: errorMessage });
  }
});

app.post('/api/mcp/servers/:name/test', async (req: Request, res: Response) => {
  try {
    const result = await mcpServerManager.testConnection(req.params.name);
    res.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to test connection';
    res.status(400).json({ error: errorMessage });
  }
});

app.get('/api/mcp/tools', async (_req: Request, res: Response) => {
  try {
    const tools = await mcpServerManager.listTools();
    res.json(tools);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list MCP tools' });
  }
});

app.get('/api/mcp/discover', async (_req: Request, res: Response) => {
  try {
    const discovered = await mcpServerManager.discoverServers();
    res.json(discovered);
  } catch (error) {
    res.status(500).json({ error: 'Failed to discover MCP servers' });
  }
});

// Skills API
app.get('/api/skills', async (_req: Request, res: Response) => {
  try {
    const skills = await skillsManager.listSkills();
    res.json(skills);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list skills' });
  }
});

app.get('/api/skills/:name', async (req: Request, res: Response) => {
  try {
    const skill = await skillsManager.loadSkill(req.params.name);
    res.json(skill);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Skill not found';
    res.status(404).json({ error: errorMessage });
  }
});

app.get('/api/skills/:name/content', async (req: Request, res: Response) => {
  try {
    const content = await skillsManager.getSkillContent(req.params.name);
    res.json({ content });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get skill content';
    res.status(404).json({ error: errorMessage });
  }
});

app.post('/api/skills', async (req: Request, res: Response) => {
  try {
    const skill = await skillsManager.createSkill(req.body);
    res.json(skill);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create skill';
    res.status(400).json({ error: errorMessage });
  }
});

app.put('/api/skills/:name', async (req: Request, res: Response) => {
  try {
    const skill = await skillsManager.updateSkill(req.params.name, req.body);
    res.json(skill);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update skill';
    res.status(400).json({ error: errorMessage });
  }
});

app.delete('/api/skills/:name', async (req: Request, res: Response) => {
  try {
    await skillsManager.deleteSkill(req.params.name);
    res.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete skill';
    res.status(400).json({ error: errorMessage });
  }
});

app.post('/api/skills/:name/duplicate', async (req: Request, res: Response) => {
  try {
    const { newName } = req.body;
    if (!newName) {
      return res.status(400).json({ error: 'Missing newName' });
    }
    const skill = await skillsManager.duplicateSkill(req.params.name, newName);
    res.json(skill);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to duplicate skill';
    res.status(400).json({ error: errorMessage });
  }
});

app.get('/api/skills/:name/validate', async (req: Request, res: Response) => {
  try {
    const result = await skillsManager.validateSkill(req.params.name);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: 'Failed to validate skill' });
  }
});

// Files API
app.get('/api/files', async (req: Request, res: Response) => {
  try {
    const dirPath = (req.query.path as string) || '.';
    const workingDir = (req.query.workingDir as string) || process.cwd();
    const showHidden = req.query.showHidden === 'true';
    
    const entries = await fileSystemAPI.listDirectory(dirPath, workingDir, { showHidden });
    res.json(entries);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to list directory';
    res.status(400).json({ error: errorMessage });
  }
});

app.get('/api/files/read', async (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;
    const workingDir = (req.query.workingDir as string) || process.cwd();
    
    if (!filePath) {
      return res.status(400).json({ error: 'Missing path parameter' });
    }
    
    const content = await fileSystemAPI.readFile(filePath, workingDir);
    res.json({ path: filePath, content });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to read file';
    res.status(400).json({ error: errorMessage });
  }
});

app.post('/api/files/write', async (req: Request, res: Response) => {
  try {
    const { path: filePath, content, workingDir } = req.body;
    
    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'Missing path or content' });
    }
    
    await fileSystemAPI.writeFile(filePath, content, workingDir || process.cwd());
    res.json({ success: true, path: filePath });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to write file';
    res.status(400).json({ error: errorMessage });
  }
});

app.delete('/api/files', async (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;
    const workingDir = (req.query.workingDir as string) || process.cwd();
    
    if (!filePath) {
      return res.status(400).json({ error: 'Missing path parameter' });
    }
    
    await fileSystemAPI.deleteFile(filePath, workingDir);
    res.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete file';
    res.status(400).json({ error: errorMessage });
  }
});

app.post('/api/files/mkdir', async (req: Request, res: Response) => {
  try {
    const { path: dirPath, workingDir } = req.body;
    
    if (!dirPath) {
      return res.status(400).json({ error: 'Missing path' });
    }
    
    await fileSystemAPI.createDirectory(dirPath, workingDir || process.cwd());
    res.json({ success: true, path: dirPath });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create directory';
    res.status(400).json({ error: errorMessage });
  }
});

app.post('/api/files/search', async (req: Request, res: Response) => {
  try {
    const { pattern, workingDir, searchContent, maxResults } = req.body;
    
    if (!pattern) {
      return res.status(400).json({ error: 'Missing search pattern' });
    }
    
    const results = await fileSystemAPI.searchFiles(pattern, workingDir || process.cwd(), {
      searchContent,
      maxResults,
    });
    res.json(results);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Search failed';
    res.status(400).json({ error: errorMessage });
  }
});

// Terminal/Command API
app.post('/api/terminal/exec', async (req: Request, res: Response) => {
  try {
    const { command, workingDir, timeout } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Missing command' });
    }
    
    const result = await fileSystemAPI.executeCommand(
      command,
      workingDir || process.cwd(),
      { timeout }
    );
    res.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Command execution failed';
    res.status(400).json({ error: errorMessage });
  }
});

// Sessions API
app.get('/api/sessions', (_req: Request, res: Response) => {
  try {
    const sessions = wsHandler.getActiveSessions();
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

app.get('/api/sessions/:id', (req: Request, res: Response) => {
  try {
    const session = wsHandler.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// CLI Process API
app.get('/api/cli/status', (req: Request, res: Response) => {
  try {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }
    
    const info = processManager.getProcessInfo(sessionId);
    const running = processManager.isRunning(sessionId);
    
    res.json({
      running,
      ...info,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get CLI status' });
  }
});

app.get('/api/cli/active', (_req: Request, res: Response) => {
  try {
    const sessions = processManager.getActiveSessions();
    res.json({ count: sessions.length, sessions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get active CLI sessions' });
  }
});

// ============================================
// Git API
// ============================================

app.get('/api/git/status', async (req: Request, res: Response) => {
  try {
    const cwd = req.query.cwd as string || process.cwd();
    gitManager.setWorkingDirectory(cwd);
    const status = await gitManager.getStatus();
    res.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get git status';
    res.status(500).json({ error: message });
  }
});

app.get('/api/git/branches', async (req: Request, res: Response) => {
  try {
    const cwd = req.query.cwd as string || process.cwd();
    gitManager.setWorkingDirectory(cwd);
    const branches = await gitManager.getBranches();
    res.json({ branches });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get branches';
    res.status(500).json({ error: message });
  }
});

app.get('/api/git/log', async (req: Request, res: Response) => {
  try {
    const cwd = req.query.cwd as string || process.cwd();
    const limit = parseInt(req.query.limit as string || '50', 10);
    gitManager.setWorkingDirectory(cwd);
    const commits = await gitManager.getLog(limit);
    res.json({ commits });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get log';
    res.status(500).json({ error: message });
  }
});

app.post('/api/git/stage', async (req: Request, res: Response) => {
  try {
    const { files, cwd } = req.body;
    gitManager.setWorkingDirectory(cwd || process.cwd());
    await gitManager.stage(files);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to stage files';
    res.status(500).json({ error: message });
  }
});

app.post('/api/git/unstage', async (req: Request, res: Response) => {
  try {
    const { files, cwd } = req.body;
    gitManager.setWorkingDirectory(cwd || process.cwd());
    await gitManager.unstage(files);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to unstage files';
    res.status(500).json({ error: message });
  }
});

app.post('/api/git/commit', async (req: Request, res: Response) => {
  try {
    const { message, cwd, amend } = req.body;
    gitManager.setWorkingDirectory(cwd || process.cwd());
    const hash = await gitManager.commit(message, { amend });
    res.json({ success: true, hash });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to commit';
    res.status(500).json({ error: msg });
  }
});

app.post('/api/git/push', async (req: Request, res: Response) => {
  try {
    const { remote, branch, cwd, force } = req.body;
    gitManager.setWorkingDirectory(cwd || process.cwd());
    const result = await gitManager.push(remote, branch, { force });
    res.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to push';
    res.status(500).json({ error: message });
  }
});

app.post('/api/git/pull', async (req: Request, res: Response) => {
  try {
    const { remote, branch, cwd } = req.body;
    gitManager.setWorkingDirectory(cwd || process.cwd());
    const result = await gitManager.pull(remote, branch);
    res.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to pull';
    res.status(500).json({ error: message });
  }
});

app.get('/api/git/diff', async (req: Request, res: Response) => {
  try {
    const cwd = req.query.cwd as string || process.cwd();
    const file = req.query.file as string;
    const staged = req.query.staged === 'true';
    gitManager.setWorkingDirectory(cwd);
    const diff = await gitManager.getDiff(file, staged);
    res.json({ diff });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get diff';
    res.status(500).json({ error: message });
  }
});

app.post('/api/git/checkout', async (req: Request, res: Response) => {
  try {
    const { branch, cwd } = req.body;
    gitManager.setWorkingDirectory(cwd || process.cwd());
    await gitManager.switchBranch(branch);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to checkout';
    res.status(500).json({ error: message });
  }
});

app.post('/api/git/branch', async (req: Request, res: Response) => {
  try {
    const { name, startPoint, cwd } = req.body;
    gitManager.setWorkingDirectory(cwd || process.cwd());
    await gitManager.createBranch(name, startPoint);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create branch';
    res.status(500).json({ error: message });
  }
});

app.get('/api/git/stash', async (req: Request, res: Response) => {
  try {
    const cwd = req.query.cwd as string || process.cwd();
    gitManager.setWorkingDirectory(cwd);
    const stashes = await gitManager.getStashes();
    res.json({ stashes });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get stashes';
    res.status(500).json({ error: message });
  }
});

app.post('/api/git/stash', async (req: Request, res: Response) => {
  try {
    const { message, cwd, includeUntracked } = req.body;
    gitManager.setWorkingDirectory(cwd || process.cwd());
    await gitManager.stash(message, { includeUntracked });
    res.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to stash';
    res.status(500).json({ error: msg });
  }
});

app.post('/api/git/stash/pop', async (req: Request, res: Response) => {
  try {
    const { index, cwd } = req.body;
    gitManager.setWorkingDirectory(cwd || process.cwd());
    await gitManager.stashPop(index || 0);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to pop stash';
    res.status(500).json({ error: message });
  }
});

// ============================================
// Extensions API
// ============================================

app.get('/api/extensions', async (_req: Request, res: Response) => {
  try {
    const installed = await extensionsManager.listInstalled();
    res.json({ extensions: installed });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list extensions';
    res.status(500).json({ error: message });
  }
});

app.get('/api/extensions/registry', async (_req: Request, res: Response) => {
  try {
    const registry = await extensionsManager.fetchRegistry();
    res.json({ extensions: registry });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch registry';
    res.status(500).json({ error: message });
  }
});

app.get('/api/extensions/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string || '';
    const results = await extensionsManager.searchExtensions(query);
    res.json({ extensions: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search extensions';
    res.status(500).json({ error: message });
  }
});

app.post('/api/extensions/install', async (req: Request, res: Response) => {
  try {
    const { extensionId, repoUrl } = req.body;
    await extensionsManager.install(extensionId, repoUrl);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to install extension';
    res.status(500).json({ error: message });
  }
});

app.delete('/api/extensions/:id', async (req: Request, res: Response) => {
  try {
    await extensionsManager.uninstall(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to uninstall extension';
    res.status(500).json({ error: message });
  }
});

app.post('/api/extensions/:id/enable', async (req: Request, res: Response) => {
  try {
    await extensionsManager.enable(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to enable extension';
    res.status(500).json({ error: message });
  }
});

app.post('/api/extensions/:id/disable', async (req: Request, res: Response) => {
  try {
    await extensionsManager.disable(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to disable extension';
    res.status(500).json({ error: message });
  }
});

// ============================================
// Projects API
// ============================================

app.get('/api/projects/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string || '10', 10);
    const projects = await projectManager.getRecentProjects(limit);
    res.json({ projects });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get recent projects';
    res.status(500).json({ error: message });
  }
});

app.get('/api/projects/current', (_req: Request, res: Response) => {
  try {
    const project = projectManager.getCurrentProject();
    res.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get current project';
    res.status(500).json({ error: message });
  }
});

app.post('/api/projects/switch', async (req: Request, res: Response) => {
  try {
    const { path } = req.body;
    const project = await projectManager.switchProject(path);
    res.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to switch project';
    res.status(500).json({ error: message });
  }
});

app.post('/api/projects', async (req: Request, res: Response) => {
  try {
    const { path, name, template, gitInit } = req.body;
    const project = await projectManager.initializeProject(path, { name, template, gitInit });
    res.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create project';
    res.status(500).json({ error: message });
  }
});

app.post('/api/projects/browse', async (req: Request, res: Response) => {
  try {
    const { path } = req.body;
    const projects = await projectManager.listProjectsInDirectory(path);
    res.json({ projects });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to browse projects';
    res.status(500).json({ error: message });
  }
});

app.get('/api/projects/:path/stats', async (req: Request, res: Response) => {
  try {
    const projectPath = Buffer.from(req.params.path, 'base64').toString();
    const stats = await projectManager.getProjectStats(projectPath);
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get project stats';
    res.status(500).json({ error: message });
  }
});

// ============================================
// Conversations API
// ============================================

app.get('/api/conversations', async (req: Request, res: Response) => {
  try {
    const filter = {
      projectPath: req.query.projectPath as string,
      starred: req.query.starred === 'true' ? true : undefined,
      archived: req.query.archived === 'true' ? true : req.query.archived === 'false' ? false : undefined,
      search: req.query.search as string,
    };
    const conversations = await conversationManager.list(filter);
    res.json({ conversations });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list conversations';
    res.status(500).json({ error: message });
  }
});

app.get('/api/conversations/tags', async (_req: Request, res: Response) => {
  try {
    const tags = await conversationManager.getAllTags();
    res.json({ tags });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get tags';
    res.status(500).json({ error: message });
  }
});

app.get('/api/conversations/:id', async (req: Request, res: Response) => {
  try {
    const conversation = await conversationManager.load(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ conversation });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load conversation';
    res.status(500).json({ error: message });
  }
});

app.post('/api/conversations', async (req: Request, res: Response) => {
  try {
    const { title, projectPath, model } = req.body;
    const conversation = await conversationManager.create({ title, projectPath, model });
    res.json({ conversation });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create conversation';
    res.status(500).json({ error: message });
  }
});

app.put('/api/conversations/:id', async (req: Request, res: Response) => {
  try {
    const { title, tags, starred, archived } = req.body;
    await conversationManager.update(req.params.id, { title, tags, starred, archived });
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update conversation';
    res.status(500).json({ error: message });
  }
});

app.delete('/api/conversations/:id', async (req: Request, res: Response) => {
  try {
    await conversationManager.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete conversation';
    res.status(500).json({ error: message });
  }
});

app.post('/api/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const { role, content, metadata } = req.body;
    const message = await conversationManager.addMessage(req.params.id, { role, content, metadata });
    res.json({ message });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to add message';
    res.status(500).json({ error: msg });
  }
});

app.get('/api/conversations/:id/export', async (req: Request, res: Response) => {
  try {
    const format = req.query.format as 'markdown' | 'json' || 'markdown';
    let content: string;
    if (format === 'json') {
      content = await conversationManager.exportToJson(req.params.id);
    } else {
      content = await conversationManager.exportToMarkdown(req.params.id);
    }
    res.json({ content });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export conversation';
    res.status(500).json({ error: message });
  }
});

app.post('/api/conversations/import', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const conversation = await conversationManager.importFromJson(content);
    res.json({ conversation });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import conversation';
    res.status(500).json({ error: message });
  }
});

app.post('/api/conversations/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const conversation = await conversationManager.duplicate(req.params.id);
    res.json({ conversation });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to duplicate conversation';
    res.status(500).json({ error: message });
  }
});

// ============================================
// Auth API
// ============================================

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const result = await authManager.login(username, password, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    res.status(401).json({ error: message });
  }
});

app.post('/api/auth/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    const tokens = await authManager.refreshToken(refreshToken);
    res.json(tokens);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token refresh failed';
    res.status(401).json({ error: message });
  }
});

app.post('/api/auth/logout', authMiddleware(true), async (req: Request, res: Response) => {
  try {
    await authManager.logout((req as unknown as { sessionId: string }).sessionId);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Logout failed';
    res.status(500).json({ error: message });
  }
});

app.get('/api/auth/me', authMiddleware(true), (req: Request, res: Response) => {
  res.json({ user: (req as unknown as { user: unknown }).user });
});

app.post('/api/auth/change-password', authMiddleware(true), async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = (req as unknown as { user: { id: string } }).user;
    await authManager.changePassword(user.id, currentPassword, newPassword);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to change password';
    res.status(400).json({ error: message });
  }
});

// ============================================
// API Keys API (protected)
// ============================================

app.get('/api/apikeys', authMiddleware(true), (_req: Request, res: Response) => {
  try {
    const keys = authManager.listApiKeys();
    res.json({ keys });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list API keys';
    res.status(500).json({ error: message });
  }
});

app.post('/api/apikeys', authMiddleware(true), async (req: Request, res: Response) => {
  try {
    const { name, value } = req.body;
    const id = await authManager.storeApiKey(name, value);
    res.json({ id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to store API key';
    res.status(500).json({ error: message });
  }
});

app.delete('/api/apikeys/:id', authMiddleware(true), async (req: Request, res: Response) => {
  try {
    await authManager.deleteApiKey(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete API key';
    res.status(500).json({ error: message });
  }
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Create HTTP server
const server = createServer(app);

// Attach WebSocket server
wsHandler.attachToServer(server);

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down gracefully...');
  
  // Close WebSocket connections and kill CLI processes
  await wsHandler.shutdown();
  
  // Stop all MCP servers
  await mcpServerManager.stopAllServers();
  
  // Stop file watchers
  await fileSystemAPI.unwatchAll();
  
  // Close HTTP server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    console.log('Force exit after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
server.listen(PORT, HOST, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 GeminiBuilder Server v1.0.0                         ║
║                                                           ║
║   HTTP Server: http://${HOST}:${PORT}                        ║
║   WebSocket:   ws://${HOST}:${PORT}                          ║
║                                                           ║
║   API Endpoints:                                          ║
║   • GET  /api/health        - Health check                ║
║   • GET  /api/settings      - Get settings                ║
║   • PUT  /api/settings      - Update settings             ║
║   • GET  /api/mcp/servers   - List MCP servers            ║
║   • GET  /api/skills        - List skills                 ║
║   • GET  /api/files         - List directory              ║
║   • GET  /api/sessions      - List active sessions        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export { app, server };
