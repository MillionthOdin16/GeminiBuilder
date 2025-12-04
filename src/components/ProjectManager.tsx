/**
 * ProjectManager - Project management UI component
 * 
 * List, create, switch, and manage projects
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  Tooltip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
  InputAdornment,
} from '@mui/material';
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Code as CodeIcon,
  Storage as StorageIcon,
  Schedule as ScheduleIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { useWebSocket } from '../hooks/useWebSocket';

interface Project {
  id: string;
  name: string;
  path: string;
  description?: string;
  lastOpened: string;
  created: string;
  gitRepo?: boolean;
  language?: string;
  framework?: string;
  size?: number;
  fileCount?: number;
}

interface RecentProject {
  path: string;
  name: string;
  lastOpened: string;
}

const languageColors: Record<string, string> = {
  'JavaScript/TypeScript': '#f7df1e',
  'Python': '#3776ab',
  'Go': '#00add8',
  'Rust': '#dea584',
  'Java': '#b07219',
  'Ruby': '#cc342d',
  'C#/.NET': '#68217a',
};

const frameworkIcons: Record<string, string> = {
  'React': '⚛️',
  'Vue': '💚',
  'Angular': '🅰️',
  'Next.js': '▲',
  'Django': '🐍',
  'Rails': '💎',
  'Spring': '🍃',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

export default function ProjectManager() {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [browseDialog, setBrowseDialog] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    path: '',
    template: 'blank' as 'blank' | 'node' | 'python' | 'react' | 'next',
    gitInit: true,
  });
  const [browsingPath, setBrowsingPath] = useState('');
  const [browsingProjects, setBrowsingProjects] = useState<Project[]>([]);

  const { sendMessage, subscribe, isConnected } = useWebSocket();

  // Fetch recent projects
  const fetchRecentProjects = useCallback(() => {
    if (!isConnected) return;
    sendMessage({ type: 'project:recent' });
  }, [isConnected, sendMessage]);

  // Fetch current project
  const fetchCurrentProject = useCallback(() => {
    if (!isConnected) return;
    sendMessage({ type: 'project:current' });
  }, [isConnected, sendMessage]);

  // Subscribe to responses
  useEffect(() => {
    const unsubRecent = subscribe('project:recent:response', (msg) => {
      setLoading(false);
      const payload = msg.payload as { error?: string; projects?: RecentProject[] };
      if (payload.error) {
        setError(payload.error);
      } else {
        setRecentProjects(payload.projects || []);
      }
    });

    const unsubCurrent = subscribe('project:current:response', (msg) => {
      const payload = msg.payload as { error?: string; project?: Project };
      if (!payload.error) {
        setCurrentProject(payload.project || null);
      }
    });

    const unsubSwitch = subscribe('project:switch:response', (msg) => {
      const payload = msg.payload as { error?: string; project?: Project };
      if (payload.error) {
        setError(payload.error);
      } else {
        setCurrentProject(payload.project || null);
        fetchRecentProjects();
      }
    });

    const unsubCreate = subscribe('project:create:response', (msg) => {
      const payload = msg.payload as { error?: string; project?: Project };
      if (payload.error) {
        setError(payload.error);
      } else {
        setCurrentProject(payload.project || null);
        setCreateDialog(false);
        setNewProject({ name: '', path: '', template: 'blank', gitInit: true });
        fetchRecentProjects();
      }
    });

    const unsubBrowse = subscribe('project:browse:response', (msg) => {
      const payload = msg.payload as { error?: string; projects?: Project[] };
      if (!payload.error) {
        setBrowsingProjects(payload.projects || []);
      }
    });

    return () => {
      unsubRecent();
      unsubCurrent();
      unsubSwitch();
      unsubCreate();
      unsubBrowse();
    };
  }, [subscribe, fetchRecentProjects]);

  // Initial fetch
  useEffect(() => {
    fetchRecentProjects();
    fetchCurrentProject();
  }, [fetchRecentProjects, fetchCurrentProject]);

  // Switch project
  const handleSwitchProject = (projectPath: string) => {
    sendMessage({ type: 'project:switch', payload: { path: projectPath } });
  };

  // Create project
  const handleCreateProject = () => {
    if (!newProject.name || !newProject.path) return;
    
    const fullPath = `${newProject.path}/${newProject.name}`;
    sendMessage({
      type: 'project:create',
      payload: {
        path: fullPath,
        name: newProject.name,
        template: newProject.template,
        gitInit: newProject.gitInit,
      },
    });
  };

  // Remove from recent
  const handleRemoveFromRecent = (projectPath: string) => {
    sendMessage({ type: 'project:remove-recent', payload: { path: projectPath } });
    setRecentProjects(prev => prev.filter(p => p.path !== projectPath));
  };

  // Browse directory
  const handleBrowse = () => {
    if (!browsingPath) return;
    sendMessage({ type: 'project:browse', payload: { path: browsingPath } });
  };

  // Filter projects by search
  const filteredProjects = recentProjects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isConnected) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={24} sx={{ mb: 2 }} />
        <Typography color="text.secondary">
          Connecting to server...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Projects
        </Typography>
        <Button
          variant="outlined"
          startIcon={<FolderOpenIcon />}
          onClick={() => setBrowseDialog(true)}
        >
          Open Folder
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialog(true)}
        >
          New Project
        </Button>
      </Box>

      {/* Current project card */}
      {currentProject && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <FolderOpenIcon sx={{ fontSize: 48, color: 'primary.main' }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6">{currentProject.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                  {currentProject.path}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  {currentProject.language && (
                    <Chip
                      size="small"
                      label={currentProject.language}
                      sx={{
                        bgcolor: languageColors[currentProject.language] || '#666',
                        color: '#fff',
                      }}
                    />
                  )}
                  {currentProject.framework && (
                    <Chip
                      size="small"
                      label={`${frameworkIcons[currentProject.framework] || ''} ${currentProject.framework}`}
                    />
                  )}
                  {currentProject.gitRepo && (
                    <Chip size="small" label="Git" variant="outlined" />
                  )}
                  {currentProject.fileCount !== undefined && (
                    <Chip
                      size="small"
                      icon={<StorageIcon />}
                      label={`${currentProject.fileCount} files`}
                      variant="outlined"
                    />
                  )}
                  {currentProject.size !== undefined && (
                    <Chip
                      size="small"
                      label={formatBytes(currentProject.size)}
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search projects..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        size="small"
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Recent projects */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Recent Projects
      </Typography>

      <Paper sx={{ flexGrow: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : filteredProjects.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {searchQuery ? 'No matching projects' : 'No recent projects'}
            </Typography>
          </Box>
        ) : (
          <List dense>
            {filteredProjects.map((project) => (
              <ListItem
                key={project.path}
                disablePadding
                secondaryAction={
                  <Tooltip title="Remove from recent">
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromRecent(project.path);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemButton
                  onClick={() => handleSwitchProject(project.path)}
                  selected={currentProject?.path === project.path}
                >
                  <ListItemIcon>
                    <FolderIcon color={currentProject?.path === project.path ? 'primary' : 'inherit'} />
                  </ListItemIcon>
                  <ListItemText
                    primary={project.name}
                    secondary={
                      <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography variant="caption" component="span" sx={{ fontFamily: 'monospace' }}>
                          {project.path}
                        </Typography>
                        <Typography variant="caption" component="span" color="text.secondary">
                          • {formatDate(project.lastOpened)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Create project dialog */}
      <Dialog
        open={createDialog}
        onClose={() => setCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Project Name"
            value={newProject.name}
            onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
            margin="dense"
          />
          <TextField
            fullWidth
            label="Parent Directory"
            value={newProject.path}
            onChange={(e) => setNewProject(prev => ({ ...prev, path: e.target.value }))}
            margin="dense"
            placeholder="/path/to/projects"
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Template</InputLabel>
            <Select
              value={newProject.template}
              label="Template"
              onChange={(e) => setNewProject(prev => ({ 
                ...prev, 
                template: e.target.value as typeof newProject.template 
              }))}
            >
              <MenuItem value="blank">Blank Project</MenuItem>
              <MenuItem value="node">Node.js</MenuItem>
              <MenuItem value="python">Python</MenuItem>
              <MenuItem value="react">React (Vite)</MenuItem>
              <MenuItem value="next">Next.js</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={newProject.gitInit}
                onChange={(e) => setNewProject(prev => ({ ...prev, gitInit: e.target.checked }))}
              />
            }
            label="Initialize Git repository"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateProject}
            disabled={!newProject.name || !newProject.path}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Browse folder dialog */}
      <Dialog
        open={browseDialog}
        onClose={() => setBrowseDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Open Project Folder</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              label="Directory Path"
              value={browsingPath}
              onChange={(e) => setBrowsingPath(e.target.value)}
              placeholder="/path/to/projects"
              size="small"
            />
            <Button variant="contained" onClick={handleBrowse}>
              Browse
            </Button>
          </Box>

          {browsingProjects.length > 0 && (
            <List>
              {browsingProjects.map((project) => (
                <ListItem key={project.path} disablePadding>
                  <ListItemButton
                    onClick={() => {
                      handleSwitchProject(project.path);
                      setBrowseDialog(false);
                    }}
                  >
                    <ListItemIcon>
                      <FolderIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={project.name}
                      secondary={
                        <Box component="span" sx={{ display: 'flex', gap: 1 }}>
                          {project.language && (
                            <Chip size="small" label={project.language} />
                          )}
                          {project.framework && (
                            <Chip size="small" label={project.framework} />
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBrowseDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
