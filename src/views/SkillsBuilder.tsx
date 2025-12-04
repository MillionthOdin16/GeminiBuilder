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
  Tabs,
  Tab,
  ListItemButton,
} from '@mui/material';
import { 
    Add as AddIcon, 
    Delete as DeleteIcon, 
    Save as SaveIcon, 
    Description as DescIcon,
    InsertDriveFile as FileIcon,
    LibraryBooks as LibraryIcon
} from '@mui/icons-material';
import { useAppStore } from '../store/appStore';
import type { AgentSkill, SkillFile } from '../types';
import { CURATED_SKILLS } from '../data/marketplace';

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
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function SkillsBuilder() {
  const { skills, addSkill, updateSkill, removeSkill } = useAppStore();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showLibrary, setShowLibrary] = React.useState(false);
  
  // Editor State
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [instructions, setInstructions] = React.useState('');
  const [files, setFiles] = React.useState<SkillFile[]>([]);
  const [tabValue, setTabValue] = React.useState(0);

  // Load skill into editor
  const handleEdit = (skill: AgentSkill) => {
      setEditingId(skill.id);
      setName(skill.name);
      setDescription(skill.description);
      setInstructions(skill.instructions);
      setFiles([...skill.files]); // Shallow copy array
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
      // Clone the skill
      addSkill({
          ...skill,
          id: crypto.randomUUID(), // New ID for the user's instance
      });
      // Optionally switch to edit it immediately
      handleEdit(skill); 
      setShowLibrary(false);
  };

  const handleSave = () => {
      if (!name) return;

      const skillData = {
          name: name.toLowerCase().replace(/\s+/g, '-'), // Enforce slug
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

  // Previews
  const frontmatterPreview = `---
name: ${name || 'skill-name'}
description: ${description || 'Description'}
---`;

  return (
    <Box>
       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Agent Skills Builder
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Sidebar List */}
        <Box sx={{ flex: 1, minWidth: 300 }}>
            <Paper sx={{ height: '100%', minHeight: 400 }}>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Skills</Typography>
                    <Box>
                        <IconButton onClick={() => setShowLibrary(true)} color="primary" title="Browse Library">
                            <LibraryIcon />
                        </IconButton>
                        <Button startIcon={<AddIcon />} size="small" onClick={handleNew} variant="contained" sx={{ ml: 1 }}>
                            New
                        </Button>
                    </Box>
                </Box>
                <Divider />
                <List sx={{ maxHeight: '600px', overflow: 'auto' }}>
                    {skills.length === 0 && (
                        <ListItem>
                            <ListItemText secondary="No skills yet. Create one or browse library!" />
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
                                    primaryTypographyProps={{ fontWeight: 'bold' }}
                                    secondaryTypographyProps={{ noWrap: true }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Paper>
        </Box>

        {/* Main Editor */}
        <Box sx={{ flex: 3, minWidth: 300 }}>
            {showLibrary ? (
                <Paper sx={{ minHeight: 400, p: 3 }}>
                    <Typography variant="h5" gutterBottom>Skill Library</Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Choose a pre-built skill to add to your configuration. You can customize it afterwards.
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {CURATED_SKILLS.map((skill) => (
                            <Box key={skill.id} sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1, width: '100%', maxWidth: 300 }}>
                                <Typography variant="h6">{skill.name}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, height: 40, overflow: 'hidden' }}>
                                    {skill.description}
                                </Typography>
                                <Button variant="outlined" fullWidth onClick={() => handleImport(skill)}>
                                    Import Skill
                                </Button>
                            </Box>
                        ))}
                    </Box>
                </Paper>
            ) : (
            <Paper sx={{ minHeight: 400 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                        <Tab icon={<DescIcon />} label="Definition" />
                        <Tab icon={<FileIcon />} label={`Files (${files.length})`} />
                    </Tabs>
                </Box>

                {/* Tab 0: Definition (SKILL.md) */}
                <CustomTabPanel value={tabValue} index={0}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                             <TextField
                                label="Skill Name (Folder Name)"
                                placeholder="my-awesome-skill"
                                fullWidth
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                helperText="Use lowercase and hyphens (e.g. data-analysis)"
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                label="Description"
                                placeholder="Briefly describe what this skill does"
                                fullWidth
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                sx={{ flex: 1 }}
                            />
                        </Box>
                        
                        <Box>
                             <Typography variant="subtitle2" gutterBottom>SKILL.md Content</Typography>
                             <Alert severity="info" sx={{ mb: 1, py: 0 }}>
                                This content defines how the agent should use the skill. The frontmatter (name/desc) is added automatically.
                            </Alert>
                             <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8f8f8', mb: 2 }}>
                                 <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', whiteSpace: 'pre' }}>
                                     {frontmatterPreview}
                                 </Typography>
                             </Paper>
                             <TextField
                                placeholder="# Instructions\n\n1. Step one..."
                                multiline
                                minRows={10}
                                fullWidth
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                                sx={{ fontFamily: 'monospace' }}
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
                                 <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
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
                                    sx={{ fontFamily: 'monospace' }}
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
        </Box>
      </Box>
    </Box>
  );
}
