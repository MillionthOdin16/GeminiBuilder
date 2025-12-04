/**
 * EditorView - Code editor view with file explorer
 */

import React, { useState, useCallback } from 'react';
import { Box, Paper } from '@mui/material';
import FileExplorer from '../components/FileExplorer';
import CodeEditor from '../components/CodeEditor';
import { getLanguage } from '../lib/file-utils';
import type { OpenFile } from '../lib/file-utils';
import type { FileEntry } from '../hooks/useFiles';

export default function EditorView() {
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | undefined>();

  // Handle file open from explorer
  const handleFileOpen = useCallback((file: FileEntry, content: string) => {
    // Check if already open
    const existing = openFiles.find((f) => f.path === file.path);
    if (existing) {
      setActiveFile(file.path);
      return;
    }

    // Add new file
    const newFile: OpenFile = {
      path: file.path,
      name: file.name,
      content,
      isDirty: false,
      language: getLanguage(file.name),
    };

    setOpenFiles((prev) => [...prev, newFile]);
    setActiveFile(file.path);
  }, [openFiles]);

  // Handle file save
  const handleSave = useCallback(async (path: string, content: string) => {
    // In a real implementation, this would use the WebSocket to save
    console.log('Saving file:', path, content.length, 'chars');
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    setOpenFiles((prev) =>
      prev.map((f) => (f.path === path ? { ...f, content, isDirty: false } : f))
    );
  }, []);

  // Handle file close
  const handleClose = useCallback((path: string) => {
    setOpenFiles((prev) => prev.filter((f) => f.path !== path));
    
    // Select another file if closing active
    if (activeFile === path) {
      const remaining = openFiles.filter((f) => f.path !== path);
      setActiveFile(remaining.length > 0 ? remaining[0].path : undefined);
    }
  }, [activeFile, openFiles]);

  // Handle tab change
  const handleTabChange = useCallback((path: string) => {
    setActiveFile(path);
  }, []);

  return (
    <Box sx={{ height: 'calc(100vh - 130px)', display: 'flex', gap: 2 }}>
      {/* File Explorer Sidebar */}
      <Paper
        sx={{
          width: 280,
          minWidth: 200,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <FileExplorer onFileOpen={handleFileOpen} />
      </Paper>

      {/* Code Editor */}
      <Paper
        sx={{
          flexGrow: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <CodeEditor
          files={openFiles}
          activeFile={activeFile}
          onSave={handleSave}
          onClose={handleClose}
          onTabChange={handleTabChange}
          theme="vs-dark"
        />
      </Paper>
    </Box>
  );
}
