import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  TextField,
  Tooltip,
  IconButton,
  MenuItem,
  Chip,
  Button,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { useAppStore } from '../store/appStore';
import type { Settings } from '../types';
import TerminalPreview from '../components/TerminalPreview';

export default function SettingsBuilder() {
  const { settings, updateSettings } = useAppStore();

  const handleToggle = (key: keyof Settings | string, subKey?: string) => {
    if (subKey && key === 'checkpointing') {
         updateSettings({
            checkpointing: { ...settings.checkpointing, [subKey]: !settings.checkpointing?.[subKey as keyof typeof settings.checkpointing] }
         });
    } else if (subKey && key === 'telemetry') {
        updateSettings({
           telemetry: { ...settings.telemetry, [subKey]: !settings.telemetry?.[subKey as keyof typeof settings.telemetry] }
        });
    } else {
        updateSettings({ [key]: !settings[key as keyof Settings] });
    }
  };

  const handleTextChange = (key: keyof Settings | string, value: string | boolean | undefined, subKey?: string) => {
     if (subKey && key === 'telemetry') {
        updateSettings({
           telemetry: { ...settings.telemetry, [subKey]: value }
        });
     } else {
         updateSettings({ [key]: value });
     }
  };

  // Helper for arrays like includeDirectories
  const handleAddArrayItem = (key: 'includeDirectories' | 'excludeTools', value: string) => {
      if (!value) return;
      updateSettings({ [key]: [...(settings[key] || []), value] });
  };

  const handleRemoveArrayItem = (key: 'includeDirectories' | 'excludeTools', index: number) => {
      const newArr = [...(settings[key] || [])];
      newArr.splice(index, 1);
      updateSettings({ [key]: newArr });
  };
  
  const [newDir, setNewDir] = React.useState('');
  const [newTool, setNewTool] = React.useState('');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Settings Generator (settings.json)
        </Typography>
        <Tooltip title="Configure how Gemini CLI behaves. These settings are saved in .gemini/settings.json">
            <IconButton color="primary"><InfoIcon /></IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Form Column */}
        <Box sx={{ flex: 2, minWidth: 300 }}>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Appearance</Typography>
                <TextField
                    select
                    label="Theme"
                    value={settings.theme || 'system'}
                    onChange={(e) => handleTextChange('theme', e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ mb: 2 }}
                >
                    <MenuItem value="system">System Default</MenuItem>
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                    <MenuItem value="GitHub">GitHub Theme</MenuItem>
                </TextField>
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Safety & Behavior</Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <FormControlLabel
                        control={<Switch checked={settings.autoAccept || false} onChange={() => handleToggle('autoAccept')} />}
                        label="YOLO Mode (Auto-Accept)"
                    />
                    <Tooltip title="DANGER: Automatically runs commands without asking for confirmation. Use with extreme caution!">
                        <IconButton size="small" color="warning"><InfoIcon /></IconButton>
                    </Tooltip>
                </Box>

                 <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <FormControlLabel
                        control={<Switch checked={settings.checkpointing?.enabled ?? true} onChange={() => handleToggle('checkpointing', 'enabled')} />}
                        label="Enable Checkpointing"
                    />
                    <Tooltip title="Creates a snapshot of files before changes, allowing you to /restore if Gemini messes up.">
                        <IconButton size="small"><InfoIcon /></IconButton>
                    </Tooltip>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <FormControlLabel
                        control={<Switch checked={settings.telemetry?.enabled || false} onChange={() => handleToggle('telemetry', 'enabled')} />}
                        label="Enable Telemetry"
                    />
                     <Tooltip title="Sends usage statistics. Useful for debugging or tracking token usage.">
                        <IconButton size="small"><InfoIcon /></IconButton>
                    </Tooltip>
                </Box>

                {settings.telemetry?.enabled && (
                    <TextField
                        select
                        label="Telemetry Target"
                        value={settings.telemetry?.target || 'local'}
                        onChange={(e) => handleTextChange('telemetry', e.target.value, 'target')}
                        fullWidth
                        size="small"
                        sx={{ mt: 1 }}
                    >
                        <MenuItem value="local">Local File</MenuItem>
                        <MenuItem value="gcp">Google Cloud</MenuItem>
                    </TextField>
                )}
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Workspaces & Tools</Typography>
                
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Include Directories</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField 
                        size="small" 
                        placeholder="../other-repo" 
                        fullWidth 
                        value={newDir} 
                        onChange={(e) => setNewDir(e.target.value)}
                        onKeyPress={(e) => {
                            if(e.key === 'Enter') { handleAddArrayItem('includeDirectories', newDir); setNewDir(''); }
                        }}
                    />
                    <Button variant="outlined" onClick={() => { handleAddArrayItem('includeDirectories', newDir); setNewDir(''); }}>Add</Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {settings.includeDirectories?.map((dir, idx) => (
                        <Chip key={idx} label={dir} onDelete={() => handleRemoveArrayItem('includeDirectories', idx)} />
                    ))}
                </Box>

                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Exclude Tools</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField 
                        size="small" 
                        placeholder="rm, run_shell_command" 
                        fullWidth 
                        value={newTool} 
                        onChange={(e) => setNewTool(e.target.value)}
                        onKeyPress={(e) => {
                            if(e.key === 'Enter') { handleAddArrayItem('excludeTools', newTool); setNewTool(''); }
                        }}
                    />
                    <Button variant="outlined" onClick={() => { handleAddArrayItem('excludeTools', newTool); setNewTool(''); }}>Add</Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {settings.excludeTools?.map((tool, idx) => (
                        <Chip key={idx} label={tool} onDelete={() => handleRemoveArrayItem('excludeTools', idx)} color="error" variant="outlined" />
                    ))}
                </Box>
            </Paper>
        </Box>

        {/* Preview Column */}
        <Box sx={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
                <Typography variant="subtitle2" gutterBottom>Theme Preview</Typography>
                <TerminalPreview themeName={settings.theme || 'system'} />
            </Box>

            <Paper sx={{ p: 2, bgcolor: '#1e1e1e', color: '#d4d4d4', flexGrow: 1, overflow: 'auto' }}>
                <Typography variant="overline" display="block" gutterBottom sx={{ color: '#9cdcfe' }}>
                    Live Preview (settings.json)
                </Typography>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {JSON.stringify(settings, null, 2)}
                </pre>
            </Paper>
        </Box>
      </Box>
    </Box>
  );
}
