import React, { useState } from 'react';
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
  Grid,
  Chip,
  Tooltip,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Save as SaveIcon,
  Code as CodeIcon,
  ContentCopy as CopyIcon,
  Terminal as TerminalIcon,
} from '@mui/icons-material';
import { useAppStore } from '../store/appStore';
import type { CustomCommand } from '../types';

// Example command templates
const COMMAND_TEMPLATES = [
  {
    id: 'test',
    name: 'test:gen',
    description: 'Generate unit tests for the provided code',
    prompt: 'Generate comprehensive unit tests for {{args}}. Use the project\'s existing test framework and follow best practices.\n\nInclude:\n- Happy path tests\n- Edge cases\n- Error handling tests',
  },
  {
    id: 'docs',
    name: 'docs:gen',
    description: 'Generate documentation for code',
    prompt: 'Generate comprehensive documentation for {{args}}. Include:\n- JSDoc/docstring comments\n- Usage examples\n- Parameter descriptions\n- Return value documentation',
  },
  {
    id: 'refactor',
    name: 'refactor:clean',
    description: 'Refactor code for better readability',
    prompt: 'Refactor {{args}} to improve readability and maintainability. Apply SOLID principles and clean code practices. Explain each change.',
  },
  {
    id: 'review',
    name: 'code:review',
    description: 'Perform a code review',
    prompt: 'Review {{args}} and provide feedback on:\n- Code quality\n- Potential bugs\n- Performance issues\n- Security concerns\n- Suggestions for improvement',
  },
];

export default function CommandBuilder() {
  const { commands, addCommand, updateCommand, removeCommand } = useAppStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');

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

  const handleLoadTemplate = (template: typeof COMMAND_TEMPLATES[0]) => {
    setEditingId(null);
    setName(template.name);
    setDescription(template.description);
    setPrompt(template.prompt);
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

  const handleCopyToml = async () => {
    try {
      await navigator.clipboard.writeText(previewToml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const previewToml = editingId || (name || prompt) ? 
`# Invoked as: /${name || 'command'}
description = "${description}"

prompt = """
${prompt}
"""` : '# Select a command to preview TOML';

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        gap: 2,
        mb: 3 
      }}>
        <Box>
          <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={600}>
            Custom Commands
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create reusable slash commands for common tasks
          </Typography>
        </Box>
        <Chip 
          label={`${commands.length} command${commands.length !== 1 ? 's' : ''}`} 
          color="primary" 
          variant="outlined"
        />
      </Box>

      <Grid container spacing={3}>
        {/* List Column */}
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <Paper sx={{ height: '100%', minHeight: { xs: 200, md: 500 } }}>
            <Box sx={{ 
              p: 2, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
            }}>
              <Typography variant="h6">Commands</Typography>
              <Button startIcon={<AddIcon />} size="small" onClick={handleNew} variant="contained">
                New
              </Button>
            </Box>
            <Divider />
            <List sx={{ maxHeight: { xs: 200, md: 400 }, overflow: 'auto' }}>
              {commands.length === 0 && (
                <ListItem>
                  <ListItemText 
                    secondary="No commands yet. Create one or use a template!" 
                    sx={{ textAlign: 'center', py: 2 }}
                  />
                </ListItem>
              )}
              {commands.map((cmd) => (
                <ListItem 
                  key={cmd.id}
                  disablePadding
                  secondaryAction={
                    <IconButton 
                      edge="end" 
                      aria-label="delete" 
                      onClick={() => removeCommand(cmd.id)}
                      size="small"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemButton
                    onClick={() => handleEdit(cmd)} 
                    selected={editingId === cmd.id}
                  >
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <TerminalIcon fontSize="small" color="primary" />
                          <Typography fontWeight={600} color="primary.main">
                            /{cmd.name}
                          </Typography>
                        </Box>
                      }
                      secondary={cmd.description || 'No description'} 
                      secondaryTypographyProps={{ noWrap: true, fontSize: '0.8rem' }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            
            {/* Quick templates */}
            <Divider />
            <Box sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Quick Templates
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {COMMAND_TEMPLATES.map((template) => (
                  <Chip
                    key={template.id}
                    label={template.name}
                    size="small"
                    variant="outlined"
                    onClick={() => handleLoadTemplate(template)}
                    sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
                  />
                ))}
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Editor Column */}
        <Grid size={{ xs: 12, md: 8, lg: 9 }}>
          <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              {editingId ? `Editing /${name}` : 'New Command'}
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Command Name"
                    placeholder="test:gen"
                    helperText="Use colons for namespacing (e.g., test:gen)"
                    fullWidth
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <Typography color="text.secondary" sx={{ mr: 0.5, fontWeight: 600 }}>
                          /
                        </Typography>
                      ),
                    }}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Description"
                    placeholder="Generates unit tests"
                    helperText="Shown in /help menu"
                    fullWidth
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    size="small"
                  />
                </Grid>
              </Grid>
              
              <Box>
                <Alert severity="info" sx={{ mb: 1.5, py: 0.5 }}>
                  <Typography variant="body2">
                    Use <code style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: 4 }}>{'{{args}}'}</code> to insert user arguments. 
                    Use <code style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: 4 }}>{'!{shell command}'}</code> for shell injection.
                  </Typography>
                </Alert>
                <TextField
                  label="Prompt Template"
                  placeholder="You are an expert. {{args}}..."
                  multiline
                  minRows={6}
                  maxRows={12}
                  fullWidth
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  sx={{
                    '& textarea': {
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      lineHeight: 1.5,
                    },
                  }}
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button onClick={handleNew}>Cancel</Button>
                <Button 
                  variant="contained" 
                  startIcon={<SaveIcon />} 
                  onClick={handleSave} 
                  disabled={!name || !prompt}
                  sx={{
                    background: 'linear-gradient(135deg, #1a73e8 0%, #6c47ff 100%)',
                  }}
                >
                  {editingId ? 'Update Command' : 'Save Command'}
                </Button>
              </Box>
            </Box>
          </Paper>

          {/* TOML Preview */}
          <Paper sx={{ bgcolor: '#1e1e1e', color: '#d4d4d4', overflow: 'hidden' }}>
            <Box sx={{ 
              p: 2, 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}>
              <Typography variant="subtitle2" sx={{ color: '#9cdcfe' }}>
                TOML Preview
              </Typography>
              <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
                <IconButton 
                  size="small" 
                  onClick={handleCopyToml}
                  sx={{ color: copied ? 'success.main' : '#aaa' }}
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ p: 2 }}>
              <pre style={{ 
                whiteSpace: 'pre-wrap', 
                fontFamily: '"JetBrains Mono", "Fira Code", monospace', 
                fontSize: '0.8rem', 
                margin: 0,
                lineHeight: 1.5,
              }}>
                {previewToml}
              </pre>
            </Box>
          </Paper>

          {/* Tips */}
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Pro tip:</strong> Commands are saved to <code>.gemini/commands/</code>. 
              Use namespacing with colons (e.g., <code>git:commit</code>) to organize commands into folders.
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
}
