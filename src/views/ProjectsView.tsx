/**
 * ProjectsView - Project management page
 */

import React from 'react';
import { Box } from '@mui/material';
import ProjectManager from '../components/ProjectManager';

export default function ProjectsView() {
  return (
    <Box sx={{ height: '100%' }}>
      <ProjectManager />
    </Box>
  );
}
