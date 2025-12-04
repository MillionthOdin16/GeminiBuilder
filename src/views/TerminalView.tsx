/**
 * TerminalView - Terminal emulator page
 */

import React from 'react';
import { Box } from '@mui/material';
import Terminal from '../components/Terminal';

export default function TerminalView() {
  return (
    <Box sx={{ height: '100%', p: 2 }}>
      <Terminal />
    </Box>
  );
}
