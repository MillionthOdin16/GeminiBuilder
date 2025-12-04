/**
 * SnippetsView - Code snippets page
 */

import React from 'react';
import { Box } from '@mui/material';
import SnippetLibrary from '../components/SnippetLibrary';

export default function SnippetsView() {
  return (
    <Box sx={{ height: '100%' }}>
      <SnippetLibrary />
    </Box>
  );
}
