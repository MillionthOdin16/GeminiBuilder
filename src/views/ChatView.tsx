/**
 * ChatView - Main chat interface view
 */

import React from 'react';
import { Box, Paper } from '@mui/material';
import ChatInterface from '../components/ChatInterface';
import FileExplorer from '../components/FileExplorer';

export default function ChatView() {
  return (
    <Box sx={{ height: 'calc(100vh - 130px)', display: 'flex', gap: 2 }}>
      {/* File Explorer Sidebar */}
      <Paper sx={{ width: 300, minWidth: 250, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <FileExplorer
          onFileSelect={(file) => console.log('Selected:', file)}
          onFileOpen={(file, content) => console.log('Opened:', file, content.length, 'chars')}
        />
      </Paper>

      {/* Main Chat Area */}
      <Paper sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <ChatInterface />
      </Paper>
    </Box>
  );
}
