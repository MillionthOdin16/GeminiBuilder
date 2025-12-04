/**
 * SnippetLibrary - Code snippet management component
 * 
 * Save, organize, and quickly insert code snippets
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Tooltip,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Divider,
  Menu,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Code as CodeIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  MoreVert as MoreIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';

interface CodeSnippet {
  id: string;
  title: string;
  description?: string;
  code: string;
  language: string;
  tags: string[];
  folder?: string;
  starred?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SnippetFolder {
  id: string;
  name: string;
  color?: string;
}

const defaultLanguages = [
  'javascript',
  'typescript',
  'python',
  'java',
  'go',
  'rust',
  'c',
  'cpp',
  'csharp',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'sql',
  'html',
  'css',
  'json',
  'yaml',
  'markdown',
  'bash',
  'powershell',
  'dockerfile',
  'graphql',
];

interface SnippetLibraryProps {
  onInsertSnippet?: (code: string) => void;
}

export default function SnippetLibrary({ onInsertSnippet }: SnippetLibraryProps) {
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [folders, setFolders] = useState<SnippetFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedSnippet, setSelectedSnippet] = useState<CodeSnippet | null>(null);
  const [editDialog, setEditDialog] = useState<{ open: boolean; snippet: CodeSnippet | null }>({
    open: false,
    snippet: null,
  });
  const [folderDialog, setFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuSnippet, setMenuSnippet] = useState<CodeSnippet | null>(null);

  // Load snippets from localStorage
  useEffect(() => {
    const savedSnippets = localStorage.getItem('gemini-code-snippets');
    const savedFolders = localStorage.getItem('gemini-snippet-folders');
    
    if (savedSnippets) {
      try {
        setSnippets(JSON.parse(savedSnippets));
      } catch {
        setSnippets([]);
      }
    }
    
    if (savedFolders) {
      try {
        setFolders(JSON.parse(savedFolders));
      } catch {
        setFolders([]);
      }
    }
  }, []);

  // Save snippets
  const saveSnippets = (newSnippets: CodeSnippet[]) => {
    localStorage.setItem('gemini-code-snippets', JSON.stringify(newSnippets));
    setSnippets(newSnippets);
  };

  // Save folders
  const saveFolders = (newFolders: SnippetFolder[]) => {
    localStorage.setItem('gemini-snippet-folders', JSON.stringify(newFolders));
    setFolders(newFolders);
  };

  // Get unique languages from snippets
  const usedLanguages = Array.from(new Set(snippets.map(s => s.language)));

  // Filter snippets
  const filteredSnippets = snippets.filter(s => {
    const matchesSearch = !searchQuery || 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesLanguage = !selectedLanguage || s.language === selectedLanguage;
    const matchesFolder = !selectedFolder || s.folder === selectedFolder;
    
    return matchesSearch && matchesLanguage && matchesFolder;
  });

  // Sort by starred first, then by updatedAt
  const sortedSnippets = [...filteredSnippets].sort((a, b) => {
    if (a.starred && !b.starred) return -1;
    if (!a.starred && b.starred) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // Create new snippet
  const createNewSnippet = () => {
    setEditDialog({
      open: true,
      snippet: {
        id: '',
        title: '',
        description: '',
        code: '',
        language: 'javascript',
        tags: [],
        folder: selectedFolder || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  };

  // Save snippet
  const saveSnippet = (snippet: CodeSnippet) => {
    const now = new Date().toISOString();
    
    if (snippet.id) {
      // Update existing
      saveSnippets(snippets.map(s => 
        s.id === snippet.id ? { ...snippet, updatedAt: now } : s
      ));
    } else {
      // Create new
      const newSnippet = {
        ...snippet,
        id: `snippet-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };
      saveSnippets([...snippets, newSnippet]);
    }
    
    setEditDialog({ open: false, snippet: null });
  };

  // Delete snippet
  const deleteSnippet = (id: string) => {
    if (window.confirm('Delete this snippet?')) {
      saveSnippets(snippets.filter(s => s.id !== id));
      if (selectedSnippet?.id === id) {
        setSelectedSnippet(null);
      }
    }
    setMenuAnchor(null);
  };

  // Toggle starred
  const toggleStarred = (id: string) => {
    saveSnippets(snippets.map(s => 
      s.id === id ? { ...s, starred: !s.starred, updatedAt: new Date().toISOString() } : s
    ));
  };

  // Copy snippet
  const copySnippet = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  // Create folder
  const createFolder = () => {
    if (!newFolderName.trim()) return;
    
    const newFolder: SnippetFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
    };
    
    saveFolders([...folders, newFolder]);
    setNewFolderName('');
    setFolderDialog(false);
  };

  // Delete folder
  const deleteFolder = (folderId: string) => {
    if (window.confirm('Delete this folder? Snippets will be moved to "Uncategorized".')) {
      saveFolders(folders.filter(f => f.id !== folderId));
      saveSnippets(snippets.map(s => 
        s.folder === folderId ? { ...s, folder: undefined } : s
      ));
      if (selectedFolder === folderId) {
        setSelectedFolder(null);
      }
    }
  };

  // Insert snippet
  const handleInsert = (snippet: CodeSnippet) => {
    if (onInsertSnippet) {
      onInsertSnippet(snippet.code);
    } else {
      copySnippet(snippet.code);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex' }}>
      {/* Sidebar */}
      <Paper sx={{ width: 200, flexShrink: 0, borderRadius: 0, borderRight: 1, borderColor: 'divider' }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Folders
          </Typography>
        </Box>
        <List dense>
          <ListItem disablePadding>
            <ListItemButton
              selected={selectedFolder === null}
              onClick={() => setSelectedFolder(null)}
            >
              <ListItemText primary="All Snippets" secondary={`${snippets.length}`} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              selected={selectedFolder === 'starred'}
              onClick={() => setSelectedFolder('starred')}
            >
              <StarIcon fontSize="small" sx={{ mr: 1, color: 'warning.main' }} />
              <ListItemText 
                primary="Starred" 
                secondary={`${snippets.filter(s => s.starred).length}`} 
              />
            </ListItemButton>
          </ListItem>
          <Divider sx={{ my: 1 }} />
          {folders.map(folder => (
            <ListItem 
              key={folder.id} 
              disablePadding
              secondaryAction={
                <IconButton 
                  edge="end" 
                  size="small"
                  onClick={() => deleteFolder(folder.id)}
                >
                  <Delete fontSize="small" />
                </IconButton>
              }
            >
              <ListItemButton
                selected={selectedFolder === folder.id}
                onClick={() => setSelectedFolder(folder.id)}
              >
                <FolderIcon fontSize="small" sx={{ mr: 1 }} />
                <ListItemText 
                  primary={folder.name}
                  secondary={`${snippets.filter(s => s.folder === folder.id).length}`}
                />
              </ListItemButton>
            </ListItem>
          ))}
          <ListItem disablePadding>
            <ListItemButton onClick={() => setFolderDialog(true)}>
              <AddIcon fontSize="small" sx={{ mr: 1 }} />
              <ListItemText primary="New Folder" />
            </ListItemButton>
          </ListItem>
        </List>
      </Paper>

      {/* Main content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <TextField
              placeholder="Search snippets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{ flexGrow: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Language</InputLabel>
              <Select
                value={selectedLanguage || ''}
                label="Language"
                onChange={(e) => setSelectedLanguage(e.target.value || null)}
              >
                <MenuItem value="">All</MenuItem>
                {usedLanguages.map(lang => (
                  <MenuItem key={lang} value={lang}>{lang}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={createNewSnippet}
            >
              New Snippet
            </Button>
          </Box>
        </Box>

        {/* Snippet list and preview */}
        <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
          {/* List */}
          <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider', overflow: 'auto' }}>
            <List dense>
              {sortedSnippets.map(snippet => (
                <ListItem
                  key={snippet.id}
                  disablePadding
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        setMenuAnchor(e.currentTarget);
                        setMenuSnippet(snippet);
                      }}
                    >
                      <MoreIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemButton
                    selected={selectedSnippet?.id === snippet.id}
                    onClick={() => setSelectedSnippet(snippet)}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {snippet.starred && <StarIcon fontSize="small" color="warning" />}
                          <Typography variant="body2" noWrap>
                            {snippet.title}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box component="span" sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                          <Chip label={snippet.language} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
              {sortedSnippets.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="No snippets"
                    secondary={searchQuery ? 'Try a different search' : 'Create your first snippet'}
                    sx={{ textAlign: 'center' }}
                  />
                </ListItem>
              )}
            </List>
          </Box>

          {/* Preview */}
          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
            {selectedSnippet ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">{selectedSnippet.title}</Typography>
                    {selectedSnippet.description && (
                      <Typography variant="body2" color="text.secondary">
                        {selectedSnippet.description}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                      <Chip label={selectedSnippet.language} size="small" />
                      {selectedSnippet.tags.map(tag => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title={onInsertSnippet ? 'Insert' : 'Copy'}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleInsert(selectedSnippet)}
                      >
                        {onInsertSnippet ? 'Insert' : 'Copy'}
                      </Button>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => setEditDialog({ open: true, snippet: selectedSnippet })}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Box
                  component="pre"
                  sx={{
                    p: 2,
                    bgcolor: 'grey.900',
                    color: 'grey.100',
                    borderRadius: 1,
                    overflow: 'auto',
                    fontSize: '0.875rem',
                    fontFamily: '"Fira Code", Consolas, Monaco, monospace',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {selectedSnippet.code}
                </Box>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CodeIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary">
                  Select a snippet to view
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          if (menuSnippet) toggleStarred(menuSnippet.id);
          setMenuAnchor(null);
        }}>
          {menuSnippet?.starred ? (
            <>
              <StarBorderIcon fontSize="small" sx={{ mr: 1 }} />
              Unstar
            </>
          ) : (
            <>
              <StarIcon fontSize="small" sx={{ mr: 1 }} />
              Star
            </>
          )}
        </MenuItem>
        <MenuItem onClick={() => {
          if (menuSnippet) copySnippet(menuSnippet.code);
          setMenuAnchor(null);
        }}>
          <CopyIcon fontSize="small" sx={{ mr: 1 }} />
          Copy
        </MenuItem>
        <MenuItem onClick={() => {
          if (menuSnippet) setEditDialog({ open: true, snippet: menuSnippet });
          setMenuAnchor(null);
        }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => {
            if (menuSnippet) deleteSnippet(menuSnippet.id);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* New folder dialog */}
      <Dialog open={folderDialog} onClose={() => setFolderDialog(false)}>
        <DialogTitle>New Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFolderDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={createFolder}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Edit snippet dialog */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, snippet: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editDialog.snippet?.id ? 'Edit Snippet' : 'New Snippet'}
        </DialogTitle>
        <DialogContent>
          {editDialog.snippet && (
            <>
              <TextField
                fullWidth
                label="Title"
                value={editDialog.snippet.title}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  snippet: prev.snippet ? { ...prev.snippet, title: e.target.value } : null,
                }))}
                margin="dense"
              />
              <TextField
                fullWidth
                label="Description"
                value={editDialog.snippet.description || ''}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  snippet: prev.snippet ? { ...prev.snippet, description: e.target.value } : null,
                }))}
                margin="dense"
              />
              <FormControl fullWidth margin="dense">
                <Autocomplete
                  freeSolo
                  options={defaultLanguages}
                  value={editDialog.snippet.language}
                  onChange={(_, value) => setEditDialog(prev => ({
                    ...prev,
                    snippet: prev.snippet ? { ...prev.snippet, language: value || 'text' } : null,
                  }))}
                  onInputChange={(_, value) => setEditDialog(prev => ({
                    ...prev,
                    snippet: prev.snippet ? { ...prev.snippet, language: value || 'text' } : null,
                  }))}
                  renderInput={(params) => <TextField {...params} label="Language" />}
                />
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel>Folder</InputLabel>
                <Select
                  value={editDialog.snippet.folder || ''}
                  label="Folder"
                  onChange={(e) => setEditDialog(prev => ({
                    ...prev,
                    snippet: prev.snippet ? { ...prev.snippet, folder: e.target.value || undefined } : null,
                  }))}
                >
                  <MenuItem value="">None</MenuItem>
                  {folders.map(folder => (
                    <MenuItem key={folder.id} value={folder.id}>{folder.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Tags (comma separated)"
                value={editDialog.snippet.tags.join(', ')}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  snippet: prev.snippet ? { 
                    ...prev.snippet, 
                    tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) 
                  } : null,
                }))}
                margin="dense"
              />
              <TextField
                fullWidth
                label="Code"
                value={editDialog.snippet.code}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  snippet: prev.snippet ? { ...prev.snippet, code: e.target.value } : null,
                }))}
                margin="dense"
                multiline
                rows={12}
                sx={{
                  '& textarea': {
                    fontFamily: '"Fira Code", Consolas, Monaco, monospace',
                    fontSize: '0.875rem',
                  },
                }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, snippet: null })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => editDialog.snippet && saveSnippet(editDialog.snippet)}
            disabled={!editDialog.snippet?.title || !editDialog.snippet?.code}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Fix missing import
const Delete = DeleteIcon;
