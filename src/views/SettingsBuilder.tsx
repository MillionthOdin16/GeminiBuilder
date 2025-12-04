import React, { useState } from 'react';
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Divider,
  useTheme,
  useMediaQuery,
  Alert,
  InputAdornment,
} from '@mui/material';
import { 
  Info as InfoIcon, 
  ExpandMore as ExpandMoreIcon,
  Palette as PaletteIcon,
  Security as SecurityIcon,
  Build as BuildIcon,
  Visibility as VisibilityIcon,
  Storage as StorageIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAppStore } from '../store/appStore';
import type { Settings, GeminiTheme, McpServer } from '../types';
import TerminalPreview from '../components/TerminalPreview';

// All official Gemini CLI themes
const GEMINI_THEMES: { value: GeminiTheme; label: string; type: 'dark' | 'light' }[] = [
  { value: 'Default', label: 'Default', type: 'dark' },
  { value: 'ANSI', label: 'ANSI', type: 'dark' },
  { value: 'Atom One', label: 'Atom One', type: 'dark' },
  { value: 'Ayu', label: 'Ayu', type: 'dark' },
  { value: 'Dracula', label: 'Dracula', type: 'dark' },
  { value: 'GitHub', label: 'GitHub', type: 'dark' },
  { value: 'Default Light', label: 'Default Light', type: 'light' },
  { value: 'ANSI Light', label: 'ANSI Light', type: 'light' },
  { value: 'Ayu Light', label: 'Ayu Light', type: 'light' },
  { value: 'GitHub Light', label: 'GitHub Light', type: 'light' },
  { value: 'Google Code', label: 'Google Code', type: 'light' },
  { value: 'Xcode', label: 'Xcode', type: 'light' },
];

// Common tools that can be excluded
const COMMON_TOOLS = [
  'run_shell_command',
  'write_file',
  'edit_file',
  'delete_file',
  'create_directory',
  'read_file',
  'list_directory',
  'search_files',
  'web_search',
];

