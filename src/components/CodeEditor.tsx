/**
 * CodeEditor - Monaco-based code editor component
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import type { OnMount, OnChange } from '@monaco-editor/react';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  Breadcrumbs,
  Chip,
  Tooltip,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  ContentCopy as CopyIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import type { OpenFile } from '../lib/file-utils';

interface CodeEditorProps {
  files?: OpenFile[];
  activeFile?: string;
  onSave?: (path: string, content: string) => Promise<void>;
  onClose?: (path: string) => void;
  onTabChange?: (path: string) => void;
  theme?: 'vs-dark' | 'light' | 'vs';
}

export default function CodeEditor({
  files = [],
  activeFile,
  onSave,
  onClose,
  onTabChange,
  theme = 'vs-dark',
}: CodeEditorProps) {
  const [localFiles, setLocalFiles] = useState<OpenFile[]>(files);
  const [currentFile, setCurrentFile] = useState<string | undefined>(activeFile);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<unknown>(null);

  // Sync with props
  useEffect(() => {
    setLocalFiles(files);
  }, [files]);

  useEffect(() => {
    setCurrentFile(activeFile);
  }, [activeFile]);

  // Get current file data
  const currentFileData = localFiles.find((f) => f.path === currentFile);

  // Handle editor mount
  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
    
    // Add keyboard shortcuts
    editor.addAction({
      id: 'save',
      label: 'Save',
      keybindings: [2048 + 49], // Ctrl+S
      run: () => handleSave(),
    });
  };

  // Handle content change
  const handleChange: OnChange = useCallback(
    (value) => {
      if (!currentFile || value === undefined) return;

      setLocalFiles((prev) =>
        prev.map((f) =>
          f.path === currentFile
            ? { ...f, content: value, isDirty: f.content !== value }
            : f
        )
      );
    },
    [currentFile]
  );

  // Handle save
  const handleSave = useCallback(async () => {
    if (!currentFile || !currentFileData || !onSave) return;

    setIsSaving(true);
    try {
      await onSave(currentFile, currentFileData.content);
      setLocalFiles((prev) =>
        prev.map((f) =>
          f.path === currentFile ? { ...f, isDirty: false } : f
        )
      );
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  }, [currentFile, currentFileData, onSave]);

  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    setCurrentFile(newValue);
    onTabChange?.(newValue);
  };

  // Handle tab close
  const handleTabClose = (path: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const file = localFiles.find((f) => f.path === path);
    if (file?.isDirty) {
      const confirmed = window.confirm(
        `"${file.name}" has unsaved changes. Close anyway?`
      );
      if (!confirmed) return;
    }

    onClose?.(path);
    
    // Select another tab if closing current
    if (currentFile === path) {
      const remaining = localFiles.filter((f) => f.path !== path);
      if (remaining.length > 0) {
        setCurrentFile(remaining[0].path);
      } else {
        setCurrentFile(undefined);
      }
    }
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    if (currentFileData) {
      navigator.clipboard.writeText(currentFileData.content);
    }
  };

  // Editor actions
  const undo = () => {
    const editor = editorRef.current as { trigger?: (source: string, handlerId: string, payload?: unknown) => void };
    if (editor && typeof editor.trigger === 'function') {
      editor.trigger('keyboard', 'undo', undefined);
    }
  };

  const redo = () => {
    const editor = editorRef.current as { trigger?: (source: string, handlerId: string, payload?: unknown) => void };
    if (editor && typeof editor.trigger === 'function') {
      editor.trigger('keyboard', 'redo', undefined);
    }
  };

  const findReplace = () => {
    const editor = editorRef.current as { trigger?: (source: string, handlerId: string, payload?: unknown) => void };
    if (editor && typeof editor.trigger === 'function') {
      editor.trigger('keyboard', 'actions.find', undefined);
    }
  };

  if (localFiles.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          bgcolor: theme === 'vs-dark' ? '#1e1e1e' : '#ffffff',
          color: theme === 'vs-dark' ? '#d4d4d4' : '#333333',
        }}
      >
        <Typography variant="h6" sx={{ mb: 1, opacity: 0.7 }}>
          No files open
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.5 }}>
          Select a file from the explorer to edit
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs */}
      <Paper sx={{ bgcolor: theme === 'vs-dark' ? '#252526' : '#f3f3f3' }} elevation={0}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tabs
            value={currentFile || false}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              flexGrow: 1,
              minHeight: 36,
              '& .MuiTab-root': {
                minHeight: 36,
                py: 0,
                px: 2,
                textTransform: 'none',
              },
            }}
          >
            {localFiles.map((file) => (
              <Tab
                key={file.path}
                value={file.path}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {file.name}
                    </Typography>
                    {file.isDirty && (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: 'warning.main',
                        }}
                      />
                    )}
                    <IconButton
                      size="small"
                      onClick={(e) => handleTabClose(file.path, e)}
                      sx={{ ml: 0.5, p: 0.25 }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                }
                sx={{
                  '&.Mui-selected': {
                    bgcolor: theme === 'vs-dark' ? '#1e1e1e' : '#ffffff',
                  },
                }}
              />
            ))}
          </Tabs>
        </Box>
      </Paper>

      {/* Toolbar */}
      {currentFileData && (
        <Paper
          sx={{
            p: 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: theme === 'vs-dark' ? '#333333' : '#e8e8e8',
          }}
          elevation={0}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="Save (Ctrl+S)">
              <span>
                <IconButton
                  size="small"
                  onClick={handleSave}
                  disabled={!currentFileData.isDirty || isSaving}
                >
                  {isSaving ? (
                    <CircularProgress size={18} />
                  ) : (
                    <SaveIcon fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Undo (Ctrl+Z)">
              <IconButton size="small" onClick={undo}>
                <UndoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Redo (Ctrl+Y)">
              <IconButton size="small" onClick={redo}>
                <RedoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Find (Ctrl+F)">
              <IconButton size="small" onClick={findReplace}>
                <SearchIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy All">
              <IconButton size="small" onClick={copyToClipboard}>
                <CopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Breadcrumbs
              maxItems={3}
              sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
            >
              {currentFileData.path.split('/').map((part, index, arr) => (
                <Typography
                  key={index}
                  variant="caption"
                  color={index === arr.length - 1 ? 'text.primary' : 'inherit'}
                >
                  {part}
                </Typography>
              ))}
            </Breadcrumbs>
            <Chip
              size="small"
              label={currentFileData.language}
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          </Box>
        </Paper>
      )}

      {/* Editor */}
      <Box sx={{ flexGrow: 1 }}>
        {currentFileData && (
          <Editor
            height="100%"
            language={currentFileData.language}
            value={currentFileData.content}
            theme={theme}
            onChange={handleChange}
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              lineNumbers: 'on',
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              renderWhitespace: 'selection',
              bracketPairColorization: { enabled: true },
              formatOnPaste: true,
              formatOnType: true,
              tabSize: 2,
              insertSpaces: true,
            }}
          />
        )}
      </Box>

      {/* Status Bar */}
      {currentFileData && (
        <Paper
          sx={{
            px: 2,
            py: 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: theme === 'vs-dark' ? '#007acc' : '#007acc',
            color: 'white',
          }}
          elevation={0}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption">
              {currentFileData.isDirty ? '● Modified' : '✓ Saved'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption">
              {currentFileData.language.toUpperCase()}
            </Typography>
            <Typography variant="caption">UTF-8</Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
