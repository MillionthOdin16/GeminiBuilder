/**
 * KeyboardShortcuts - Global keyboard shortcuts manager
 * 
 * Provides command palette and keyboard shortcut functionality
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Chip,
  InputAdornment,
  Divider,
  Paper,
} from '@mui/material';
import {
  Search as SearchIcon,
  Chat as ChatIcon,
  Code as CodeIcon,
  Terminal as TerminalIcon,
  Settings as SettingsIcon,
  Folder as FolderIcon,
  AccountTree as GitIcon,
  Storage as MCPIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Keyboard as KeyboardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface Command {
  id: string;
  title: string;
  description?: string;
  shortcut?: string;
  icon?: React.ReactNode;
  action: () => void;
  category?: string;
}

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
  additionalCommands?: Command[];
}

// Default shortcuts
const defaultShortcuts: Record<string, string> = {
  'mod+k': 'Open command palette',
  'mod+s': 'Save current file',
  'mod+n': 'New file',
  'mod+shift+n': 'New project',
  'mod+p': 'Go to file',
  'mod+shift+p': 'Command palette',
  'mod+,': 'Settings',
  'mod+`': 'Toggle terminal',
  'mod+b': 'Toggle sidebar',
  'mod+j': 'Toggle panel',
  'ctrl+shift+g': 'Source control',
  'mod+shift+f': 'Search in files',
  'mod+shift+e': 'Explorer',
  'mod+1': 'Focus editor',
  'mod+2': 'Focus chat',
};

// Helper to format shortcut for display
const formatShortcut = (shortcut: string): string => {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
  return shortcut
    .replace('mod', isMac ? '⌘' : 'Ctrl')
    .replace('shift', isMac ? '⇧' : 'Shift')
    .replace('alt', isMac ? '⌥' : 'Alt')
    .replace('ctrl', isMac ? '⌃' : 'Ctrl')
    .replace(/\+/g, ' + ')
    .split(' + ')
    .map(key => key.charAt(0).toUpperCase() + key.slice(1))
    .join(isMac ? '' : ' + ');
};

export default function KeyboardShortcuts({
  isOpen,
  onClose,
  additionalCommands = [],
}: KeyboardShortcutsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Build command list
  const commands: Command[] = [
    // Navigation
    {
      id: 'goto-chat',
      title: 'Go to Chat',
      description: 'Open the chat/REPL interface',
      shortcut: 'mod+2',
      icon: <ChatIcon />,
      action: () => navigate('/chat'),
      category: 'Navigation',
    },
    {
      id: 'goto-editor',
      title: 'Go to Editor',
      description: 'Open the code editor',
      shortcut: 'mod+1',
      icon: <CodeIcon />,
      action: () => navigate('/editor'),
      category: 'Navigation',
    },
    {
      id: 'goto-terminal',
      title: 'Go to Terminal',
      description: 'Open the terminal',
      shortcut: 'mod+`',
      icon: <TerminalIcon />,
      action: () => navigate('/terminal'),
      category: 'Navigation',
    },
    {
      id: 'goto-git',
      title: 'Go to Source Control',
      description: 'Open the git panel',
      shortcut: 'ctrl+shift+g',
      icon: <GitIcon />,
      action: () => navigate('/git'),
      category: 'Navigation',
    },
    {
      id: 'goto-projects',
      title: 'Go to Projects',
      description: 'Open project manager',
      icon: <FolderIcon />,
      action: () => navigate('/projects'),
      category: 'Navigation',
    },
    {
      id: 'goto-settings',
      title: 'Go to Settings',
      description: 'Open settings',
      shortcut: 'mod+,',
      icon: <SettingsIcon />,
      action: () => navigate('/settings'),
      category: 'Navigation',
    },
    {
      id: 'goto-mcp',
      title: 'Go to MCP Servers',
      description: 'Manage MCP servers',
      icon: <MCPIcon />,
      action: () => navigate('/mcp'),
      category: 'Navigation',
    },
    
    // Actions
    {
      id: 'new-conversation',
      title: 'New Conversation',
      description: 'Start a new chat conversation',
      shortcut: 'mod+n',
      icon: <AddIcon />,
      action: () => {
        navigate('/chat');
        // Dispatch custom event for new conversation
        window.dispatchEvent(new CustomEvent('gemini:new-conversation'));
      },
      category: 'Actions',
    },
    {
      id: 'new-project',
      title: 'New Project',
      description: 'Create a new project',
      shortcut: 'mod+shift+n',
      icon: <FolderIcon />,
      action: () => {
        navigate('/projects');
        window.dispatchEvent(new CustomEvent('gemini:new-project'));
      },
      category: 'Actions',
    },
    {
      id: 'refresh',
      title: 'Refresh',
      description: 'Refresh current view',
      shortcut: 'mod+r',
      icon: <RefreshIcon />,
      action: () => {
        window.dispatchEvent(new CustomEvent('gemini:refresh'));
      },
      category: 'Actions',
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard Shortcuts',
      description: 'Show all keyboard shortcuts',
      icon: <KeyboardIcon />,
      action: () => {
        // Already open
      },
      category: 'Help',
    },
    
    // Add additional commands
    ...additionalCommands,
  ];

  // Filter commands based on search
  const filteredCommands = commands.filter(cmd => {
    const query = searchQuery.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(query) ||
      cmd.description?.toLowerCase().includes(query) ||
      cmd.category?.toLowerCase().includes(query)
    );
  });

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    const category = cmd.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filteredCommands, selectedIndex, onClose]);

  // Execute command
  const executeCommand = (command: Command) => {
    command.action();
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          position: 'absolute',
          top: '15%',
          margin: 0,
          borderRadius: 2,
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Search input */}
        <TextField
          inputRef={inputRef}
          fullWidth
          placeholder="Type a command or search..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            sx: {
              fontSize: '1.1rem',
              py: 1.5,
              px: 2,
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 0,
              '& fieldset': {
                border: 'none',
                borderBottom: '1px solid',
                borderColor: 'divider',
              },
            },
          }}
          autoComplete="off"
        />

        {/* Command list */}
        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {Object.entries(groupedCommands).map(([category, cmds], categoryIndex) => (
            <Box key={category}>
              {categoryIndex > 0 && <Divider />}
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  px: 2,
                  pt: 1.5,
                  pb: 0.5,
                  color: 'text.secondary',
                  fontWeight: 500,
                }}
              >
                {category}
              </Typography>
              <List dense disablePadding>
                {cmds.map((cmd) => {
                  const globalIndex = filteredCommands.indexOf(cmd);
                  return (
                    <ListItem key={cmd.id} disablePadding>
                      <ListItemButton
                        selected={globalIndex === selectedIndex}
                        onClick={() => executeCommand(cmd)}
                        sx={{
                          py: 1,
                          px: 2,
                          '&.Mui-selected': {
                            bgcolor: 'action.selected',
                          },
                        }}
                      >
                        {cmd.icon && (
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            {cmd.icon}
                          </ListItemIcon>
                        )}
                        <ListItemText
                          primary={cmd.title}
                          secondary={cmd.description}
                          primaryTypographyProps={{
                            fontWeight: 500,
                          }}
                          secondaryTypographyProps={{
                            variant: 'caption',
                          }}
                        />
                        {cmd.shortcut && (
                          <Chip
                            size="small"
                            label={formatShortcut(cmd.shortcut)}
                            sx={{
                              height: 24,
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                              bgcolor: 'action.hover',
                            }}
                          />
                        )}
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          ))}

          {filteredCommands.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No commands found
              </Typography>
            </Box>
          )}
        </Box>

        {/* Footer */}
        <Paper
          elevation={0}
          sx={{
            px: 2,
            py: 1,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            gap: 2,
            bgcolor: 'action.hover',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            ↑↓ Navigate
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ↵ Select
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Esc Close
          </Typography>
        </Paper>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for global keyboard shortcuts
 */
export function useKeyboardShortcuts() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      
      // Command palette: Cmd/Ctrl + K or Cmd/Ctrl + Shift + P
      if ((isMod && e.key === 'k') || (isMod && e.shiftKey && e.key === 'p')) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      // Quick navigation shortcuts
      if (isMod && !e.shiftKey && !e.altKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            navigate('/editor');
            break;
          case '2':
            e.preventDefault();
            navigate('/chat');
            break;
          case ',':
            e.preventDefault();
            navigate('/settings');
            break;
          case '`':
            e.preventDefault();
            navigate('/terminal');
            break;
        }
      }

      // Git: Ctrl + Shift + G
      if (e.ctrlKey && e.shiftKey && e.key === 'g') {
        e.preventDefault();
        navigate('/git');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return {
    isCommandPaletteOpen,
    openCommandPalette: () => setIsCommandPaletteOpen(true),
    closeCommandPalette: () => setIsCommandPaletteOpen(false),
  };
}
