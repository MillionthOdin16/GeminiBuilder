import React, { useState, useMemo } from 'react';
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
  Tabs,
  Tab,
  ListItemButton,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Drawer,
  Collapse,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Save as SaveIcon, 
  Description as DescIcon,
  InsertDriveFile as FileIcon,
  LibraryBooks as LibraryIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useAppStore } from '../store/appStore';
import type { AgentSkill, SkillFile } from '../types';
import { CURATED_SKILLS, SKILL_CATEGORIES } from '../data/marketplace';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: { xs: 1, sm: 2 } }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function SkillsBuilder() {
  const { skills, addSkill, updateSkill, removeSkill } = useAppStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['code-quality']);
  
  // Editor State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [files, setFiles] = useState<SkillFile[]>([]);
  const [tabValue, setTabValue] = useState(0);

  // Filter skills in library
  const filteredLibrarySkills = useMemo(() => {
    return CURATED_SKILLS.filter(skill => {
      const matchesSearch = !librarySearch || 
        skill.name.toLowerCase().includes(librarySearch.toLowerCase()) ||
        skill.description.toLowerCase().includes(librarySearch.toLowerCase());
      
      if (!selectedCategory) return matchesSearch;
      
      const category = SKILL_CATEGORIES.find(c => c.id === selectedCategory);
      return matchesSearch && category?.skills.includes(skill.id);
    });
  }, [librarySearch, selectedCategory]);

  // Load skill into editor
  const handleEdit = (skill: AgentSkill) => {
    setEditingId(skill.id);
    setName(skill.name);
    setDescription(skill.description);
    setInstructions(skill.instructions);
    setFiles([...skill.files]);
    setTabValue(0);
    setShowLibrary(false);
  };

  // Reset editor
  const handleNew = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setInstructions('# My Skill\n\nInstructions go here...');
    setFiles([]);
    setTabValue(0);
    setShowLibrary(false);
  };

  const handleImport = (skill: AgentSkill) => {
    // Check if already imported
    if (skills.some(s => s.name === skill.name)) {
      if (!confirm(`Skill "${skill.name}" already exists. Import anyway with a new name?`)) {
        return;
      }
    }
    
    addSkill({
      ...skill,
      id: crypto.randomUUID(),
    });
    setShowLibrary(false);
  };

  const handleSave = () => {
    if (!name) return;

    const skillData = {
      name: name.toLowerCase().replace(/\s+/g, '-'),
      description,
      instructions,
      files
    };

    if (editingId) {
      updateSkill(editingId, skillData);
    } else {
      addSkill({
        id: crypto.randomUUID(),
        ...skillData
      });
    }
    handleNew();
  };

  // File management
  const handleAddFile = () => {
    const newFile: SkillFile = {
      id: crypto.randomUUID(),
      name: 'script.py',
      content: '# Helper script'
    };
    setFiles([...files, newFile]);
  };

  const updateFile = (id: string, key: 'name' | 'content', value: string) => {
    setFiles(files.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Previews
  const frontmatterPreview = `---
name: ${name || 'skill-name'}
description: ${description || 'Description'}
---`;

  const SkillsList = () => (
    <Paper sx={{ height: '100%', minHeight: { xs: 200, md: 500 } }}>
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1,
      }}>
        <Typography variant="h6">Skills</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={() => setShowLibrary(true)} color="primary" title="Browse Library">
            <LibraryIcon />
          </IconButton>
          <Button startIcon={<AddIcon />} size="small" onClick={handleNew} variant="contained">
            New
          </Button>
        </Box>
      </Box>
      <Divider />
      <List sx={{ maxHeight: { xs: 200, md: 450 }, overflow: 'auto' }}>
        {skills.length === 0 && (
          <ListItem>
            <ListItemText 
              secondary="No skills yet. Create one or browse the library!" 
              sx={{ textAlign: 'center', py: 2 }}
            />
          </ListItem>
        )}
        {skills.map((skill) => (
          <ListItem 
            key={skill.id} 
            disablePadding
            secondaryAction={
              <IconButton edge="end" aria-label="delete" onClick={() => removeSkill(skill.id)}>
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemButton
              onClick={() => handleEdit(skill)} 
              selected={editingId === skill.id}
            >
              <ListItemText 
                primary={skill.name} 
                secondary={skill.description} 
                primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                secondaryTypographyProps={{ noWrap: true, fontSize: '0.8rem' }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );

  const LibraryContent = () => (
    <Box sx={{ p: { xs: 2, md: 3 }, height: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>Skill Library</Typography>
        {isMobile && (
          <IconButton onClick={() => setShowLibrary(false)}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Choose from {CURATED_SKILLS.length} pre-built skills. Click to add to your configuration.
      </Typography>
      
      <TextField
        fullWidth
        size="small"
        placeholder="Search skills..."
        value={librarySearch}
        onChange={(e) => setLibrarySearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {/* Category filters */}
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 3 }}>
        <Chip
          label="All"
          size="small"
          onClick={() => setSelectedCategory(null)}
          color={selectedCategory === null ? 'primary' : 'default'}
          variant={selectedCategory === null ? 'filled' : 'outlined'}
        />
        {SKILL_CATEGORIES.map((cat) => (
          <Chip
            key={cat.id}
            label={cat.name}
            size="small"
            onClick={() => setSelectedCategory(cat.id)}
            color={selectedCategory === cat.id ? 'primary' : 'default'}
            variant={selectedCategory === cat.id ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      {/* Skills by category */}
      {SKILL_CATEGORIES.map((category) => {
        const categorySkills = filteredLibrarySkills.filter(s => 
          category.skills.includes(s.id)
        );
        
        if (categorySkills.length === 0) return null;
        
        return (
          <Box key={category.id} sx={{ mb: 2 }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                py: 1,
                '&:hover': { bgcolor: 'action.hover' },
                borderRadius: 1,
              }}
              onClick={() => toggleCategory(category.id)}
            >
              {expandedCategories.includes(category.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              <Typography variant="subtitle1" fontWeight={600} sx={{ ml: 1 }}>
                {category.name}
              </Typography>
              <Chip label={categorySkills.length} size="small" sx={{ ml: 1 }} />
            </Box>
            
            <Collapse in={expandedCategories.includes(category.id)}>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {categorySkills.map((skill) => {
                  const isImported = skills.some(s => s.name === skill.name);
                  return (
                    <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={skill.id}>
                      <Card 
                        variant="outlined" 
                        sx={{ 
                          height: '100%',
                          opacity: isImported ? 0.7 : 1,
                          borderColor: isImported ? 'success.main' : 'divider',
                        }}
                      >
                        <CardContent sx={{ pb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {skill.name}
                            </Typography>
                            {isImported && (
                              <Chip label="Added" size="small" color="success" />
                            )}
                          </Box>
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              minHeight: 40,
                            }}
                          >
                            {skill.description}
                          </Typography>
                        </CardContent>
                        <CardActions>
                          <Button 
                            size="small" 
                            variant={isImported ? 'outlined' : 'contained'}
                            onClick={() => handleImport(skill)}
                            fullWidth
                          >
                            {isImported ? 'Import Again' : 'Import'}
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Collapse>
          </Box>
        );
      })}
    </Box>
  );

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
            Agent Skills
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Define reusable skills that extend Gemini's capabilities
          </Typography>
        </Box>
        <Chip 
          label={`${skills.length} skill${skills.length !== 1 ? 's' : ''}`} 
          color="primary" 
          variant="outlined"
        />
      </Box>

      <Grid container spacing={3}>
        {/* Sidebar List */}
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <SkillsList />
        </Grid>

        {/* Main Editor */}
        <Grid size={{ xs: 12, md: 8, lg: 9 }}>
          {showLibrary ? (
            isMobile ? (
              <Drawer
                anchor="bottom"
                open={showLibrary}
                onClose={() => setShowLibrary(false)}
                PaperProps={{
                  sx: { height: '90vh', borderTopLeftRadius: 16, borderTopRightRadius: 16 }
                }}
              >
                <LibraryContent />
              </Drawer>
            ) : (
              <Paper sx={{ minHeight: 500 }}>
                <LibraryContent />
              </Paper>
            )
          ) : (
            <Paper sx={{ minHeight: 500 }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                  value={tabValue} 
                  onChange={(_, v) => setTabValue(v)}
                  variant={isMobile ? 'fullWidth' : 'standard'}
                >
                  <Tab icon={<DescIcon />} label="Definition" iconPosition="start" />
                  <Tab icon={<FileIcon />} label={`Files (${files.length})`} iconPosition="start" />
                </Tabs>
              </Box>

              {/* Tab 0: Definition (SKILL.md) */}
              <CustomTabPanel value={tabValue} index={0}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Skill Name (Folder Name)"
                        placeholder="my-awesome-skill"
                        fullWidth
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        helperText="Use lowercase and hyphens"
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Description"
                        placeholder="Briefly describe what this skill does"
                        fullWidth
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                  
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>SKILL.md Content</Typography>
                    <Alert severity="info" sx={{ mb: 1, py: 0 }}>
                      This content defines how the agent should use the skill.
                    </Alert>
                    <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50', mb: 2 }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', whiteSpace: 'pre' }}>
                        {frontmatterPreview}
                      </Typography>
                    </Paper>
                    <TextField
                      placeholder="# Instructions\n\n1. Step one..."
                      multiline
                      minRows={8}
                      fullWidth
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                    />
                  </Box>
                </Box>
              </CustomTabPanel>

              {/* Tab 1: Resource Files */}
              <CustomTabPanel value={tabValue} index={1}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button startIcon={<AddIcon />} variant="outlined" onClick={handleAddFile}>
                    Add Resource File
                  </Button>
                </Box>

                {files.length === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                    No helper files added. Add scripts or data files if your skill needs them.
                  </Typography>
                ) : (
                  files.map((file) => (
                    <Paper key={file.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                        <TextField 
                          label="Filename" 
                          size="small" 
                          value={file.name} 
                          onChange={(e) => updateFile(file.id, 'name', e.target.value)}
                          sx={{ width: 200 }}
                        />
                        <Box sx={{ flexGrow: 1 }} />
                        <IconButton color="error" onClick={() => removeFile(file.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      <TextField
                        label="File Content"
                        multiline
                        minRows={4}
                        maxRows={12}
                        fullWidth
                        value={file.content}
                        onChange={(e) => updateFile(file.id, 'content', e.target.value)}
                        sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                      />
                    </Paper>
                  ))
                )}
              </CustomTabPanel>

              <Divider />
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button onClick={handleNew}>Cancel</Button>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={!name}>
                  {editingId ? 'Update Skill' : 'Save Skill'}
                </Button>
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
