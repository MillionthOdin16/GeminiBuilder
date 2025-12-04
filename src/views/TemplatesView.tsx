/**
 * TemplatesView - Prompt templates page
 */

import React from 'react';
import { Box } from '@mui/material';
import PromptTemplates from '../components/PromptTemplates';
import { useNavigate } from 'react-router-dom';

export default function TemplatesView() {
  const navigate = useNavigate();
  
  const handleUseTemplate = (prompt: string) => {
    // Navigate to chat with the prompt
    navigate('/chat', { state: { initialPrompt: prompt } });
  };

  return (
    <Box sx={{ height: '100%' }}>
      <PromptTemplates onUseTemplate={handleUseTemplate} />
    </Box>
  );
}
