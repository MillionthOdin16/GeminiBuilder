import React from 'react';
import { Box, Typography } from '@mui/material';

interface TerminalPreviewProps {
  themeName: string;
}

const THEME_COLORS: Record<string, { bg: string; fg: string; accent: string; prompt: string }> = {
  light: { bg: '#ffffff', fg: '#202124', accent: '#1a73e8', prompt: '#202124' },
  dark: { bg: '#202124', fg: '#e8eaed', accent: '#8ab4f8', prompt: '#e8eaed' },
  GitHub: { bg: '#0d1117', fg: '#c9d1d9', accent: '#58a6ff', prompt: '#c9d1d9' },
  system: { bg: '#1e1e1e', fg: '#d4d4d4', accent: '#4ec9b0', prompt: '#d4d4d4' }, // Fallback to dark-ish
};

export default function TerminalPreview({ themeName }: TerminalPreviewProps) {
  const theme = THEME_COLORS[themeName] || THEME_COLORS.system;

  return (
    <Box
      sx={{
        bgcolor: theme.bg,
        color: theme.fg,
        p: 2,
        borderRadius: 2,
        fontFamily: 'monospace',
        border: '1px solid',
        borderColor: 'divider',
        minHeight: 150,
        boxShadow: 3
      }}
    >
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ff5f56' }} />
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ffbd2e' }} />
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#27c93f' }} />
      </Box>
      
      <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace' }}>
        <span style={{ color: theme.accent, fontWeight: 'bold' }}>user@gemini-cli</span>
        <span>:</span>
        <span style={{ color: '#a0a0a0' }}>~/project</span>
        <span>$ gemini</span>
      </Typography>
      
      <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', mt: 1 }}>
        <span style={{ color: theme.accent }}>gemini&gt;</span> Write a function to fibonacci
      </Typography>

      <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', mt: 1, whiteSpace: 'pre' }}>
{`def fibonacci(n):
  if n <= 1:
    return n
  else:
    return fibonacci(n-1) + fibonacci(n-2)`}
      </Typography>
    </Box>
  );
}