export default function SettingsBuilder() {
  const { settings, updateSettings } = useAppStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [newDir, setNewDir] = useState('');
  const [newTool, setNewTool] = useState('');
  const [expandedPanel, setExpandedPanel] = useState<string | false>('appearance');
  
  // MCP Server state
  const [newMcpName, setNewMcpName] = useState('');
  const [newMcpCommand, setNewMcpCommand] = useState('');
  const [newMcpArgs, setNewMcpArgs] = useState('');

  const handlePanelChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  const handleThemeChange = (newTheme: GeminiTheme) => {
    updateSettings({ theme: newTheme });
  };

  const handleToggleNested = (path: string[], currentValue: boolean | undefined) => {
    const newValue = !currentValue;
    
    // Build nested update object
    if (path.length === 2) {
      const [key, subKey] = path;
      updateSettings({
        [key]: { ...(settings[key as keyof Settings] as Record<string, unknown> || {}), [subKey]: newValue }
      });
    } else if (path.length === 3) {
      const [key, subKey, subSubKey] = path;
      const existing = settings[key as keyof Settings] as Record<string, unknown> || {};
      const existingSub = existing[subKey] as Record<string, unknown> || {};
      updateSettings({
        [key]: { ...existing, [subKey]: { ...existingSub, [subSubKey]: newValue } }
      });
    } else {
      updateSettings({ [path[0]]: newValue });
    }
  };

  const handleAddArrayItem = (key: 'includeDirectories' | 'excludeTools', value: string) => {
    if (!value.trim()) return;
    const currentArray = settings[key] || [];
    if (!currentArray.includes(value.trim())) {
      updateSettings({ [key]: [...currentArray, value.trim()] });
    }
  };

  const handleRemoveArrayItem = (key: 'includeDirectories' | 'excludeTools', index: number) => {
    const newArr = [...(settings[key] || [])];
    newArr.splice(index, 1);
    updateSettings({ [key]: newArr });
  };

  const handleAddMcpServer = () => {
    if (!newMcpName.trim() || !newMcpCommand.trim()) return;
    
    const newServer: McpServer = {
      command: newMcpCommand.trim(),
      ...(newMcpArgs.trim() ? { args: newMcpArgs.split(' ').filter(Boolean) } : {}),
    };
    
    updateSettings({
      mcpServers: {
        ...(settings.mcpServers || {}),
        [newMcpName.trim()]: newServer,
      }
    });
    
    setNewMcpName('');
    setNewMcpCommand('');
    setNewMcpArgs('');
  };

  const handleRemoveMcpServer = (name: string) => {
    const newServers = { ...(settings.mcpServers || {}) };
    delete newServers[name];
    updateSettings({ mcpServers: newServers });
  };

  const SettingRow = ({ 
    label, 
    tooltip, 
    checked, 
    onChange,
    danger = false,
  }: { 
    label: string; 
    tooltip: string; 
    checked: boolean; 
    onChange: () => void;
    danger?: boolean;
  }) => (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      py: 1,
      px: 1,
      borderRadius: 1,
      '&:hover': { bgcolor: 'action.hover' },
    }}>
      <FormControlLabel
        control={
          <Switch 
            checked={checked} 
            onChange={onChange}
            color={danger ? 'warning' : 'primary'}
          />
        }
        label={<Typography variant="body2">{label}</Typography>}
      />
      <Tooltip title={tooltip} arrow>
        <IconButton size="small" color={danger ? 'warning' : 'default'}>
          <InfoIcon fontSize="small" />
        </IconButton>
      </Tooltip>
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
            Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure Gemini CLI behavior • Saved to .gemini/settings.json
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Settings Column */}
        <Grid size={{ xs: 12, lg: 7 }}>
          {/* Appearance */}
          <Accordion 
            expanded={expandedPanel === 'appearance'} 
            onChange={handlePanelChange('appearance')}
            sx={{ mb: 2 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PaletteIcon color="primary" />
                <Typography fontWeight={500}>Appearance</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="subtitle2" gutterBottom>Theme</Typography>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {GEMINI_THEMES.map((t) => (
                  <Grid size={{ xs: 6, sm: 4 }} key={t.value}>
                    <Paper
                      variant="outlined"
                      onClick={() => handleThemeChange(t.value)}
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        textAlign: 'center',
                        borderColor: settings.theme === t.value ? 'primary.main' : 'divider',
                        borderWidth: settings.theme === t.value ? 2 : 1,
                        bgcolor: settings.theme === t.value ? 'primary.50' : 'transparent',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: 'primary.light',
                        },
                      }}
                    >
                      <Typography variant="body2" fontWeight={settings.theme === t.value ? 600 : 400}>
                        {t.label}
                      </Typography>
                      <Chip 
                        label={t.type} 
                        size="small" 
                        sx={{ mt: 0.5, fontSize: '0.65rem' }}
                        color={t.type === 'dark' ? 'default' : 'primary'}
                        variant="outlined"
                      />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Safety & Behavior */}
          <Accordion 
            expanded={expandedPanel === 'safety'} 
            onChange={handlePanelChange('safety')}
            sx={{ mb: 2 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon color="warning" />
                <Typography fontWeight={500}>Safety & Behavior</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Alert severity="warning" sx={{ mb: 2 }}>
                These settings control tool execution safety. Be careful with YOLO mode!
              </Alert>
              
              <SettingRow
                label="YOLO Mode (Auto-Accept)"
                tooltip="DANGER: Automatically runs commands without confirmation. Use with extreme caution!"
                checked={settings.tools?.autoAccept || false}
                onChange={() => handleToggleNested(['tools', 'autoAccept'], settings.tools?.autoAccept)}
                danger
              />
              
              <SettingRow
                label="Enable Checkpointing"
                tooltip="Creates snapshots of files before changes, allowing you to /restore if needed."
                checked={settings.checkpointing?.enabled ?? true}
                onChange={() => handleToggleNested(['checkpointing', 'enabled'], settings.checkpointing?.enabled)}
              />
              
              <SettingRow
                label="Disable YOLO Mode Override"
                tooltip="Prevents YOLO mode from being enabled, even via command line flags."
                checked={settings.security?.disableYoloMode || false}
                onChange={() => handleToggleNested(['security', 'disableYoloMode'], settings.security?.disableYoloMode)}
              />
              
              <SettingRow
                label="Block Git Extensions"
                tooltip="Prevents installing extensions from Git repositories for extra security."
                checked={settings.security?.blockGitExtensions || false}
                onChange={() => handleToggleNested(['security', 'blockGitExtensions'], settings.security?.blockGitExtensions)}
              />
              
              <SettingRow
                label="Enable Folder Trust"
                tooltip="Requires explicit trust for folders before executing commands."
                checked={settings.security?.folderTrust?.enabled || false}
                onChange={() => handleToggleNested(['security', 'folderTrust', 'enabled'], settings.security?.folderTrust?.enabled)}
              />
            </AccordionDetails>
          </Accordion>

          {/* UI Options */}
          <Accordion 
            expanded={expandedPanel === 'ui'} 
            onChange={handlePanelChange('ui')}
            sx={{ mb: 2 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VisibilityIcon color="info" />
                <Typography fontWeight={500}>UI Options</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <SettingRow
                label="Show Line Numbers"
                tooltip="Display line numbers in code output."
                checked={settings.ui?.showLineNumbers || false}
                onChange={() => handleToggleNested(['ui', 'showLineNumbers'], settings.ui?.showLineNumbers)}
              />
              
              <SettingRow
                label="Show Citations"
                tooltip="Display citations for generated text."
                checked={settings.ui?.showCitations || false}
                onChange={() => handleToggleNested(['ui', 'showCitations'], settings.ui?.showCitations)}
              />
              
              <SettingRow
                label="Use Full Width"
                tooltip="Use the entire terminal width for output."
                checked={settings.ui?.useFullWidth ?? true}
                onChange={() => handleToggleNested(['ui', 'useFullWidth'], settings.ui?.useFullWidth)}
              />
              
              <SettingRow
                label="Hide Tips"
                tooltip="Hide helpful tips in the UI."
                checked={settings.ui?.hideTips || false}
                onChange={() => handleToggleNested(['ui', 'hideTips'], settings.ui?.hideTips)}
              />
              
              <SettingRow
                label="Hide Banner"
                tooltip="Hide the application banner on startup."
                checked={settings.ui?.hideBanner || false}
                onChange={() => handleToggleNested(['ui', 'hideBanner'], settings.ui?.hideBanner)}
              />
              
              <SettingRow
                label="Screen Reader Mode"
                tooltip="Render output in plain text for better screen reader accessibility."
                checked={settings.ui?.accessibility?.screenReader || false}
                onChange={() => handleToggleNested(['ui', 'accessibility', 'screenReader'], settings.ui?.accessibility?.screenReader)}
              />
            </AccordionDetails>
          </Accordion>

          {/* Tools & Shell */}
          <Accordion 
            expanded={expandedPanel === 'tools'} 
            onChange={handlePanelChange('tools')}
            sx={{ mb: 2 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BuildIcon color="success" />
                <Typography fontWeight={500}>Tools & Shell</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <SettingRow
                label="Use Ripgrep"
                tooltip="Use ripgrep for faster file content search."
                checked={settings.tools?.useRipgrep ?? true}
                onChange={() => handleToggleNested(['tools', 'useRipgrep'], settings.tools?.useRipgrep)}
              />
              
              <SettingRow
                label="Interactive Shell"
                tooltip="Use node-pty for an interactive shell experience."
                checked={settings.tools?.shell?.enableInteractiveShell ?? true}
                onChange={() => handleToggleNested(['tools', 'shell', 'enableInteractiveShell'], settings.tools?.shell?.enableInteractiveShell)}
              />
              
              <SettingRow
                label="Shell Color Output"
                tooltip="Show colors in shell command output."
                checked={settings.tools?.shell?.showColor || false}
                onChange={() => handleToggleNested(['tools', 'shell', 'showColor'], settings.tools?.shell?.showColor)}
              />
              
              <SettingRow
                label="Truncate Tool Output"
                tooltip="Automatically truncate large tool outputs."
                checked={settings.tools?.enableToolOutputTruncation ?? true}
                onChange={() => handleToggleNested(['tools', 'enableToolOutputTruncation'], settings.tools?.enableToolOutputTruncation)}
              />

              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Exclude Tools</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Prevent specific tools from being used
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                {COMMON_TOOLS.filter(t => !(settings.excludeTools || []).includes(t)).slice(0, 4).map((tool) => (
                  <Chip
                    key={tool}
                    label={tool}
                    size="small"
                    variant="outlined"
                    onClick={() => handleAddArrayItem('excludeTools', tool)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField 
                  size="small" 
                  placeholder="Tool name" 
                  fullWidth 
                  value={newTool} 
                  onChange={(e) => setNewTool(e.target.value)}
                  onKeyPress={(e) => {
                    if(e.key === 'Enter') { handleAddArrayItem('excludeTools', newTool); setNewTool(''); }
                  }}
                />
                <Button 
                  variant="outlined" 
                  onClick={() => { handleAddArrayItem('excludeTools', newTool); setNewTool(''); }}
                  startIcon={<AddIcon />}
                >
                  Add
                </Button>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {settings.excludeTools?.map((tool, idx) => (
                  <Chip 
                    key={idx} 
                    label={tool} 
                    onDelete={() => handleRemoveArrayItem('excludeTools', idx)} 
                    color="error" 
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Context & Workspaces */}
          <Accordion 
            expanded={expandedPanel === 'context'} 
            onChange={handlePanelChange('context')}
            sx={{ mb: 2 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StorageIcon color="secondary" />
                <Typography fontWeight={500}>Context & Workspaces</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <SettingRow
                label="Respect .gitignore"
                tooltip="Ignore files matching .gitignore patterns when searching."
                checked={settings.context?.fileFiltering?.respectGitIgnore ?? true}
                onChange={() => handleToggleNested(['context', 'fileFiltering', 'respectGitIgnore'], settings.context?.fileFiltering?.respectGitIgnore)}
              />
              
              <SettingRow
                label="Respect .geminiignore"
                tooltip="Ignore files matching .geminiignore patterns when searching."
                checked={settings.context?.fileFiltering?.respectGeminiIgnore ?? true}
                onChange={() => handleToggleNested(['context', 'fileFiltering', 'respectGeminiIgnore'], settings.context?.fileFiltering?.respectGeminiIgnore)}
              />
              
              <SettingRow
                label="Recursive File Search"
                tooltip="Enable recursive file search for @ references."
                checked={settings.context?.fileFiltering?.enableRecursiveFileSearch ?? true}
                onChange={() => handleToggleNested(['context', 'fileFiltering', 'enableRecursiveFileSearch'], settings.context?.fileFiltering?.enableRecursiveFileSearch)}
              />

              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Include Directories</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Additional directories to include in the workspace
              </Typography>
              
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
                <Button 
                  variant="outlined" 
                  onClick={() => { handleAddArrayItem('includeDirectories', newDir); setNewDir(''); }}
                  startIcon={<AddIcon />}
                >
                  Add
                </Button>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {settings.includeDirectories?.map((dir, idx) => (
                  <Chip 
                    key={idx} 
                    label={dir} 
                    onDelete={() => handleRemoveArrayItem('includeDirectories', idx)}
                    size="small"
                  />
                ))}
                {(settings.includeDirectories?.length || 0) === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    No additional directories configured
                  </Typography>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* MCP Servers */}
          <Accordion 
            expanded={expandedPanel === 'mcp'} 
            onChange={handlePanelChange('mcp')}
            sx={{ mb: 2 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StorageIcon color="info" />
                <Typography fontWeight={500}>MCP Servers</Typography>
                {Object.keys(settings.mcpServers || {}).length > 0 && (
                  <Chip 
                    label={Object.keys(settings.mcpServers || {}).length} 
                    size="small" 
                    color="primary"
                  />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Alert severity="info" sx={{ mb: 2 }}>
                MCP (Model Context Protocol) servers extend Gemini CLI with additional capabilities.
              </Alert>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                <TextField
                  size="small"
                  label="Server Name"
                  placeholder="my-server"
                  value={newMcpName}
                  onChange={(e) => setNewMcpName(e.target.value)}
                />
                <TextField
                  size="small"
                  label="Command"
                  placeholder="npx -y @modelcontextprotocol/server"
                  value={newMcpCommand}
                  onChange={(e) => setNewMcpCommand(e.target.value)}
                />
                <TextField
                  size="small"
                  label="Arguments (space-separated)"
                  placeholder="--option value"
                  value={newMcpArgs}
                  onChange={(e) => setNewMcpArgs(e.target.value)}
                />
                <Button 
                  variant="outlined" 
                  onClick={handleAddMcpServer}
                  disabled={!newMcpName.trim() || !newMcpCommand.trim()}
                  startIcon={<AddIcon />}
                >
                  Add MCP Server
                </Button>
              </Box>

              {Object.entries(settings.mcpServers || {}).map(([name, server]) => (
                <Paper key={name} variant="outlined" sx={{ p: 2, mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>{name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        {server.command} {server.args?.join(' ') || ''}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => handleRemoveMcpServer(name)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Paper>
              ))}

              {Object.keys(settings.mcpServers || {}).length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No MCP servers configured. Add one above or install extensions that include MCP servers.
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>

          {/* Telemetry */}
          <Accordion 
            expanded={expandedPanel === 'telemetry'} 
            onChange={handlePanelChange('telemetry')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StorageIcon />
                <Typography fontWeight={500}>Telemetry</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <SettingRow
                label="Enable Telemetry"
                tooltip="Send usage statistics. Useful for debugging or tracking token usage."
                checked={settings.telemetry?.enabled || false}
                onChange={() => handleToggleNested(['telemetry', 'enabled'], settings.telemetry?.enabled)}
              />
              
              {settings.telemetry?.enabled && (
                <TextField
                  select
                  label="Telemetry Target"
                  value={settings.telemetry?.target || 'local'}
                  onChange={(e) => updateSettings({
                    telemetry: { ...settings.telemetry, target: e.target.value }
                  })}
                  fullWidth
                  size="small"
                  sx={{ mt: 2 }}
                >
                  <MenuItem value="local">Local File</MenuItem>
                  <MenuItem value="gcp">Google Cloud</MenuItem>
                </TextField>
              )}
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Preview Column */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Box sx={{ position: { lg: 'sticky' }, top: { lg: 80 } }}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Theme Preview</Typography>
              <TerminalPreview themeName={settings.theme || 'Default'} />
            </Paper>

            <Paper sx={{ p: 2, bgcolor: '#1e1e1e', color: '#d4d4d4', maxHeight: 400, overflow: 'auto' }}>
              <Typography variant="overline" display="block" gutterBottom sx={{ color: '#9cdcfe' }}>
                settings.json Preview
              </Typography>
              <pre style={{ 
                whiteSpace: 'pre-wrap', 
                fontFamily: 'monospace', 
                fontSize: '0.8rem',
                margin: 0,
              }}>
                {JSON.stringify(settings, null, 2)}
              </pre>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
