/**
 * ConversationHistory - Conversation management UI
 * 
 * Save, load, search, and organize conversations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
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
  Menu,
  MenuItem,
  Autocomplete,
  InputAdornment,
  Badge,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Search as SearchIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  ContentCopy as CopyIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Label as TagIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useWebSocket } from '../hooks/useWebSocket';

interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  created: string;
  updated: string;
  projectPath?: string;
  tags?: string[];
  starred?: boolean;
  archived?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp: string;
  }[];
  created: string;
  updated: string;
  tags?: string[];
  starred?: boolean;
  archived?: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface ConversationHistoryProps {
  onLoadConversation?: (conversation: Conversation) => void;
  currentConversationId?: string;
}

export default function ConversationHistory({
  onLoadConversation,
  currentConversationId,
}: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tab, setTab] = useState(0); // 0: All, 1: Starred, 2: Archived
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null);
  const [renameDialog, setRenameDialog] = useState(false);
  const [tagsDialog, setTagsDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [exportDialog, setExportDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [importContent, setImportContent] = useState('');

  const { sendMessage, subscribe, isConnected } = useWebSocket();

  // Fetch conversations
  const fetchConversations = useCallback(() => {
    if (!isConnected) return;
    
    const filter: Record<string, unknown> = {};
    if (tab === 1) filter.starred = true;
    if (tab === 2) filter.archived = true;
    else filter.archived = false;
    if (searchQuery) filter.search = searchQuery;
    if (selectedTags.length > 0) filter.tags = selectedTags;
    
    sendMessage({ type: 'conversation:list', payload: { filter } });
  }, [isConnected, sendMessage, tab, searchQuery, selectedTags]);

  // Fetch all tags
  const fetchTags = useCallback(() => {
    if (!isConnected) return;
    sendMessage({ type: 'conversation:tags' });
  }, [isConnected, sendMessage]);

  // Subscribe to responses
  useEffect(() => {
    const unsubList = subscribe('conversation:list:response', (msg) => {
      setLoading(false);
      const payload = msg.payload as { error?: string; conversations?: ConversationSummary[] };
      if (payload.error) {
        setError(payload.error);
      } else {
        setConversations(payload.conversations || []);
      }
    });

    const unsubTags = subscribe('conversation:tags:response', (msg) => {
      const payload = msg.payload as { error?: string; tags?: string[] };
      if (!payload.error) {
        setAllTags(payload.tags || []);
      }
    });

    const unsubLoad = subscribe('conversation:load:response', (msg) => {
      const payload = msg.payload as { error?: string; conversation?: Conversation };
      if (payload.error) {
        setError(payload.error);
      } else if (onLoadConversation && payload.conversation) {
        onLoadConversation(payload.conversation);
      }
    });

    const unsubUpdate = subscribe('conversation:update:response', (msg) => {
      const payload = msg.payload as { error?: string };
      if (!payload.error) {
        fetchConversations();
      }
    });

    const unsubDelete = subscribe('conversation:delete:response', (msg) => {
      const payload = msg.payload as { error?: string };
      if (!payload.error) {
        fetchConversations();
      }
    });

    const unsubExport = subscribe('conversation:export:response', (msg) => {
      const payload = msg.payload as { error?: string; content?: string; id?: string };
      if (!payload.error && payload.content) {
        // Download the exported content
        const blob = new Blob([payload.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation-${payload.id || 'export'}.md`;
        a.click();
        URL.revokeObjectURL(url);
        setExportDialog(false);
      }
    });

    const unsubImport = subscribe('conversation:import:response', (msg) => {
      const payload = msg.payload as { error?: string };
      if (payload.error) {
        setError(payload.error);
      } else {
        fetchConversations();
        setImportDialog(false);
        setImportContent('');
      }
    });

    return () => {
      unsubList();
      unsubTags();
      unsubLoad();
      unsubUpdate();
      unsubDelete();
      unsubExport();
      unsubImport();
    };
  }, [subscribe, fetchConversations, onLoadConversation]);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
    fetchTags();
  }, [fetchConversations, fetchTags]);

  // Re-fetch when filters change
  useEffect(() => {
    fetchConversations();
  }, [tab, searchQuery, selectedTags, fetchConversations]);

  // Load conversation
  const handleLoad = (id: string) => {
    sendMessage({ type: 'conversation:load', payload: { id } });
  };

  // Toggle starred
  const handleToggleStar = (id: string, starred: boolean) => {
    sendMessage({ type: 'conversation:update', payload: { id, starred: !starred } });
  };

  // Toggle archived
  const handleToggleArchive = (id: string, archived: boolean) => {
    sendMessage({ type: 'conversation:update', payload: { id, archived: !archived } });
  };

  // Delete conversation
  const handleDelete = (id: string) => {
    if (window.confirm('Delete this conversation? This cannot be undone.')) {
      sendMessage({ type: 'conversation:delete', payload: { id } });
    }
  };

  // Rename conversation
  const handleRename = () => {
    if (!selectedConversation || !newTitle.trim()) return;
    sendMessage({ type: 'conversation:update', payload: { id: selectedConversation.id, title: newTitle } });
    setRenameDialog(false);
    setSelectedConversation(null);
    setNewTitle('');
  };

  // Update tags
  const handleUpdateTags = () => {
    if (!selectedConversation) return;
    sendMessage({ type: 'conversation:update', payload: { id: selectedConversation.id, tags: editTags } });
    setTagsDialog(false);
    setSelectedConversation(null);
    setEditTags([]);
  };

  // Duplicate conversation
  const handleDuplicate = (id: string) => {
    sendMessage({ type: 'conversation:duplicate', payload: { id } });
  };

  // Export conversation
  const handleExport = (id: string, format: 'markdown' | 'json') => {
    sendMessage({ type: 'conversation:export', payload: { id, format } });
  };

  // Import conversation
  const handleImport = () => {
    if (!importContent.trim()) return;
    sendMessage({ type: 'conversation:import', payload: { content: importContent } });
  };

  // Create new conversation
  const handleCreate = () => {
    sendMessage({ type: 'conversation:create', payload: {} });
  };

  // Open menu
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, conversation: ConversationSummary) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedConversation(conversation);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Conversations
          </Typography>
          <Tooltip title="Import">
            <IconButton size="small" onClick={() => setImportDialog(true)}>
              <UploadIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleCreate}
          >
            New
          </Button>
        </Box>

        {/* Search */}
        <TextField
          fullWidth
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        {/* Tag filter */}
        {allTags.length > 0 && (
          <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {allTags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                onClick={() => {
                  if (selectedTags.includes(tag)) {
                    setSelectedTags(prev => prev.filter(t => t !== tag));
                  } else {
                    setSelectedTags(prev => [...prev, tag]);
                  }
                }}
                color={selectedTags.includes(tag) ? 'primary' : 'default'}
                variant={selectedTags.includes(tag) ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 36 }}
      >
        <Tab label="All" sx={{ minHeight: 36, py: 0 }} />
        <Tab
          label={
            <Badge
              badgeContent={conversations.filter(c => c.starred).length}
              color="primary"
            >
              Starred
            </Badge>
          }
          sx={{ minHeight: 36, py: 0 }}
        />
        <Tab label="Archived" sx={{ minHeight: 36, py: 0 }} />
      </Tabs>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ m: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Conversation list */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : conversations.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <ChatIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              {searchQuery || selectedTags.length > 0
                ? 'No matching conversations'
                : tab === 1
                ? 'No starred conversations'
                : tab === 2
                ? 'No archived conversations'
                : 'No conversations yet'}
            </Typography>
          </Box>
        ) : (
          <List dense>
            {conversations.map((conv) => (
              <ListItem
                key={conv.id}
                disablePadding
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => handleOpenMenu(e, conv)}
                  >
                    <MoreIcon fontSize="small" />
                  </IconButton>
                }
                sx={{
                  borderLeft: conv.id === currentConversationId ? 3 : 0,
                  borderColor: 'primary.main',
                }}
              >
                <ListItemButton
                  onClick={() => handleLoad(conv.id)}
                  selected={conv.id === currentConversationId}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {conv.starred ? (
                      <StarIcon color="warning" fontSize="small" />
                    ) : (
                      <ChatIcon fontSize="small" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 200,
                          }}
                        >
                          {conv.title}
                        </Typography>
                        {conv.archived && (
                          <ArchiveIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography variant="caption" component="span">
                          {conv.messageCount} messages
                        </Typography>
                        <Typography variant="caption" component="span" color="text.secondary">
                          • {formatDate(conv.updated)}
                        </Typography>
                      </Box>
                    }
                  />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Box>

    {/* Context menu */}
    <Menu
      anchorEl={menuAnchor}
      open={Boolean(menuAnchor)}
      onClose={() => {
        setMenuAnchor(null);
        setSelectedConversation(null);
      }}
    >
      <MenuItem
          onClick={() => {
            if (selectedConversation) {
              handleToggleStar(selectedConversation.id, selectedConversation.starred || false);
            }
            setMenuAnchor(null);
          }}
        >
          {selectedConversation?.starred ? (
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
        <MenuItem
          onClick={() => {
            setNewTitle(selectedConversation?.title || '');
            setRenameDialog(true);
            setMenuAnchor(null);
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Rename
        </MenuItem>
        <MenuItem
          onClick={() => {
            setEditTags(selectedConversation?.tags || []);
            setTagsDialog(true);
            setMenuAnchor(null);
          }}
        >
          <TagIcon fontSize="small" sx={{ mr: 1 }} />
          Edit Tags
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedConversation) {
              handleDuplicate(selectedConversation.id);
            }
            setMenuAnchor(null);
          }}
        >
          <CopyIcon fontSize="small" sx={{ mr: 1 }} />
          Duplicate
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            if (selectedConversation) {
              handleExport(selectedConversation.id, 'markdown');
            }
            setMenuAnchor(null);
          }}
        >
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          Export as Markdown
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedConversation) {
              handleExport(selectedConversation.id, 'json');
            }
            setMenuAnchor(null);
          }}
        >
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          Export as JSON
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            if (selectedConversation) {
              handleToggleArchive(selectedConversation.id, selectedConversation.archived || false);
            }
            setMenuAnchor(null);
          }}
        >
          {selectedConversation?.archived ? (
            <>
              <UnarchiveIcon fontSize="small" sx={{ mr: 1 }} />
              Unarchive
            </>
          ) : (
            <>
              <ArchiveIcon fontSize="small" sx={{ mr: 1 }} />
              Archive
            </>
          )}
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedConversation) {
              handleDelete(selectedConversation.id);
            }
            setMenuAnchor(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Rename dialog */}
      <Dialog open={renameDialog} onClose={() => setRenameDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Rename Conversation</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRename}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tags dialog */}
      <Dialog open={tagsDialog} onClose={() => setTagsDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Tags</DialogTitle>
        <DialogContent>
          <Autocomplete
            multiple
            freeSolo
            options={allTags}
            value={editTags}
            onChange={(_, newValue) => setEditTags(newValue)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option}
                  size="small"
                  {...getTagProps({ index })}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Add tags..."
                margin="dense"
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTagsDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateTags}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={importDialog} onClose={() => setImportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Conversation</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Paste a previously exported conversation JSON to import it.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={10}
            placeholder="Paste JSON here..."
            value={importContent}
            onChange={(e) => setImportContent(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleImport} disabled={!importContent.trim()}>
            Import
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
