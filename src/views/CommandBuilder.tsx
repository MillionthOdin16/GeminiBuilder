import React from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Alert,
  ListItemButton,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Save as SaveIcon } from '@mui/icons-material';
import { useAppStore } from '../store/appStore';
import type { CustomCommand } from '../types';

export default function CommandBuilder() {
  const { commands, addCommand, updateCommand, removeCommand } = useAppStore();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  
  // Form state
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [prompt, setPrompt] = React.useState('');

  const handleEdit = (cmd: CustomCommand) => {
      setEditingId(cmd.id);
      setName(cmd.name);
      setDescription(cmd.description);
      setPrompt(cmd.prompt);
  };

  const handleNew = () => {
      setEditingId(null);
      setName('');
      setDescription('');
      setPrompt('');
  };

  const handleSave = () => {
      if (!name || !prompt) return;

      if (editingId) {
          updateCommand(editingId, { name, description, prompt });
      } else {
          addCommand({
              id: crypto.randomUUID(),
              name,
              description,
              prompt
          });
      }
      handleNew();
  };

  const previewToml = editingId || (name || prompt) ? 
`# Invoked as: /${name || 'command'}
description = "${description}"

prompt = """
${prompt}
"""` : '# Select a command to preview TOML';

  return (
    <Box>
       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Custom Command Builder
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* List Column */}
        <Box sx={{ flex: 1, minWidth: 300 }}>
            <Paper sx={{ height: '100%' }}>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Commands</Typography>
                    <Button startIcon={<AddIcon />} size="small" onClick={handleNew} variant="contained">
                        New
                    </Button>
                </Box>
                <Divider />
                <List sx={{ maxHeight: '600px', overflow: 'auto' }}>
                    {commands.length === 0 && (
                        <ListItem>
                            <ListItemText secondary="No commands yet. Create one!" />
                        </ListItem>
                    )}
                    {commands.map((cmd) => (
                        <ListItem 
                            key={cmd.id}
                            disablePadding
                            secondaryAction={
                                <IconButton edge="end" aria-label="delete" onClick={() => removeCommand(cmd.id)}>
                                    <DeleteIcon />
                                </IconButton>
                            }
                        >
                            <ListItemButton
                                onClick={() => handleEdit(cmd)} 
                                selected={editingId === cmd.id}
                            >
                                <ListItemText 
                                    primary={`/${cmd.name}`} 
                                    secondary={cmd.description || 'No description'} 
                                    primaryTypographyProps={{ fontWeight: 'bold', color: 'primary.main' }}
                                    secondaryTypographyProps={{ noWrap: true }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Paper>
        </Box>

        {/* Editor Column */}
        <Box sx={{ flex: 2, minWidth: 300 }}>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    {editingId ? `Editing /${name}` : 'New Command'}
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <TextField
                            label="Command Name"
                            placeholder="test:gen"
                            helperText="Invoked as /name"
                            fullWidth
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            InputProps={{
                                startAdornment: <Typography color="text.secondary" sx={{ mr: 0.5 }}>/</Typography>
                            }}
                            sx={{ flex: 1 }}
                        />
                        <TextField
                            label="Description"
                            placeholder="Generates unit tests"
                            fullWidth
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            sx={{ flex: 1 }}
                        />
                    </Box>
                    <Box>
                        <Alert severity="info" sx={{ mb: 1, py: 0 }}>
                            Tip: Use <code>{'{{args}}'}</code> to insert user arguments.
                        </Alert>
                        <TextField
                            label="Prompt Template"
                            placeholder="You are an expert. {{args}}..."
                            multiline
                            minRows={6}
                            fullWidth
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            sx={{ fontFamily: 'monospace' }}
                        />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button onClick={handleNew}>Cancel</Button>
                        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={!name || !prompt}>
                            {editingId ? 'Update Command' : 'Save Command'}
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* Preview */}
             <Paper sx={{ p: 2, bgcolor: '#f5f5f5', color: '#333' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="overline">TOML Preview</Typography>
                </Box>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9rem', margin: 0 }}>
                    {previewToml}
                </pre>
            </Paper>
        </Box>
      </Box>
    </Box>
  );
}
