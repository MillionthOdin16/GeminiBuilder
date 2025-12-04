import React from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Switch,
  IconButton,
  Button,
  Card,
  CardContent,
  Tooltip,
} from '@mui/material';
import { Delete as DeleteIcon, DragIndicator as DragIcon, Add as AddIcon, Info as InfoIcon } from '@mui/icons-material';
import { useAppStore } from '../store/appStore';
import type { ContextSection } from '../types';

export default function ContextBuilder() {
  const { contextSections, addContextSection, updateContextSection, toggleContextSection, removeContextSection } = useAppStore();

  const handleAddSection = () => {
    const newSection: ContextSection = {
      id: crypto.randomUUID(),
      title: 'New Section',
      content: 'Add your instructions here...',
      enabled: true,
    };
    addContextSection(newSection);
  };

  const geminiMdPreview = contextSections
    .filter((s) => s.enabled)
    .map((s) => `# ${s.title}\n\n${s.content}`)
    .join('\n\n');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Context Builder (GEMINI.md)
        </Typography>
        <Tooltip title="GEMINI.md is a special file that provides persistent context to the CLI for every session in this project.">
            <IconButton color="primary"><InfoIcon /></IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Editor Column */}
        <Box sx={{ flex: 2, minWidth: 300 }}>
          <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
             <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddSection}>
                Add Section
             </Button>
             {/* Presets could go here */}
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {contextSections.map((section) => (
              <Card key={section.id} variant="outlined" sx={{ opacity: section.enabled ? 1 : 0.6 }}>
                <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                        <DragIcon color="action" sx={{ cursor: 'grab' }} />
                        <TextField
                            variant="standard"
                            value={section.title}
                            onChange={(e) => updateContextSection(section.id, { title: e.target.value })} 
                            placeholder="Section Title"
                            InputProps={{ disableUnderline: true, style: { fontWeight: 'bold', fontSize: '1.1rem' } }}
                            sx={{ flexGrow: 1 }}
                        />
                        <Switch 
                            checked={section.enabled} 
                            onChange={() => toggleContextSection(section.id)} 
                        />
                        <IconButton onClick={() => removeContextSection(section.id)} size="small">
                            <DeleteIcon />
                        </IconButton>
                    </Box>
                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        value={section.content}
                        onChange={(e) => updateContextSection(section.id, e.target.value)}
                        placeholder="Content..."
                        variant="outlined"
                        size="small"
                    />
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>

        {/* Preview Column */}
        <Box sx={{ flex: 1, minWidth: 300 }}>
            <Paper sx={{ p: 2, bgcolor: '#f5f5f5', height: '100%', overflow: 'auto' }}>
                <Typography variant="overline" display="block" gutterBottom>
                    Live Preview (GEMINI.md)
                </Typography>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {geminiMdPreview}
                </pre>
            </Paper>
        </Box>
      </Box>
    </Box>
  );
}
