import React from 'react';
import { Box, Typography } from '@mui/material';
import type { GeminiTheme } from '../types';

interface TerminalPreviewProps {
  themeName: string;
}

// Theme colors based on actual Gemini CLI themes
const THEME_COLORS: Record<GeminiTheme | string, { bg: string; fg: string; accent: string; prompt: string; code: string }> = {
  // Dark themes
  'Default': { bg: '#1a1a2e', fg: '#eaeaea', accent: '#4fc3f7', prompt: '#4fc3f7', code: '#81c784' },
  'ANSI': { bg: '#000000', fg: '#ffffff', accent: '#00ffff', prompt: '#00ff00', code: '#ffff00' },
  'Atom One': { bg: '#282c34', fg: '#abb2bf', accent: '#61afef', prompt: '#98c379', code: '#e5c07b' },
  'Ayu': { bg: '#0a0e14', fg: '#b3b1ad', accent: '#39bae6', prompt: '#c2d94c', code: '#ffb454' },
  'Dracula': { bg: '#282a36', fg: '#f8f8f2', accent: '#8be9fd', prompt: '#50fa7b', code: '#ffb86c' },
  'GitHub': { bg: '#0d1117', fg: '#c9d1d9', accent: '#58a6ff', prompt: '#7ee787', code: '#ffa657' },
  // Light themes
  'Default Light': { bg: '#ffffff', fg: '#24292e', accent: '#0366d6', prompt: '#22863a', code: '#6f42c1' },
  'ANSI Light': { bg: '#ffffff', fg: '#000000', accent: '#0000ff', prompt: '#008000', code: '#800080' },
  'Ayu Light': { bg: '#fafafa', fg: '#5c6166', accent: '#55b4d4', prompt: '#86b300', code: '#fa8d3e' },
  'GitHub Light': { bg: '#ffffff', fg: '#24292e', accent: '#0366d6', prompt: '#22863a', code: '#6f42c1' },
  'Google Code': { bg: '#ffffff', fg: '#000000', accent: '#1a73e8', prompt: '#188038', code: '#9334e6' },
  'Xcode': { bg: '#ffffff', fg: '#000000', accent: '#0e73cc', prompt: '#00716a', code: '#9c2191' },
};

export default function TerminalPreview({ themeName }: TerminalPreviewProps) {
  const theme = THEME_COLORS[themeName] || THEME_COLORS['Default'];
  const isDark = !themeName.toLowerCase().includes('light');

  return (
    <Box
      sx={{
        bgcolor: theme.bg,
        color: theme.fg,
        p: 2,
        borderRadius: 2,
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        minHeight: 180,
        boxShadow: 3,
        fontSize: '0.85rem',
        overflow: 'hidden',
      }}
    >
      {/* Window controls */}
      <Box sx={{ display: 'flex', gap: 0.75, mb: 2 }}>
        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ff5f56' }} />
        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ffbd2e' }} />
        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#27c93f' }} />
      </Box>
      
      {/* Terminal prompt */}
      <Typography component="div" sx={{ fontFamily: 'inherit', fontSize: 'inherit', mb: 1 }}>
        <Box component="span" sx={{ color: theme.accent, fontWeight: 600 }}>user@gemini-cli</Box>
        <Box component="span" sx={{ color: theme.fg, opacity: 0.6 }}>:</Box>
        <Box component="span" sx={{ color: theme.prompt }}>~/project</Box>
        <Box component="span" sx={{ color: theme.fg }}>$ gemini</Box>
      </Typography>
      
      {/* Gemini prompt */}
      <Typography component="div" sx={{ fontFamily: 'inherit', fontSize: 'inherit', mt: 2, mb: 1 }}>
        <Box component="span" sx={{ color: theme.accent, fontWeight: 600 }}>✨ gemini&gt;</Box>
        <Box component="span" sx={{ color: theme.fg }}> Write a hello world function</Box>
      </Typography>

      {/* Code output */}
      <Box sx={{ 
        bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', 
        p: 1.5, 
        borderRadius: 1,
        mt: 1,
      }}>
        <Typography component="pre" sx={{ 
          fontFamily: 'inherit', 
          fontSize: 'inherit', 
          m: 0,
          whiteSpace: 'pre-wrap',
          color: theme.code,
        }}>
{`function hello(name) {
  return \`Hello, \${name}!\`;
}`}
        </Typography>
      </Box>
    </Box>
  );
}
