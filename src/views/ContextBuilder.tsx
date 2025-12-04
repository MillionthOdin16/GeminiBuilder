import React, { useState } from 'react';
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
  Grid,
  Chip,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  DragIndicator as DragIcon, 
  Add as AddIcon, 
  Info as InfoIcon,
  Person as PersonIcon,
  Code as CodeIcon,
  Security as SecurityIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  MoreVert as MoreIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { useAppStore } from '../store/appStore';
import type { ContextSection } from '../types';

// Template sections for quick start
const SECTION_TEMPLATES = [
  { 
    id: 'role', 
    title: 'Role & Persona', 
    content: 'You are an expert software engineer. You write clean, efficient, and well-documented code.',
    icon: <PersonIcon fontSize="small" />
  },
  { 
    id: 'stack', 
    title: 'Technology Stack', 
    content: '- Language: TypeScript\n- Framework: React 18+\n- Build: Vite\n- Testing: Vitest',
    icon: <CodeIcon fontSize="small" />
  },
  { 
    id: 'standards', 
    title: 'Coding Standards', 
    content: '- Use functional components with hooks\n- Prefer const over let\n- Add JSDoc comments to public APIs\n- Write unit tests for new features',
    icon: <DescriptionIcon fontSize="small" />
  },
  { 
    id: 'security', 
    title: 'Security Guidelines', 
    content: '- Never commit secrets or API keys\n- Always validate user inputs\n- Use parameterized queries for database access',
    icon: <SecurityIcon fontSize="small" />
  },
  { 
    id: 'project', 
    title: 'Project Context', 
    content: 'This is a web application that helps users...',
    icon: <SettingsIcon fontSize="small" />
  },
];

export default function ContextBuilder() {
  const { contextSections, addContextSection, updateContextSection, toggleContextSection, removeContextSection } = useAppStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [templateMenuAnchor, setTemplateMenuAnchor] = useState<null | HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  const handleAddSection = () => {
    const newSection: ContextSection = {
      id: crypto.randomUUID(),
      title: 'New Section',
      content: 'Add your instructions here...',
      enabled: true,
    };
    addContextSection(newSection);
  };

  const handleAddTemplate = (template: typeof SECTION_TEMPLATES[0]) => {
    const newSection: ContextSection = {
      id: crypto.randomUUID(),
      title: template.title,
      content: template.content,
      enabled: true,
    };
    addContextSection(newSection);
    setTemplateMenuAnchor(null);
  };

  const handleCopyPreview = async () => {
    try {
      await navigator.clipboard.writeText(geminiMdPreview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const geminiMdPreview = contextSections
    .filter((s) => s.enabled)
    .map((s) => `# ${s.title}\n\n${s.content}`)
    .join('\n\n');

  const enabledCount = contextSections.filter(s => s.enabled).length;

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
            Context Builder
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Define instructions that persist across all Gemini CLI sessions
          </Typography>
        </Box>
        <Chip 
          label={`${enabledCount} active section${enabledCount !== 1 ? 's' : ''}`} 
          color="primary" 
          variant="outlined"
        />
      </Box>

      <Grid container spacing={3}>
        {/* Editor Column */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={handleAddSection}
              sx={{
                background: 'linear-gradient(135deg, #1a73e8 0%, #6c47ff 100%)',
              }}
            >
              Add Section
            </Button>
            <Button 
              variant="outlined"
              onClick={(e) => setTemplateMenuAnchor(e.currentTarget)}
            >
              Use Template
            </Button>
            <Menu
              anchorEl={templateMenuAnchor}
              open={Boolean(templateMenuAnchor)}
              onClose={() => setTemplateMenuAnchor(null)}
            >
              {SECTION_TEMPLATES.map((template) => (
                <MenuItem key={template.id} onClick={() => handleAddTemplate(template)}>
                  <ListItemIcon>{template.icon}</ListItemIcon>
                  <ListItemText>{template.title}</ListItemText>
                </MenuItem>
              ))}
            </Menu>
          </Box>
          
          {contextSections.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary" paragraph>
                No context sections yet. Add a section or use a template to get started.
              </Typography>
              <Alert severity="info" sx={{ textAlign: 'left' }}>
                <strong>What goes in GEMINI.md?</strong>
                <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                  <li>Your role or persona for the AI</li>
                  <li>Tech stack and framework preferences</li>
                  <li>Coding standards and style guide</li>
                  <li>Project-specific context</li>
                </ul>
              </Alert>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {contextSections.map((section, index) => (
                <Card 
                  key={section.id} 
                  variant="outlined" 
                  sx={{ 
                    opacity: section.enabled ? 1 : 0.6,
                    transition: 'all 0.2s',
                    borderColor: section.enabled ? 'divider' : 'action.disabled',
                  }}
                >
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      mb: 1.5, 
                      gap: 1,
                      flexWrap: { xs: 'wrap', sm: 'nowrap' }
                    }}>
                      <DragIcon color="action" sx={{ cursor: 'grab', display: { xs: 'none', sm: 'block' } }} />
                      <Chip 
                        label={index + 1} 
                        size="small" 
                        sx={{ minWidth: 28, display: { xs: 'none', sm: 'flex' } }} 
                      />
                      <TextField
                        variant="standard"
                        value={section.title}
                        onChange={(e) => updateContextSection(section.id, { title: e.target.value })} 
                        placeholder="Section Title"
                        InputProps={{ 
                          disableUnderline: true, 
                          style: { fontWeight: 600, fontSize: '1rem' } 
                        }}
                        sx={{ flexGrow: 1, minWidth: 100 }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
                        <Tooltip title={section.enabled ? 'Enabled - will be included in GEMINI.md' : 'Disabled'}>
                          <Switch 
                            checked={section.enabled} 
                            onChange={() => toggleContextSection(section.id)}
                            size="small"
                          />
                        </Tooltip>
                        <Tooltip title="Delete section">
                          <IconButton 
                            onClick={() => removeContextSection(section.id)} 
                            size="small"
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      maxRows={10}
                      value={section.content}
                      onChange={(e) => updateContextSection(section.id, e.target.value)}
                      placeholder="Content..."
                      variant="outlined"
                      size="small"
                      sx={{
                        '& textarea': {
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          lineHeight: 1.5,
                        },
                      }}
                    />
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Grid>

        {/* Preview Column */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Box sx={{ position: { lg: 'sticky' }, top: { lg: 80 } }}>
            <Paper sx={{ 
              bgcolor: '#1e1e1e', 
              color: '#d4d4d4', 
              overflow: 'hidden',
              maxHeight: { xs: 400, lg: 'calc(100vh - 200px)' },
              display: 'flex',
              flexDirection: 'column',
            }}>
              <Box sx={{ 
                p: 2, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}>
                <Typography variant="subtitle2" sx={{ color: '#9cdcfe' }}>
                  GEMINI.md Preview
                </Typography>
                <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
                  <IconButton 
                    size="small" 
                    onClick={handleCopyPreview}
                    sx={{ color: copied ? 'success.main' : '#aaa' }}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ p: 2, overflow: 'auto', flexGrow: 1 }}>
                {geminiMdPreview ? (
                  <pre style={{ 
                    whiteSpace: 'pre-wrap', 
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace', 
                    fontSize: '0.8rem',
                    lineHeight: 1.6,
                    margin: 0,
                  }}>
                    {geminiMdPreview}
                  </pre>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Add sections above to see the preview...
                  </Typography>
                )}
              </Box>
            </Paper>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Tip:</strong> GEMINI.md files are loaded hierarchically. 
                Place in project root for project-wide context, or in subdirectories for component-specific instructions.
              </Typography>
            </Alert>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
