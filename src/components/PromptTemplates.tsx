/**
 * PromptTemplates - Prompt template management component
 * 
 * Browse, create, and use prompt templates for common tasks
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Tooltip,
  Alert,
  Tabs,
  Tab,
  Collapse,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  PlayArrow as UseIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Code as CodeIcon,
  BugReport as DebugIcon,
  RateReview as ReviewIcon,
  Architecture as ArchitectureIcon,
  Description as DocIcon,
  Security as SecurityIcon,
  Speed as PerformanceIcon,
  Lightbulb as IdeaIcon,
} from '@mui/icons-material';

interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: string;
  tags: string[];
  variables?: string[];
  starred?: boolean;
  builtIn?: boolean;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'Code Generation': <CodeIcon />,
  'Debugging': <DebugIcon />,
  'Code Review': <ReviewIcon />,
  'Architecture': <ArchitectureIcon />,
  'Documentation': <DocIcon />,
  'Security': <SecurityIcon />,
  'Performance': <PerformanceIcon />,
  'Ideas': <IdeaIcon />,
};

// Built-in templates
const builtInTemplates: PromptTemplate[] = [
  {
    id: 'code-review',
    title: 'Code Review',
    description: 'Comprehensive code review focusing on best practices',
    prompt: `Please review the following code for:
1. Code quality and readability
2. Potential bugs or edge cases
3. Performance considerations
4. Security vulnerabilities
5. Best practices and patterns

Code to review:
\`\`\`{language}
{code}
\`\`\`

Please provide specific suggestions for improvement.`,
    category: 'Code Review',
    tags: ['review', 'quality', 'best-practices'],
    variables: ['language', 'code'],
    builtIn: true,
  },
  {
    id: 'debug-error',
    title: 'Debug Error',
    description: 'Analyze and fix an error or bug',
    prompt: `I'm encountering the following error:

Error message:
\`\`\`
{error}
\`\`\`

Context/Code:
\`\`\`{language}
{code}
\`\`\`

Please help me understand:
1. What is causing this error?
2. How can I fix it?
3. How can I prevent similar issues in the future?`,
    category: 'Debugging',
    tags: ['debug', 'error', 'fix'],
    variables: ['error', 'language', 'code'],
    builtIn: true,
  },
  {
    id: 'explain-code',
    title: 'Explain Code',
    description: 'Get a detailed explanation of how code works',
    prompt: `Please explain the following code in detail:

\`\`\`{language}
{code}
\`\`\`

Include:
1. Overall purpose of the code
2. Step-by-step breakdown of how it works
3. Any important patterns or techniques used
4. Potential improvements or considerations`,
    category: 'Code Review',
    tags: ['explain', 'learn', 'understand'],
    variables: ['language', 'code'],
    builtIn: true,
  },
  {
    id: 'refactor',
    title: 'Refactor Code',
    description: 'Suggest improvements and refactoring for cleaner code',
    prompt: `Please refactor the following code to improve:
- Readability
- Maintainability
- Performance (if applicable)
- Following best practices for {language}

Current code:
\`\`\`{language}
{code}
\`\`\`

Provide the refactored code with explanations for each change.`,
    category: 'Code Review',
    tags: ['refactor', 'improve', 'clean-code'],
    variables: ['language', 'code'],
    builtIn: true,
  },
  {
    id: 'write-tests',
    title: 'Write Tests',
    description: 'Generate unit tests for your code',
    prompt: `Please write comprehensive unit tests for the following code:

\`\`\`{language}
{code}
\`\`\`

Use {testFramework} as the testing framework.

Include tests for:
1. Happy path scenarios
2. Edge cases
3. Error handling
4. Boundary conditions`,
    category: 'Code Generation',
    tags: ['testing', 'unit-tests', 'quality'],
    variables: ['language', 'code', 'testFramework'],
    builtIn: true,
  },
  {
    id: 'security-audit',
    title: 'Security Audit',
    description: 'Check code for security vulnerabilities',
    prompt: `Please perform a security audit on the following code:

\`\`\`{language}
{code}
\`\`\`

Check for:
1. Injection vulnerabilities (SQL, XSS, command injection)
2. Authentication/authorization issues
3. Data exposure risks
4. Insecure dependencies
5. Other OWASP Top 10 vulnerabilities

Provide severity ratings and remediation steps for any issues found.`,
    category: 'Security',
    tags: ['security', 'audit', 'vulnerabilities'],
    variables: ['language', 'code'],
    builtIn: true,
  },
  {
    id: 'optimize-performance',
    title: 'Optimize Performance',
    description: 'Analyze and improve code performance',
    prompt: `Please analyze the following code for performance issues:

\`\`\`{language}
{code}
\`\`\`

Identify:
1. Time complexity issues
2. Memory usage concerns
3. Unnecessary operations
4. Caching opportunities
5. Parallelization possibilities

Provide optimized code with explanations.`,
    category: 'Performance',
    tags: ['performance', 'optimization', 'speed'],
    variables: ['language', 'code'],
    builtIn: true,
  },
  {
    id: 'generate-docs',
    title: 'Generate Documentation',
    description: 'Create documentation for code',
    prompt: `Please generate comprehensive documentation for the following code:

\`\`\`{language}
{code}
\`\`\`

Include:
1. Function/class descriptions
2. Parameter documentation
3. Return value documentation
4. Usage examples
5. Any important notes or caveats

Use {docFormat} format.`,
    category: 'Documentation',
    tags: ['docs', 'documentation', 'comments'],
    variables: ['language', 'code', 'docFormat'],
    builtIn: true,
  },
  {
    id: 'architecture-review',
    title: 'Architecture Review',
    description: 'Review system or code architecture',
    prompt: `Please review the following architecture/design:

{description}

Consider:
1. Scalability
2. Maintainability
3. Separation of concerns
4. SOLID principles
5. Design patterns that could be applied
6. Potential bottlenecks

Provide recommendations for improvements.`,
    category: 'Architecture',
    tags: ['architecture', 'design', 'system-design'],
    variables: ['description'],
    builtIn: true,
  },
  {
    id: 'implement-feature',
    title: 'Implement Feature',
    description: 'Help implement a new feature',
    prompt: `Please help me implement the following feature:

Feature description: {featureDescription}

Technical context:
- Language: {language}
- Framework: {framework}
- Existing code structure:
\`\`\`
{codeContext}
\`\`\`

Provide:
1. Implementation approach
2. Code implementation
3. Any necessary tests
4. Documentation`,
    category: 'Code Generation',
    tags: ['feature', 'implement', 'development'],
    variables: ['featureDescription', 'language', 'framework', 'codeContext'],
    builtIn: true,
  },
];

interface PromptTemplatesProps {
  onUseTemplate?: (prompt: string) => void;
}

export default function PromptTemplates({ onUseTemplate }: PromptTemplatesProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<{ open: boolean; template: PromptTemplate | null }>({
    open: false,
    template: null,
  });
  const [useDialog, setUseDialog] = useState<{ open: boolean; template: PromptTemplate | null; variables: Record<string, string> }>({
    open: false,
    template: null,
    variables: {},
  });
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());

  // Load templates from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('gemini-prompt-templates');
    if (saved) {
      try {
        const customTemplates = JSON.parse(saved);
        setTemplates([...builtInTemplates, ...customTemplates]);
      } catch {
        setTemplates(builtInTemplates);
      }
    } else {
      setTemplates(builtInTemplates);
    }
  }, []);

  // Save custom templates
  const saveTemplates = (newTemplates: PromptTemplate[]) => {
    const customTemplates = newTemplates.filter(t => !t.builtIn);
    localStorage.setItem('gemini-prompt-templates', JSON.stringify(customTemplates));
    setTemplates(newTemplates);
  };

  // Get unique categories
  const categories = Array.from(new Set(templates.map(t => t.category)));

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = !searchQuery || 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Toggle starred
  const toggleStarred = (id: string) => {
    saveTemplates(templates.map(t => 
      t.id === id ? { ...t, starred: !t.starred } : t
    ));
  };

  // Delete template
  const deleteTemplate = (id: string) => {
    if (window.confirm('Delete this template?')) {
      saveTemplates(templates.filter(t => t.id !== id));
    }
  };

  // Copy template prompt
  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
  };

  // Open use dialog with variables
  const openUseDialog = (template: PromptTemplate) => {
    const variables: Record<string, string> = {};
    template.variables?.forEach(v => {
      variables[v] = '';
    });
    setUseDialog({ open: true, template, variables });
  };

  // Use template with filled variables
  const useTemplate = () => {
    if (!useDialog.template) return;
    
    let prompt = useDialog.template.prompt;
    Object.entries(useDialog.variables).forEach(([key, value]) => {
      prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });
    
    if (onUseTemplate) {
      onUseTemplate(prompt);
    } else {
      navigator.clipboard.writeText(prompt);
    }
    
    setUseDialog({ open: false, template: null, variables: {} });
  };

  // Toggle expand template
  const toggleExpand = (id: string) => {
    setExpandedTemplates(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Save edited template
  const saveTemplate = (template: PromptTemplate) => {
    if (template.id) {
      // Update existing
      saveTemplates(templates.map(t => 
        t.id === template.id ? template : t
      ));
    } else {
      // Add new
      saveTemplates([...templates, { ...template, id: `custom-${Date.now()}` }]);
    }
    setEditDialog({ open: false, template: null });
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Prompt Templates
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setEditDialog({
              open: true,
              template: {
                id: '',
                title: '',
                description: '',
                prompt: '',
                category: 'Custom',
                tags: [],
                variables: [],
              },
            })}
          >
            New Template
          </Button>
        </Box>

        {/* Search */}
        <TextField
          fullWidth
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        {/* Category filter */}
        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip
            label="All"
            size="small"
            onClick={() => setSelectedCategory(null)}
            color={selectedCategory === null ? 'primary' : 'default'}
            variant={selectedCategory === null ? 'filled' : 'outlined'}
          />
          {categories.map(cat => (
            <Chip
              key={cat}
              label={cat}
              size="small"
              icon={categoryIcons[cat] as React.ReactElement}
              onClick={() => setSelectedCategory(cat)}
              color={selectedCategory === cat ? 'primary' : 'default'}
              variant={selectedCategory === cat ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Box>

      {/* Templates list */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        <Grid container spacing={2}>
          {filteredTemplates.map(template => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <Card>
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" fontWeight={500}>
                        {template.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {template.description}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => toggleStarred(template.id)}
                    >
                      {template.starred ? (
                        <StarIcon color="warning" fontSize="small" />
                      ) : (
                        <StarBorderIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Box>

                  {/* Tags */}
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                    {template.tags.slice(0, 3).map(tag => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>

                  {/* Expandable prompt preview */}
                  <Box
                    sx={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      color: 'text.secondary',
                    }}
                    onClick={() => toggleExpand(template.id)}
                  >
                    <Typography variant="caption">
                      {expandedTemplates.has(template.id) ? 'Hide prompt' : 'Show prompt'}
                    </Typography>
                    {expandedTemplates.has(template.id) ? (
                      <CollapseIcon fontSize="small" />
                    ) : (
                      <ExpandIcon fontSize="small" />
                    )}
                  </Box>
                  <Collapse in={expandedTemplates.has(template.id)}>
                    <Box
                      component="pre"
                      sx={{
                        mt: 1,
                        p: 1,
                        bgcolor: 'grey.100',
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        overflow: 'auto',
                        maxHeight: 150,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {template.prompt}
                    </Box>
                  </Collapse>
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    startIcon={<UseIcon />}
                    onClick={() => openUseDialog(template)}
                  >
                    Use
                  </Button>
                  <Tooltip title="Copy prompt">
                    <IconButton size="small" onClick={() => copyPrompt(template.prompt)}>
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {!template.builtIn && (
                    <>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => setEditDialog({ open: true, template })}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteTemplate(template.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {filteredTemplates.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No templates found
            </Typography>
          </Box>
        )}
      </Box>

      {/* Use template dialog */}
      <Dialog
        open={useDialog.open}
        onClose={() => setUseDialog({ open: false, template: null, variables: {} })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Use Template: {useDialog.template?.title}</DialogTitle>
        <DialogContent>
          {useDialog.template?.variables && useDialog.template.variables.length > 0 ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Fill in the following variables:
              </Typography>
              {useDialog.template.variables.map(variable => (
                <TextField
                  key={variable}
                  fullWidth
                  label={variable}
                  value={useDialog.variables[variable] || ''}
                  onChange={(e) => setUseDialog(prev => ({
                    ...prev,
                    variables: { ...prev.variables, [variable]: e.target.value },
                  }))}
                  margin="dense"
                  multiline={variable === 'code' || variable === 'error' || variable === 'codeContext'}
                  rows={variable === 'code' || variable === 'error' || variable === 'codeContext' ? 4 : 1}
                />
              ))}
            </>
          ) : (
            <Typography>
              This template has no variables. Click "Use" to copy it.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUseDialog({ open: false, template: null, variables: {} })}>
            Cancel
          </Button>
          <Button variant="contained" onClick={useTemplate}>
            {onUseTemplate ? 'Use in Chat' : 'Copy to Clipboard'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit template dialog */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, template: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editDialog.template?.id ? 'Edit Template' : 'New Template'}
        </DialogTitle>
        <DialogContent>
          {editDialog.template && (
            <>
              <TextField
                fullWidth
                label="Title"
                value={editDialog.template.title}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  template: prev.template ? { ...prev.template, title: e.target.value } : null,
                }))}
                margin="dense"
              />
              <TextField
                fullWidth
                label="Description"
                value={editDialog.template.description}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  template: prev.template ? { ...prev.template, description: e.target.value } : null,
                }))}
                margin="dense"
              />
              <TextField
                fullWidth
                label="Category"
                value={editDialog.template.category}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  template: prev.template ? { ...prev.template, category: e.target.value } : null,
                }))}
                margin="dense"
              />
              <TextField
                fullWidth
                label="Tags (comma separated)"
                value={editDialog.template.tags.join(', ')}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  template: prev.template ? { 
                    ...prev.template, 
                    tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) 
                  } : null,
                }))}
                margin="dense"
              />
              <TextField
                fullWidth
                label="Prompt"
                value={editDialog.template.prompt}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  template: prev.template ? { ...prev.template, prompt: e.target.value } : null,
                }))}
                margin="dense"
                multiline
                rows={10}
                helperText="Use {variableName} for variables that users can fill in"
              />
              <TextField
                fullWidth
                label="Variables (comma separated)"
                value={editDialog.template.variables?.join(', ') || ''}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  template: prev.template ? { 
                    ...prev.template, 
                    variables: e.target.value.split(',').map(t => t.trim()).filter(Boolean) 
                  } : null,
                }))}
                margin="dense"
                helperText="List the variable names used in the prompt"
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, template: null })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => editDialog.template && saveTemplate(editDialog.template)}
            disabled={!editDialog.template?.title || !editDialog.template?.prompt}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
