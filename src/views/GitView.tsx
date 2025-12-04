/**
 * GitView - Git integration page
 */

import React from 'react';
import { Box, Paper } from '@mui/material';
import GitPanel from '../components/GitPanel';

export default function GitView() {
  return (
    <Box sx={{ height: '100%', p: 2 }}>
      <Paper sx={{ height: '100%', overflow: 'hidden' }}>
        <GitPanel />
      </Paper>
    </Box>
  );
}
