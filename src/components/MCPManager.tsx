/**
 * MCPManager - MCP Server Management Component
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
  CircularProgress,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  CheckCircle as ConnectedIcon,
  Error as ErrorIcon,
  HelpOutline as DisconnectedIcon,
  Build as ToolIcon,
  Science as TestIcon,
} from '@mui/icons-material';

interface MCPServer {
  name: string;
  config: {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    transport?: 'stdio' | 'sse' | 'http';
  };
  status: 'connected' | 'disconnected' | 'error';
  error?: string;
}

interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  server: string;
}

export default function MCPManager() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [expandedServer, setExpandedServer] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    server: string;
    success: boolean;
    message: string;
    latency?: number;
  } | null>(null);

  // New server form state
  const [newServer, setNewServer] = useState({
    name: '',
    command: '',
    args: '',
    transport: 'stdio' as 'stdio' | 'sse' | 'http',
    url: '',
  });

  // Load servers
  const loadServers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/mcp/servers');
      if (!response.ok) throw new Error('Failed to load servers');
      const data = await response.json();
      setServers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Load tools
  const loadTools = async () => {
    try {
      const response = await fetch('/api/mcp/tools');
      if (!response.ok) throw new Error('Failed to load tools');
      const data = await response.json();
      setTools(data);
    } catch (err) {
      console.error('Failed to load tools:', err);
    }
  };

  // Load on mount
  useEffect(() => {
    loadServers();
    loadTools();
  }, []);

  // Add server
  const handleAddServer = async () => {
    try {
      const config: Record<string, unknown> = {};
      
      if (newServer.transport === 'stdio') {
        config.command = newServer.command;
        config.args = newServer.args.split(' ').filter(Boolean);
        config.transport = 'stdio';
      } else {
        config.url = newServer.url;
        config.transport = newServer.transport;
      }

      const response = await fetch('/api/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newServer.name, config }),
      });

      if (!response.ok) throw new Error('Failed to add server');

      setAddDialogOpen(false);
      setNewServer({ name: '', command: '', args: '', transport: 'stdio', url: '' });
      loadServers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Remove server
  const handleRemoveServer = async (name: string) => {
    if (!window.confirm(`Remove MCP server "${name}"?`)) return;

    try {
      const response = await fetch(`/api/mcp/servers/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove server');
      loadServers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Start server
  const handleStartServer = async (name: string) => {
    try {
      const response = await fetch(`/api/mcp/servers/${encodeURIComponent(name)}/start`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to start server');
      loadServers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Stop server
  const handleStopServer = async (name: string) => {
    try {
      const response = await fetch(`/api/mcp/servers/${encodeURIComponent(name)}/stop`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to stop server');
      loadServers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Test server
  const handleTestServer = async (name: string) => {
    try {
      const response = await fetch(`/api/mcp/servers/${encodeURIComponent(name)}/test`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to test server');
      const result = await response.json();
      setTestResult({ server: name, ...result });
    } catch (err) {
      setTestResult({
        server: name,
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  // Get status icon
  const getStatusIcon = (status: MCPServer['status']) => {
    switch (status) {
      case 'connected':
        return <ConnectedIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <DisconnectedIcon color="disabled" />;
    }
  };

  // Get server tools
  const getServerTools = (serverName: string) => {
    return tools.filter((t) => t.server === serverName);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">MCP Servers Manager</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadServers}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            Add Server
          </Button>
        </Box>
      </Box>

      <Typography variant="body1" color="text.secondary" paragraph>
        Configure and manage Model Context Protocol (MCP) servers. These provide additional tools and capabilities to Gemini CLI.
      </Typography>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Test Result Alert */}
      {testResult && (
        <Alert
          severity={testResult.success ? 'success' : 'error'}
          onClose={() => setTestResult(null)}
          sx={{ mb: 2 }}
        >
          <strong>{testResult.server}:</strong> {testResult.message}
          {testResult.latency && ` (${testResult.latency}ms)`}
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Servers Table */}
      {!isLoading && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Transport</TableCell>
                <TableCell>Command/URL</TableCell>
                <TableCell>Tools</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {servers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No MCP servers configured. Click "Add Server" to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                servers.map((server) => (
                  <React.Fragment key={server.name}>
                    <TableRow hover>
                      <TableCell>
                        <Tooltip title={server.status}>
                          {getStatusIcon(server.status)}
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="bold">{server.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={server.config.transport || 'stdio'}
                          color={server.config.transport === 'http' ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                          {server.config.command || server.config.url}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={<ToolIcon />}
                          label={getServerTools(server.name).length}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Tooltip title={expandedServer === server.name ? 'Collapse' : 'Expand'}>
                            <IconButton
                              size="small"
                              onClick={() =>
                                setExpandedServer(
                                  expandedServer === server.name ? null : server.name
                                )
                              }
                            >
                              {expandedServer === server.name ? <CollapseIcon /> : <ExpandIcon />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Test Connection">
                            <IconButton
                              size="small"
                              onClick={() => handleTestServer(server.name)}
                            >
                              <TestIcon />
                            </IconButton>
                          </Tooltip>
                          {server.status === 'connected' ? (
                            <Tooltip title="Stop">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => handleStopServer(server.name)}
                              >
                                <StopIcon />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Start">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleStartServer(server.name)}
                              >
                                <StartIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Remove">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveServer(server.name)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 0 }}>
                        <Collapse in={expandedServer === server.name}>
                          <Box sx={{ py: 2, px: 3, bgcolor: 'background.default' }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Available Tools ({getServerTools(server.name).length})
                            </Typography>
                            {getServerTools(server.name).length === 0 ? (
                              <Typography variant="body2" color="text.secondary">
                                No tools available. Start the server to discover tools.
                              </Typography>
                            ) : (
                              <List dense>
                                {getServerTools(server.name).map((tool) => (
                                  <ListItem key={tool.name}>
                                    <ListItemIcon>
                                      <ToolIcon />
                                    </ListItemIcon>
                                    <ListItemText
                                      primary={tool.name}
                                      secondary={tool.description}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            )}
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2" gutterBottom>
                              Configuration
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#1e1e1e' }}>
                              <pre style={{ margin: 0, fontSize: '0.85rem', color: '#d4d4d4' }}>
                                {JSON.stringify(server.config, null, 2)}
                              </pre>
                            </Paper>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Server Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add MCP Server</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Server Name"
              value={newServer.name}
              onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
              fullWidth
              placeholder="my-mcp-server"
              required
            />

            <FormControl fullWidth>
              <InputLabel>Transport Type</InputLabel>
              <Select
                value={newServer.transport}
                label="Transport Type"
                onChange={(e) =>
                  setNewServer({
                    ...newServer,
                    transport: e.target.value as 'stdio' | 'sse' | 'http',
                  })
                }
              >
                <MenuItem value="stdio">Stdio (Local Process)</MenuItem>
                <MenuItem value="sse">SSE (Server-Sent Events)</MenuItem>
                <MenuItem value="http">HTTP (REST API)</MenuItem>
              </Select>
            </FormControl>

            {newServer.transport === 'stdio' ? (
              <>
                <TextField
                  label="Command"
                  value={newServer.command}
                  onChange={(e) => setNewServer({ ...newServer, command: e.target.value })}
                  fullWidth
                  placeholder="npx -y @modelcontextprotocol/server-filesystem"
                  required
                />
                <TextField
                  label="Arguments (space-separated)"
                  value={newServer.args}
                  onChange={(e) => setNewServer({ ...newServer, args: e.target.value })}
                  fullWidth
                  placeholder="--directory /path/to/dir"
                />
              </>
            ) : (
              <TextField
                label="URL"
                value={newServer.url}
                onChange={(e) => setNewServer({ ...newServer, url: e.target.value })}
                fullWidth
                placeholder="http://localhost:3000/mcp"
                required
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddServer}
            disabled={!newServer.name || (newServer.transport === 'stdio' ? !newServer.command : !newServer.url)}
          >
            Add Server
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
