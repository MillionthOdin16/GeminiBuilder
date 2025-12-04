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

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

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
  } catch {
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

app.put('/api/settings', async (req: Request, res: Response) => {
  try {
    const updated = await settingsManager.updateSettings(req.body);
    res.json(updated);
  } catch {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update settings';
    res.status(400).json({ error: errorMessage });
  }
});

app.post('/api/settings/reset', async (_req: Request, res: Response) => {
  try {
    const settings = await settingsManager.resetSettings();
    res.json(settings);
  } catch {
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
  } catch {
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
  } catch {
    const errorMessage = error instanceof Error ? error.message : 'Failed to add MCP server';
    res.status(400).json({ error: errorMessage });
  }
});

app.delete('/api/mcp/servers/:name', async (req: Request, res: Response) => {
  try {
    await mcpServerManager.removeServer(req.params.name);
    res.json({ success: true });
  } catch {
    const errorMessage = error instanceof Error ? error.message : 'Failed to remove MCP server';
    res.status(400).json({ error: errorMessage });
  }
});

app.post('/api/mcp/servers/:name/start', async (req: Request, res: Response) => {
  try {
    const success = await mcpServerManager.startServer(req.params.name);
    res.json({ success });
  } catch {
    const errorMessage = error instanceof Error ? error.message : 'Failed to start MCP server';
    res.status(400).json({ error: errorMessage });
  }
});

app.post('/api/mcp/servers/:name/stop', async (req: Request, res: Response) => {
  try {
    await mcpServerManager.stopServer(req.params.name);
    res.json({ success: true });
  } catch {
    const errorMessage = error instanceof Error ? error.message : 'Failed to stop MCP server';
    res.status(400).json({ error: errorMessage });
  }
});

app.post('/api/mcp/servers/:name/test', async (req: Request, res: Response) => {
  try {
    const result = await mcpServerManager.testConnection(req.params.name);
    res.json(result);
  } catch {
    const errorMessage = error instanceof Error ? error.message : 'Failed to test connection';
    res.status(400).json({ error: errorMessage });
  }
});

app.get('/api/mcp/tools', async (_req: Request, res: Response) => {
  try {
    const tools = await mcpServerManager.listTools();
    res.json(tools);
  } catch {
    res.status(500).json({ error: 'Failed to list MCP tools' });
  }
});

app.get('/api/mcp/discover', async (_req: Request, res: Response) => {
  try {
    const discovered = await mcpServerManager.discoverServers();
    res.json(discovered);
  } catch {
    res.status(500).json({ error: 'Failed to discover MCP servers' });
  }
});

// Skills API
app.get('/api/skills', async (_req: Request, res: Response) => {
  try {
    const skills = await skillsManager.listSkills();
    res.json(skills);
  } catch {
    res.status(500).json({ error: 'Failed to list skills' });
  }
});

app.get('/api/skills/:name', async (req: Request, res: Response) => {
  try {
    const skill = await skillsManager.loadSkill(req.params.name);
    res.json(skill);
  } catch {
    const errorMessage = error instanceof Error ? error.message : 'Skill not found';
    res.status(404).json({ error: errorMessage });
  }
});

app.get('/api/skills/:name/content', async (req: Request, res: Response) => {
  try {
    const content = await skillsManager.getSkillContent(req.params.name);
    res.json({ content });
  } catch {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get skill content';
    res.status(404).json({ error: errorMessage });
  }
});

app.post('/api/skills', async (req: Request, res: Response) => {
  try {
    const skill = await skillsManager.createSkill(req.body);
    res.json(skill);
  } catch {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create skill';
    res.status(400).json({ error: errorMessage });
  }
});

app.put('/api/skills/:name', async (req: Request, res: Response) => {
  try {
    const skill = await skillsManager.updateSkill(req.params.name, req.body);
    res.json(skill);
  } catch {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update skill';
    res.status(400).json({ error: errorMessage });
  }
});

app.delete('/api/skills/:name', async (req: Request, res: Response) => {
  try {
    await skillsManager.deleteSkill(req.params.name);
    res.json({ success: true });
  } catch {
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
  } catch {
    const errorMessage = error instanceof Error ? error.message : 'Failed to duplicate skill';
    res.status(400).json({ error: errorMessage });
  }
});

app.get('/api/skills/:name/validate', async (req: Request, res: Response) => {
  try {
    const result = await skillsManager.validateSkill(req.params.name);
    res.json(result);
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
    const errorMessage = error instanceof Error ? error.message : 'Command execution failed';
    res.status(400).json({ error: errorMessage });
  }
});

// Sessions API
app.get('/api/sessions', (_req: Request, res: Response) => {
  try {
    const sessions = wsHandler.getActiveSessions();
    res.json(sessions);
  } catch {
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
  } catch {
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
  } catch {
    res.status(500).json({ error: 'Failed to get CLI status' });
  }
});

app.get('/api/cli/active', (_req: Request, res: Response) => {
  try {
    const sessions = processManager.getActiveSessions();
    res.json({ count: sessions.length, sessions });
  } catch {
    res.status(500).json({ error: 'Failed to get active CLI sessions' });
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
