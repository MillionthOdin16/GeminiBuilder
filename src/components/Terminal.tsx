/**
 * Terminal - Full terminal emulator component using xterm.js
 * 
 * Provides command execution with output streaming
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Clear as ClearIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
  ContentCopy as CopyIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as ExitFullscreenIcon,
} from '@mui/icons-material';
import { useWebSocket } from '../hooks/useWebSocket';

interface TerminalTab {
  id: string;
  name: string;
  history: string[];
}

interface TerminalProps {
  workingDirectory?: string;
  onClose?: () => void;
  initialCommand?: string;
}

// Simple terminal implementation without xterm.js dependency
// Can be upgraded to xterm.js for full features
export default function Terminal({ 
  workingDirectory,
  onClose,
  initialCommand,
}: TerminalProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: 'main', name: 'Terminal', history: [] },
  ]);
  const [activeTab, setActiveTab] = useState('main');
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; tabId: string; name: string }>({
    open: false,
    tabId: '',
    name: '',
  });
  const [tabMenuAnchor, setTabMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuTabId, setMenuTabId] = useState<string | null>(null);
  
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { sendMessage, subscribe, isConnected } = useWebSocket();

  // Get current tab
  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  // Scroll to bottom when output changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [currentTab?.history]);

  // Subscribe to terminal output
  useEffect(() => {
    const unsubOutput = subscribe('terminal:output', (msg) => {
      const payload = msg.payload as { tabId?: string; content: string; isError?: boolean };
      const { tabId, content, isError } = payload;
      
      setTabs(prev => prev.map(tab => {
        if (tab.id === (tabId || activeTab)) {
          return {
            ...tab,
            history: [
              ...tab.history,
              isError ? `\x1b[31m${content}\x1b[0m` : content,
            ],
          };
        }
        return tab;
      }));
    });

    const unsubComplete = subscribe('terminal:complete', (msg) => {
      const payload = msg.payload as { tabId?: string; exitCode: number };
      const { tabId, exitCode } = payload;
      
      setTabs(prev => prev.map(tab => {
        if (tab.id === (tabId || activeTab)) {
          return {
            ...tab,
            history: [
              ...tab.history,
              `\n[Process exited with code ${exitCode}]\n`,
            ],
          };
        }
        return tab;
      }));
    });

    return () => {
      unsubOutput();
      unsubComplete();
    };
  }, [subscribe, activeTab]);

  // Run initial command if provided
  useEffect(() => {
    if (initialCommand && isConnected) {
      executeCommand(initialCommand);
    }
  }, [initialCommand, isConnected]);

  // Execute command
  const executeCommand = useCallback((cmd: string) => {
    if (!cmd.trim()) return;

    // Add to history display
    setTabs(prev => prev.map(tab => {
      if (tab.id === activeTab) {
        return {
          ...tab,
          history: [...tab.history, `$ ${cmd}`],
        };
      }
      return tab;
    }));

    // Add to command history
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);

    // Send to server
    sendMessage({
      type: 'terminal:exec',
      payload: {
        command: cmd,
        tabId: activeTab,
        cwd: workingDirectory,
      },
    });

    setInput('');
  }, [activeTab, sendMessage, workingDirectory]);

  // Handle input keydown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 
          ? commandHistory.length - 1 
          : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex]);
        }
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      // Send SIGINT
      sendMessage({
        type: 'terminal:signal',
        payload: { tabId: activeTab, signal: 'SIGINT' },
      });
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      handleClear();
    }
  };

  // Clear terminal
  const handleClear = () => {
    setTabs(prev => prev.map(tab => {
      if (tab.id === activeTab) {
        return { ...tab, history: [] };
      }
      return tab;
    }));
  };

  // Add new tab
  const handleAddTab = () => {
    const id = `tab-${Date.now()}`;
    setTabs(prev => [...prev, { id, name: `Terminal ${prev.length + 1}`, history: [] }]);
    setActiveTab(id);
  };

  // Close tab
  const handleCloseTab = (tabId: string) => {
    if (tabs.length === 1) return; // Don't close last tab
    
    // Kill any running process
    sendMessage({
      type: 'terminal:kill',
      payload: { tabId },
    });
    
    setTabs(prev => prev.filter(t => t.id !== tabId));
    if (activeTab === tabId) {
      setActiveTab(tabs[0].id);
    }
    setTabMenuAnchor(null);
  };

  // Rename tab
  const handleRenameTab = () => {
    if (!renameDialog.name.trim()) return;
    
    setTabs(prev => prev.map(tab => {
      if (tab.id === renameDialog.tabId) {
        return { ...tab, name: renameDialog.name };
      }
      return tab;
    }));
    
    setRenameDialog({ open: false, tabId: '', name: '' });
  };

  // Copy output
  const handleCopy = () => {
    const text = currentTab.history.join('\n');
    navigator.clipboard.writeText(text);
  };

  // Parse ANSI colors (simplified)
  const parseAnsi = (text: string): React.ReactNode => {
    // Simple ANSI color parsing
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    const colorMap: Record<string, string> = {
      '30': '#000',
      '31': '#f44336',
      '32': '#4caf50',
      '33': '#ff9800',
      '34': '#2196f3',
      '35': '#9c27b0',
      '36': '#00bcd4',
      '37': '#fff',
      '90': '#666',
      '91': '#ff6b6b',
      '92': '#69db7c',
      '93': '#ffd43b',
      '94': '#74c0fc',
      '95': '#da77f2',
      '96': '#66d9e8',
      '97': '#f8f9fa',
    };

    while (remaining) {
      const match = remaining.match(/\x1b\[(\d+)m/);
      if (!match) {
        parts.push(remaining);
        break;
      }

      // Add text before the escape sequence
      if (match.index && match.index > 0) {
        parts.push(remaining.slice(0, match.index));
      }

      // Find the end of the colored section
      const color = colorMap[match[1]] || 'inherit';
      const endMatch = remaining.slice((match.index || 0) + match[0].length).match(/\x1b\[0?m/);
      
      if (endMatch && endMatch.index !== undefined) {
        const coloredText = remaining.slice(
          (match.index || 0) + match[0].length,
          (match.index || 0) + match[0].length + endMatch.index
        );
        parts.push(
          <span key={key++} style={{ color }}>
            {coloredText}
          </span>
        );
        remaining = remaining.slice(
          (match.index || 0) + match[0].length + endMatch.index + endMatch[0].length
        );
      } else {
        remaining = remaining.slice((match.index || 0) + match[0].length);
      }
    }

    return parts;
  };

  return (
    <Paper 
      sx={{ 
        height: isFullscreen ? '100vh' : '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#1e1e1e',
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        right: isFullscreen ? 0 : 'auto',
        bottom: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 9999 : 'auto',
      }}
    >
      {/* Header */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          bgcolor: '#2d2d2d',
          borderBottom: '1px solid #444',
          minHeight: 36,
        }}
      >
        {/* Tabs */}
        <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'auto' }}>
          {tabs.map((tab) => (
            <Box
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenuTabId(tab.id);
                setTabMenuAnchor(e.currentTarget);
              }}
              sx={{
                px: 2,
                py: 0.5,
                cursor: 'pointer',
                bgcolor: tab.id === activeTab ? '#1e1e1e' : 'transparent',
                borderRight: '1px solid #444',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                '&:hover': {
                  bgcolor: tab.id === activeTab ? '#1e1e1e' : '#3d3d3d',
                },
              }}
            >
              <Typography 
                variant="caption" 
                sx={{ color: tab.id === activeTab ? '#fff' : '#888' }}
              >
                {tab.name}
              </Typography>
              {tabs.length > 1 && (
                <CloseIcon 
                  fontSize="small" 
                  sx={{ 
                    fontSize: 14, 
                    color: '#888',
                    '&:hover': { color: '#fff' },
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(tab.id);
                  }}
                />
              )}
            </Box>
          ))}
          <IconButton size="small" onClick={handleAddTab} sx={{ color: '#888' }}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', px: 1 }}>
          <Tooltip title="Copy output">
            <IconButton size="small" onClick={handleCopy} sx={{ color: '#888' }}>
              <CopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear">
            <IconButton size="small" onClick={handleClear} sx={{ color: '#888' }}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
            <IconButton 
              size="small" 
              onClick={() => setIsFullscreen(!isFullscreen)}
              sx={{ color: '#888' }}
            >
              {isFullscreen ? <ExitFullscreenIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          {onClose && (
            <Tooltip title="Close terminal">
              <IconButton size="small" onClick={onClose} sx={{ color: '#888' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Output */}
      <Box
        ref={outputRef}
        onClick={() => inputRef.current?.focus()}
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 1,
          fontFamily: '"Cascadia Code", "Fira Code", Consolas, Monaco, monospace',
          fontSize: '0.875rem',
          lineHeight: 1.5,
          color: '#d4d4d4',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {currentTab.history.map((line, i) => (
          <div key={i}>{parseAnsi(line)}</div>
        ))}
        
        {/* Input line */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography 
            component="span" 
            sx={{ 
              color: '#4ec9b0',
              fontFamily: 'inherit',
              fontSize: 'inherit',
            }}
          >
            $&nbsp;
          </Typography>
          <TextField
            inputRef={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            variant="standard"
            fullWidth
            autoComplete="off"
            InputProps={{
              disableUnderline: true,
              sx: {
                color: '#d4d4d4',
                fontFamily: '"Cascadia Code", "Fira Code", Consolas, Monaco, monospace',
                fontSize: '0.875rem',
              },
            }}
            sx={{
              '& .MuiInput-root': {
                '&::before, &::after': {
                  display: 'none',
                },
              },
            }}
          />
        </Box>
      </Box>

      {/* Tab context menu */}
      <Menu
        anchorEl={tabMenuAnchor}
        open={Boolean(tabMenuAnchor)}
        onClose={() => setTabMenuAnchor(null)}
      >
        <MenuItem 
          onClick={() => {
            const tab = tabs.find(t => t.id === menuTabId);
            if (tab) {
              setRenameDialog({ open: true, tabId: tab.id, name: tab.name });
            }
            setTabMenuAnchor(null);
          }}
        >
          Rename
        </MenuItem>
        <MenuItem 
          onClick={() => {
            if (menuTabId) handleCloseTab(menuTabId);
          }}
          disabled={tabs.length === 1}
        >
          Close
        </MenuItem>
      </Menu>

      {/* Rename dialog */}
      <Dialog 
        open={renameDialog.open} 
        onClose={() => setRenameDialog({ open: false, tabId: '', name: '' })}
      >
        <DialogTitle>Rename Tab</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            value={renameDialog.name}
            onChange={(e) => setRenameDialog(prev => ({ ...prev, name: e.target.value }))}
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialog({ open: false, tabId: '', name: '' })}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleRenameTab}>
            Rename
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
