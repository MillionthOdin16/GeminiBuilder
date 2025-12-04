/**
 * FileExplorer - Real-time file tree view component
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  TextField,
  Menu,
  MenuItem,
  Divider,
  Breadcrumbs,
  Link,
  Paper,
  CircularProgress,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  InsertDriveFile as FileIcon,
  CreateNewFolder as NewFolderIcon,
  NoteAdd as NewFileIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreIcon,
  ArrowUpward as ArrowUpIcon,
  Home as HomeIcon,
  Code as CodeIcon,
  Image as ImageIcon,
  DataObject as JsonIcon,
  Description as MarkdownIcon,
  Javascript as JsIcon,
  Html as HtmlIcon,
  Css as CssIcon,
} from '@mui/icons-material';
import { useFiles } from '../hooks/useFiles';
import type { FileEntry } from '../hooks/useFiles';

interface FileExplorerProps {
  onFileSelect?: (file: FileEntry) => void;
  onFileOpen?: (file: FileEntry, content: string) => void;
}

// File icon mapping based on extension
const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
      return <JsIcon color="warning" />;
    case 'ts':
    case 'tsx':
      return <CodeIcon sx={{ color: '#3178c6' }} />;
    case 'json':
      return <JsonIcon color="info" />;
    case 'md':
    case 'mdx':
      return <MarkdownIcon color="primary" />;
    case 'html':
    case 'htm':
      return <HtmlIcon sx={{ color: '#e34f26' }} />;
    case 'css':
    case 'scss':
    case 'sass':
      return <CssIcon sx={{ color: '#264de4' }} />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return <ImageIcon color="success" />;
    case 'py':
      return <CodeIcon sx={{ color: '#3776ab' }} />;
    default:
      return <FileIcon />;
  }
};

// Format file size
const formatSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function FileExplorer({
  onFileSelect,
  onFileOpen,
}: FileExplorerProps) {
  const {
    entries,
    currentPath,
    isLoading,
    error,
    navigateTo,
    navigateUp,
    refresh,
    readFile,
    writeFile,
    deleteFile,
    createDirectory,
  } = useFiles();

  const [expandedFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    entry: FileEntry;
  } | null>(null);
  const [newItemDialog, setNewItemDialog] = useState<{
    type: 'file' | 'folder';
    name: string;
  } | null>(null);

  // Handle file/folder click
  const handleItemClick = useCallback(
    async (entry: FileEntry) => {
      if (entry.type === 'directory') {
        navigateTo(entry.path);
      } else {
        onFileSelect?.(entry);
        try {
          const content = await readFile(entry.path);
          onFileOpen?.(entry, content);
        } catch (err) {
          console.error('Failed to read file:', err);
        }
      }
    },
    [navigateTo, readFile, onFileSelect, onFileOpen]
  );

  // Handle context menu
  const handleContextMenu = (
    event: React.MouseEvent,
    entry: FileEntry
  ) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      entry,
    });
  };

  // Close context menu
  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!contextMenu) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${contextMenu.entry.name}"?`
    );
    
    if (confirmed) {
      try {
        await deleteFile(contextMenu.entry.path);
      } catch (err) {
        console.error('Failed to delete:', err);
      }
    }
    handleCloseContextMenu();
  };

  // Handle new file/folder
  const handleNewItem = async () => {
    if (!newItemDialog || !newItemDialog.name) return;

    const newPath = `${currentPath}/${newItemDialog.name}`;
    
    try {
      if (newItemDialog.type === 'folder') {
        await createDirectory(newPath);
      } else {
        await writeFile(newPath, '');
      }
    } catch (err) {
      console.error('Failed to create:', err);
    }
    
    setNewItemDialog(null);
  };

  // Parse breadcrumb path
  const pathParts = currentPath.split('/').filter(Boolean);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Paper sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1 }} elevation={1}>
        <Tooltip title="Go to Home">
          <IconButton size="small" onClick={() => navigateTo('.')}>
            <HomeIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Go Up">
          <IconButton
            size="small"
            onClick={navigateUp}
            disabled={currentPath === '.' || currentPath === ''}
          >
            <ArrowUpIcon />
          </IconButton>
        </Tooltip>
        <Divider orientation="vertical" flexItem />
        <Tooltip title="New File">
          <IconButton
            size="small"
            onClick={() => setNewItemDialog({ type: 'file', name: '' })}
          >
            <NewFileIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="New Folder">
          <IconButton
            size="small"
            onClick={() => setNewItemDialog({ type: 'folder', name: '' })}
          >
            <NewFolderIcon />
          </IconButton>
        </Tooltip>
        <Divider orientation="vertical" flexItem />
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={refresh} disabled={isLoading}>
            {isLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </Paper>

      {/* Breadcrumbs */}
      <Box sx={{ px: 2, py: 1, bgcolor: 'background.default' }}>
        <Breadcrumbs maxItems={4} sx={{ fontSize: '0.85rem' }}>
          <Link
            component="button"
            variant="body2"
            onClick={() => navigateTo('.')}
            sx={{ cursor: 'pointer' }}
          >
            <HomeIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
            Root
          </Link>
          {pathParts.map((part, index) => {
            const path = pathParts.slice(0, index + 1).join('/');
            const isLast = index === pathParts.length - 1;
            return isLast ? (
              <Typography key={path} variant="body2" color="text.primary">
                {part}
              </Typography>
            ) : (
              <Link
                key={path}
                component="button"
                variant="body2"
                onClick={() => navigateTo(path)}
                sx={{ cursor: 'pointer' }}
              >
                {part}
              </Link>
            );
          })}
        </Breadcrumbs>
      </Box>

      <Divider />

      {/* Error Message */}
      {error && (
        <Box sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography variant="body2">{error}</Typography>
        </Box>
      )}

      {/* File List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {entries.length === 0 && !isLoading ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary',
            }}
          >
            <FolderOpenIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
            <Typography variant="body2">Empty directory</Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {entries.map((entry) => (
              <ListItem
                key={entry.path}
                disablePadding
                onContextMenu={(e) => handleContextMenu(e, entry)}
                secondaryAction={
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContextMenu(e, entry);
                    }}
                  >
                    <MoreIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemButton
                  onClick={() => handleItemClick(entry)}
                  sx={{ py: 0.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {entry.type === 'directory' ? (
                      expandedFolders.has(entry.path) ? (
                        <FolderOpenIcon color="warning" />
                      ) : (
                        <FolderIcon color="warning" />
                      )
                    ) : (
                      getFileIcon(entry.name)
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={entry.name}
                    secondary={
                      entry.type === 'file' ? formatSize(entry.size) : null
                    }
                    primaryTypographyProps={{
                      sx: {
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      },
                    }}
                    secondaryTypographyProps={{
                      sx: { fontSize: '0.75rem' },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Status Bar */}
      <Paper
        sx={{
          p: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8rem',
        }}
        elevation={1}
      >
        <Typography variant="caption" color="text.secondary">
          {entries.length} items
        </Typography>
        <Chip
          size="small"
          label={currentPath || '.'}
          sx={{ maxWidth: 200, fontSize: '0.7rem' }}
        />
      </Paper>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem
          onClick={() => {
            if (contextMenu) handleItemClick(contextMenu.entry);
            handleCloseContextMenu();
          }}
        >
          {contextMenu?.entry.type === 'directory' ? 'Open' : 'Edit'}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* New Item Dialog */}
      {newItemDialog && (
        <Paper
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            p: 3,
            zIndex: 1300,
            minWidth: 300,
          }}
          elevation={8}
        >
          <Typography variant="h6" gutterBottom>
            New {newItemDialog.type === 'folder' ? 'Folder' : 'File'}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Name"
            value={newItemDialog.name}
            onChange={(e) =>
              setNewItemDialog({ ...newItemDialog, name: e.target.value })
            }
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleNewItem();
            }}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <IconButton onClick={() => setNewItemDialog(null)}>
              Cancel
            </IconButton>
            <IconButton color="primary" onClick={handleNewItem}>
              Create
            </IconButton>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
