/**
 * GitPanel - Git integration UI component
 * 
 * Shows git status, staged/unstaged files, commit interface
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Chip,
  Divider,
  Tooltip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  Collapse,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Commit as CommitIcon,
  CloudUpload as PushIcon,
  CloudDownload as PullIcon,
  Merge as MergeIcon,
  AccountTree as BranchIcon,
  History as HistoryIcon,
  Undo as UndoIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  ContentCopy as CopyIcon,
  Inventory as StashIcon,
} from '@mui/icons-material';
import { useWebSocket } from '../hooks/useWebSocket';

interface GitFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'unmerged';
  oldPath?: string;
}

interface GitStatus {
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  untracked: string[];
  branch: string;
  ahead: number;
  behind: number;
  hasConflicts: boolean;
  isClean: boolean;
}

interface GitBranch {
  name: string;
  current: boolean;
  tracking?: string;
  ahead?: number;
  behind?: number;
}

interface GitCommit {
  hash: string;
  shortHash: string;
  author: string;
  email: string;
  date: string;
  message: string;
}

interface GitStash {
  index: number;
  message: string;
  date: string;
}

const statusIcons: Record<string, React.ReactNode> = {
  added: <AddIcon color="success" fontSize="small" />,
  modified: <EditIcon color="warning" fontSize="small" />,
  deleted: <DeleteIcon color="error" fontSize="small" />,
  renamed: <EditIcon color="info" fontSize="small" />,
  copied: <CopyIcon fontSize="small" />,
  unmerged: <WarningIcon color="error" fontSize="small" />,
};

const statusColors: Record<string, string> = {
  added: '#4caf50',
  modified: '#ff9800',
  deleted: '#f44336',
  renamed: '#2196f3',
  copied: '#9c27b0',
  unmerged: '#f44336',
};

export default function GitPanel() {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [stashes, setStashes] = useState<GitStash[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [commitMessage, setCommitMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState({
    staged: true,
    unstaged: true,
    untracked: true,
  });
  const [branchMenuAnchor, setBranchMenuAnchor] = useState<null | HTMLElement>(null);
  const [newBranchDialog, setNewBranchDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [diffDialog, setDiffDialog] = useState<{ open: boolean; file: string; content: string }>({
    open: false,
    file: '',
    content: '',
  });

  const { sendMessage, subscribe, isConnected } = useWebSocket();

  // Fetch git status
  const fetchStatus = useCallback(async () => {
    if (!isConnected) return;
    
    setLoading(true);
    setError(null);
    
    sendMessage({ type: 'git:status' });
  }, [isConnected, sendMessage]);

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    if (!isConnected) return;
    sendMessage({ type: 'git:branches' });
  }, [isConnected, sendMessage]);

  // Fetch commit history
  const fetchCommits = useCallback(async () => {
    if (!isConnected) return;
    sendMessage({ type: 'git:log', payload: { limit: 50 } });
  }, [isConnected, sendMessage]);

  // Fetch stashes
  const fetchStashes = useCallback(async () => {
    if (!isConnected) return;
    sendMessage({ type: 'git:stash:list' });
  }, [isConnected, sendMessage]);

  // Subscribe to git responses
  useEffect(() => {
    const unsubStatus = subscribe('git:status:response', (msg) => {
      setLoading(false);
      const payload = msg.payload as { error?: string } & GitStatus;
      if (payload.error) {
        setError(payload.error);
      } else {
        setStatus(payload);
      }
    });

    const unsubBranches = subscribe('git:branches:response', (msg) => {
      const payload = msg.payload as { error?: string; branches: GitBranch[] };
      if (!payload.error) {
        setBranches(payload.branches);
      }
    });

    const unsubLog = subscribe('git:log:response', (msg) => {
      const payload = msg.payload as { error?: string; commits: GitCommit[] };
      if (!payload.error) {
        setCommits(payload.commits);
      }
    });

    const unsubStashes = subscribe('git:stash:list:response', (msg) => {
      const payload = msg.payload as { error?: string; stashes: GitStash[] };
      if (!payload.error) {
        setStashes(payload.stashes);
      }
    });

    const unsubDiff = subscribe('git:diff:response', (msg) => {
      const payload = msg.payload as { error?: string; file: string; diff: string };
      if (!payload.error) {
        setDiffDialog({
          open: true,
          file: payload.file,
          content: payload.diff,
        });
      }
    });

    return () => {
      unsubStatus();
      unsubBranches();
      unsubLog();
      unsubStashes();
      unsubDiff();
    };
  }, [subscribe]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
    fetchBranches();
    fetchCommits();
    fetchStashes();
  }, [fetchStatus, fetchBranches, fetchCommits, fetchStashes]);

  // Stage files
  const handleStage = (files: string[]) => {
    sendMessage({ type: 'git:stage', payload: { files } });
    setTimeout(fetchStatus, 500);
  };

  // Unstage files
  const handleUnstage = (files: string[]) => {
    sendMessage({ type: 'git:unstage', payload: { files } });
    setTimeout(fetchStatus, 500);
  };

  // Stage all
  const handleStageAll = () => {
    sendMessage({ type: 'git:stage:all' });
    setTimeout(fetchStatus, 500);
  };

  // Unstage all
  const handleUnstageAll = () => {
    sendMessage({ type: 'git:unstage:all' });
    setTimeout(fetchStatus, 500);
  };

  // Discard changes
  const handleDiscard = (files: string[]) => {
    if (window.confirm(`Discard changes to ${files.length} file(s)? This cannot be undone.`)) {
      sendMessage({ type: 'git:discard', payload: { files } });
      setTimeout(fetchStatus, 500);
    }
  };

  // Commit
  const handleCommit = () => {
    if (!commitMessage.trim()) {
      setError('Please enter a commit message');
      return;
    }
    
    sendMessage({ type: 'git:commit', payload: { message: commitMessage } });
    setCommitMessage('');
    setTimeout(() => {
      fetchStatus();
      fetchCommits();
    }, 500);
  };

  // Push
  const handlePush = () => {
    sendMessage({ type: 'git:push' });
    setTimeout(fetchStatus, 1000);
  };

  // Pull
  const handlePull = () => {
    sendMessage({ type: 'git:pull' });
    setTimeout(() => {
      fetchStatus();
      fetchCommits();
    }, 1000);
  };

  // Switch branch
  const handleSwitchBranch = (branchName: string) => {
    sendMessage({ type: 'git:checkout', payload: { branch: branchName } });
    setBranchMenuAnchor(null);
    setTimeout(() => {
      fetchStatus();
      fetchBranches();
      fetchCommits();
    }, 500);
  };

  // Create branch
  const handleCreateBranch = () => {
    if (!newBranchName.trim()) return;
    
    sendMessage({ type: 'git:branch:create', payload: { name: newBranchName } });
    setNewBranchName('');
    setNewBranchDialog(false);
    setTimeout(() => {
      fetchStatus();
      fetchBranches();
    }, 500);
  };

  // View diff
  const handleViewDiff = (file: string, staged: boolean) => {
    sendMessage({ type: 'git:diff', payload: { file, staged } });
  };

  // Stash
  const handleStash = () => {
    sendMessage({ type: 'git:stash:push', payload: { message: 'Stashed changes' } });
    setTimeout(() => {
      fetchStatus();
      fetchStashes();
    }, 500);
  };

  // Pop stash
  const handleStashPop = (index: number) => {
    sendMessage({ type: 'git:stash:pop', payload: { index } });
    setTimeout(() => {
      fetchStatus();
      fetchStashes();
    }, 500);
  };

  // Toggle section
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // File item component
  const FileItem = ({ 
    file, 
    status: fileStatus, 
    staged,
    isUntracked = false,
  }: { 
    file: string; 
    status?: string;
    staged?: boolean;
    isUntracked?: boolean;
  }) => (
    <ListItem dense>
      <ListItemIcon sx={{ minWidth: 32 }}>
        {isUntracked ? (
          <AddIcon color="success" fontSize="small" />
        ) : (
          statusIcons[fileStatus || 'modified']
        )}
      </ListItemIcon>
      <ListItemText 
        primary={file}
        primaryTypographyProps={{
          sx: {
            fontSize: '0.875rem',
            fontFamily: 'monospace',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }
        }}
      />
      <ListItemSecondaryAction>
        {!isUntracked && (
          <Tooltip title="View diff">
            <IconButton 
              size="small" 
              onClick={() => handleViewDiff(file, !!staged)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {staged ? (
          <Tooltip title="Unstage">
            <IconButton 
              size="small" 
              onClick={() => handleUnstage([file])}
            >
              <RemoveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <>
            <Tooltip title="Stage">
              <IconButton 
                size="small" 
                onClick={() => handleStage([file])}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {!isUntracked && (
              <Tooltip title="Discard changes">
                <IconButton 
                  size="small" 
                  color="error"
                  onClick={() => handleDiscard([file])}
                >
                  <UndoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      </ListItemSecondaryAction>
    </ListItem>
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

  if (error && !status) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert 
          severity="warning" 
          action={
            <Button color="inherit" size="small" onClick={fetchStatus}>
              Retry
            </Button>
          }
        >
          {error || 'Not a git repository or git is not available'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 1, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            startIcon={<BranchIcon />}
            onClick={(e) => setBranchMenuAnchor(e.currentTarget)}
          >
            {status?.branch || 'main'}
          </Button>
          
          {status && (
            <>
              {status.ahead > 0 && (
                <Chip 
                  size="small" 
                  label={`↑ ${status.ahead}`} 
                  color="primary" 
                  variant="outlined" 
                />
              )}
              {status.behind > 0 && (
                <Chip 
                  size="small" 
                  label={`↓ ${status.behind}`} 
                  color="warning" 
                  variant="outlined" 
                />
              )}
              {status.isClean && (
                <Chip 
                  size="small" 
                  icon={<CheckIcon />}
                  label="Clean" 
                  color="success" 
                  variant="outlined" 
                />
              )}
              {status.hasConflicts && (
                <Chip 
                  size="small" 
                  icon={<ErrorIcon />}
                  label="Conflicts" 
                  color="error" 
                />
              )}
            </>
          )}
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Tooltip title="Stash changes">
            <IconButton size="small" onClick={handleStash}>
              <StashIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Pull">
            <IconButton size="small" onClick={handlePull}>
              <PullIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Push">
            <IconButton size="small" onClick={handlePush}>
              <PushIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={fetchStatus}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Tabs */}
      <Tabs 
        value={tab} 
        onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 36 }}
      >
        <Tab label="Changes" sx={{ minHeight: 36, py: 0 }} />
        <Tab 
          label={
            <Badge badgeContent={stashes.length} color="primary">
              Stashes
            </Badge>
          } 
          sx={{ minHeight: 36, py: 0 }} 
        />
        <Tab label="History" sx={{ minHeight: 36, py: 0 }} />
        <Tab label="Branches" sx={{ minHeight: 36, py: 0 }} />
      </Tabs>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            {/* Changes tab */}
            {tab === 0 && status && (
              <Box>
                {/* Staged section */}
                <Box 
                  sx={{ 
                    px: 1, 
                    py: 0.5, 
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleSection('staged')}
                >
                  {expandedSections.staged ? <CollapseIcon /> : <ExpandIcon />}
                  <Typography variant="subtitle2" sx={{ ml: 1, flexGrow: 1 }}>
                    Staged Changes ({status.staged.length})
                  </Typography>
                  {status.staged.length > 0 && (
                    <Button size="small" onClick={(e) => { e.stopPropagation(); handleUnstageAll(); }}>
                      Unstage All
                    </Button>
                  )}
                </Box>
                <Collapse in={expandedSections.staged}>
                  <List dense disablePadding>
                    {status.staged.map((file) => (
                      <FileItem 
                        key={file.path} 
                        file={file.path} 
                        status={file.status}
                        staged 
                      />
                    ))}
                    {status.staged.length === 0 && (
                      <ListItem>
                        <ListItemText 
                          secondary="No staged changes"
                          sx={{ textAlign: 'center' }}
                        />
                      </ListItem>
                    )}
                  </List>
                </Collapse>

                {/* Unstaged section */}
                <Box 
                  sx={{ 
                    px: 1, 
                    py: 0.5, 
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleSection('unstaged')}
                >
                  {expandedSections.unstaged ? <CollapseIcon /> : <ExpandIcon />}
                  <Typography variant="subtitle2" sx={{ ml: 1, flexGrow: 1 }}>
                    Changes ({status.unstaged.length})
                  </Typography>
                  {status.unstaged.length > 0 && (
                    <Button size="small" onClick={(e) => { e.stopPropagation(); handleStageAll(); }}>
                      Stage All
                    </Button>
                  )}
                </Box>
                <Collapse in={expandedSections.unstaged}>
                  <List dense disablePadding>
                    {status.unstaged.map((file) => (
                      <FileItem 
                        key={file.path} 
                        file={file.path} 
                        status={file.status}
                      />
                    ))}
                    {status.unstaged.length === 0 && (
                      <ListItem>
                        <ListItemText 
                          secondary="No changes"
                          sx={{ textAlign: 'center' }}
                        />
                      </ListItem>
                    )}
                  </List>
                </Collapse>

                {/* Untracked section */}
                <Box 
                  sx={{ 
                    px: 1, 
                    py: 0.5, 
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleSection('untracked')}
                >
                  {expandedSections.untracked ? <CollapseIcon /> : <ExpandIcon />}
                  <Typography variant="subtitle2" sx={{ ml: 1, flexGrow: 1 }}>
                    Untracked ({status.untracked.length})
                  </Typography>
                </Box>
                <Collapse in={expandedSections.untracked}>
                  <List dense disablePadding>
                    {status.untracked.map((file) => (
                      <FileItem 
                        key={file} 
                        file={file}
                        isUntracked
                      />
                    ))}
                    {status.untracked.length === 0 && (
                      <ListItem>
                        <ListItemText 
                          secondary="No untracked files"
                          sx={{ textAlign: 'center' }}
                        />
                      </ListItem>
                    )}
                  </List>
                </Collapse>

                {/* Commit box */}
                {status.staged.length > 0 && (
                  <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      placeholder="Commit message..."
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      size="small"
                    />
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<CommitIcon />}
                      onClick={handleCommit}
                      disabled={!commitMessage.trim()}
                      sx={{ mt: 1 }}
                    >
                      Commit ({status.staged.length} file{status.staged.length > 1 ? 's' : ''})
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {/* Stashes tab */}
            {tab === 1 && (
              <List dense>
                {stashes.map((stash) => (
                  <ListItem key={stash.index}>
                    <ListItemIcon>
                      <StashIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={stash.message}
                      secondary={`stash@{${stash.index}}`}
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Apply stash">
                        <IconButton 
                          size="small"
                          onClick={() => handleStashPop(stash.index)}
                        >
                          <CheckIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {stashes.length === 0 && (
                  <ListItem>
                    <ListItemText 
                      secondary="No stashes"
                      sx={{ textAlign: 'center' }}
                    />
                  </ListItem>
                )}
              </List>
            )}

            {/* History tab */}
            {tab === 2 && (
              <List dense>
                {commits.map((commit) => (
                  <ListItem key={commit.hash}>
                    <ListItemIcon>
                      <CommitIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={commit.message}
                      secondary={
                        <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Typography variant="caption" component="span" sx={{ fontFamily: 'monospace' }}>
                            {commit.shortHash}
                          </Typography>
                          <Typography variant="caption" component="span" color="text.secondary">
                            {commit.author}
                          </Typography>
                          <Typography variant="caption" component="span" color="text.secondary">
                            {new Date(commit.date).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Copy hash">
                        <IconButton 
                          size="small"
                          onClick={() => navigator.clipboard.writeText(commit.hash)}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}

            {/* Branches tab */}
            {tab === 3 && (
              <Box>
                <Box sx={{ p: 1 }}>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => setNewBranchDialog(true)}
                    size="small"
                  >
                    New Branch
                  </Button>
                </Box>
                <List dense>
                  {branches.map((branch) => (
                    <ListItem 
                      key={branch.name}
                      sx={{ 
                        bgcolor: branch.current ? 'action.selected' : 'transparent',
                      }}
                    >
                      <ListItemIcon>
                        {branch.current ? (
                          <CheckIcon color="primary" fontSize="small" />
                        ) : (
                          <BranchIcon fontSize="small" />
                        )}
                      </ListItemIcon>
                      <ListItemText 
                        primary={branch.name}
                        secondary={branch.tracking}
                      />
                      {!branch.current && (
                        <ListItemSecondaryAction>
                          <Button 
                            size="small"
                            onClick={() => handleSwitchBranch(branch.name)}
                          >
                            Checkout
                          </Button>
                        </ListItemSecondaryAction>
                      )}
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Branch menu */}
      <Menu
        anchorEl={branchMenuAnchor}
        open={Boolean(branchMenuAnchor)}
        onClose={() => setBranchMenuAnchor(null)}
      >
        {branches.map((branch) => (
          <MenuItem 
            key={branch.name}
            onClick={() => handleSwitchBranch(branch.name)}
            selected={branch.current}
          >
            {branch.current && <CheckIcon fontSize="small" sx={{ mr: 1 }} />}
            {branch.name}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => { setBranchMenuAnchor(null); setNewBranchDialog(true); }}>
          <AddIcon fontSize="small" sx={{ mr: 1 }} />
          New Branch
        </MenuItem>
      </Menu>

      {/* New branch dialog */}
      <Dialog 
        open={newBranchDialog} 
        onClose={() => setNewBranchDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Create New Branch</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Branch name"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewBranchDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateBranch}
            disabled={!newBranchName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diff dialog */}
      <Dialog 
        open={diffDialog.open} 
        onClose={() => setDiffDialog({ open: false, file: '', content: '' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {diffDialog.file}
        </DialogTitle>
        <DialogContent>
          <Box
            component="pre"
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              overflow: 'auto',
              bgcolor: 'grey.900',
              color: 'grey.100',
              p: 2,
              borderRadius: 1,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {diffDialog.content || 'No changes'}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiffDialog({ open: false, file: '', content: '' })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
