import React, { useState } from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  Button, 
  Badge, 
  Snackbar, 
  Alert,
  useMediaQuery,
  useTheme,
  IconButton,
  Tooltip,
  Collapse,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { 
  Download as DownloadIcon, 
  Upload as UploadIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Folder as FolderIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useAppStore } from '../store/appStore';
import { CURATED_EXTENSIONS } from '../data/marketplace';

const drawerWidth = 260;

// Skillz MCP server configuration for enabling skills
const SKILLZ_MCP_CONFIG = {
  command: 'npx',
  args: ['-y', '@anthropic/skillz-mcp-server'],
  env: {
    SKILLZ_PATH: '~/.skillz'
  }
};

export default function DownloadManager() {
  const { settings, contextSections, commands, activeExtensions, skills, updateSettings, toggleExtension } = useAppStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [expanded, setExpanded] = useState(!isSmall);
  const [copied, setCopied] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState('');
  const [showSkillsWarning, setShowSkillsWarning] = useState(false);

  // Check if skills are being used but skillz extension is not installed
  const skillzExtension = CURATED_EXTENSIONS.find(e => e.id === 'skillz');
  const isSkillzInstalled = activeExtensions.some(e => e.id === 'skillz');
  const hasSkillsButNoSkillz = skills.length > 0 && !isSkillzInstalled;

  const handleDownloadZip = async () => {
    // Warn if skills are used but skillz extension isn't selected
    if (hasSkillsButNoSkillz) {
      setShowSkillsWarning(true);
      return;
    }

    await generateAndDownloadZip();
  };

  const generateAndDownloadZip = async () => {
    try {
      const zip = new JSZip();

      // 1. GEMINI.md
      const geminiMdContent = contextSections
        .filter((s) => s.enabled)
        .map((s) => `# ${s.title}\n\n${s.content}`)
        .join('\n\n');
      
      if (geminiMdContent.trim()) {
        zip.file('GEMINI.md', geminiMdContent);
      }

      // 2. Build settings with MCP servers for skills if needed
      let finalSettings = { ...settings };
      
      // Add skillz MCP server if skills are present
      if (skills.length > 0) {
        finalSettings = {
          ...finalSettings,
          mcpServers: {
            ...finalSettings.mcpServers,
            skillz: SKILLZ_MCP_CONFIG
          }
        };
      }

      // Clean up empty/default values for cleaner output
      const cleanSettings = cleanupSettings(finalSettings);
      zip.file('.gemini/settings.json', JSON.stringify(cleanSettings, null, 2));

      // 3. .gemini/commands/*.toml
      if (commands.length > 0) {
        const commandsBase = zip.folder('.gemini/commands');
        if (commandsBase) {
          commands.forEach((cmd) => {
            const parts = cmd.name.split(':');
            const fileName = parts.pop() + '.toml';
            let currentFolder = commandsBase;
            
            parts.forEach(part => {
              const next = currentFolder.folder(part);
              if (next) currentFolder = next;
            });

            // Properly escape TOML strings
            const escapedDesc = cmd.description.replace(/"/g, '\\"');
            const tomlContent = `description = "${escapedDesc}"

prompt = """
${cmd.prompt}
"""`;
            currentFolder.file(fileName, tomlContent);
          });
        }
      }

      // 4. .skillz folder (Claude-style skills)
      if (skills.length > 0) {
        const skillsBase = zip.folder('.skillz');
        if (skillsBase) {
          skills.forEach((skill) => {
            const skillFolder = skillsBase.folder(skill.name);
            if (skillFolder) {
              // Create SKILL.md with proper YAML frontmatter
              const skillMdContent = `---
name: ${skill.name}
description: ${skill.description}
---

${skill.instructions}`;
              skillFolder.file('SKILL.md', skillMdContent);

              // Add any helper files
              skill.files.forEach((f) => {
                skillFolder.file(f.name, f.content);
              });
            }
          });
        }
      }

      // 5. Installation Script
      const scriptContent = generateSetupScript();
      zip.file('setup.sh', scriptContent);

      // 6. README with complete instructions
      const readmeContent = generateReadme();
      zip.file('README.md', readmeContent);

      // 7. Export configuration for re-import
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        contextSections: contextSections,
        settings: settings,
        commands: commands,
        skills: skills,
        activeExtensions: activeExtensions.map(e => e.id),
      };
      zip.file('.gemini/config-export.json', JSON.stringify(exportData, null, 2));

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'gemini-config.zip');
      
      setSnackbar({ open: true, message: 'Configuration downloaded successfully!', severity: 'success' });
    } catch (error) {
      console.error('Download error:', error);
      setSnackbar({ open: true, message: 'Error generating download', severity: 'error' });
    }
  };

  const cleanupSettings = (s: typeof settings) => {
    // Remove empty arrays and default values for cleaner output
    const cleaned: Record<string, unknown> = {};
    
    if (s.theme && s.theme !== 'Default') cleaned.theme = s.theme;
    if (s.tools?.autoAccept) cleaned.autoAccept = true;
    if (s.checkpointing && !s.checkpointing.enabled) {
      cleaned.checkpointing = { enabled: false };
    }
    if (s.telemetry?.enabled) {
      cleaned.telemetry = s.telemetry;
    }
    if (s.includeDirectories && s.includeDirectories.length > 0) {
      cleaned.includeDirectories = s.includeDirectories;
    }
    if (s.excludeTools && s.excludeTools.length > 0) {
      cleaned.excludeTools = s.excludeTools;
    }
    if (s.mcpServers && Object.keys(s.mcpServers).length > 0) {
      cleaned.mcpServers = s.mcpServers;
    }
    if (s.security) {
      const securitySettings: Record<string, unknown> = {};
      if (s.security.disableYoloMode) securitySettings.disableYoloMode = true;
      if (s.security.blockGitExtensions) securitySettings.blockGitExtensions = true;
      if (Object.keys(securitySettings).length > 0) {
        cleaned.security = securitySettings;
      }
    }
    if (s.ui) {
      cleaned.ui = s.ui;
    }
    
    return cleaned;
  };

  const generateSetupScript = () => {
    let script = `#!/bin/bash
# Gemini CLI Configuration Setup Script
# Generated by Gemini CLI Configurator
# https://github.com/MillionthOdin16/GeminiBuilder

set -e

echo "🚀 Setting up Gemini CLI configuration..."
echo ""

# Check if Gemini CLI is installed
if ! command -v gemini &> /dev/null; then
    echo "⚠️  Gemini CLI is not installed."
    echo "   Install it first: npm install -g @anthropic/gemini-cli"
    exit 1
fi

`;

    // Install extensions
    if (activeExtensions.length > 0) {
      script += `# Install Extensions
echo "📦 Installing ${activeExtensions.length} extension(s)..."
${activeExtensions.map(ext => `gemini extensions install ${ext.url} || echo "Warning: Failed to install ${ext.name}"`).join('\n')}
echo ""
`;
    }

    // Set up skills
    if (skills.length > 0) {
      script += `# Set up Skills (Claude-style)
echo "🧠 Setting up ${skills.length} skill(s)..."
SKILLZ_DIR="\${HOME}/.skillz"
mkdir -p "\${SKILLZ_DIR}"

if [ -d ".skillz" ]; then
    cp -r .skillz/* "\${SKILLZ_DIR}/"
    echo "✅ Skills installed to \${SKILLZ_DIR}"
    echo "   Skills: ${skills.map(s => s.name).join(', ')}"
else
    echo "⚠️  Warning: .skillz folder not found in current directory."
fi
echo ""
`;
    }

    // Copy configuration files
    script += `# Copy configuration files
echo "📁 Setting up configuration files..."

if [ -f "GEMINI.md" ]; then
    echo "✅ GEMINI.md ready (context file)"
fi

if [ -d ".gemini" ]; then
    echo "✅ .gemini/ folder ready (settings & commands)"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "✨ Setup complete!"
echo ""
echo "Your configuration includes:"
echo "  • ${contextSections.filter(s => s.enabled).length} context section(s) in GEMINI.md"
echo "  • ${commands.length} custom command(s)"
echo "  • ${skills.length} skill(s)"
echo "  • ${activeExtensions.length} extension(s)"
echo ""
echo "Run 'gemini' in this directory to start!"
echo "═══════════════════════════════════════════════════"
`;

    return script;
  };

  const generateReadme = () => {
    return `# Gemini CLI Configuration

This bundle was generated by the [Gemini CLI Configurator](https://github.com/MillionthOdin16/GeminiBuilder).

## 📦 Contents

| File/Folder | Description |
|-------------|-------------|
| \`GEMINI.md\` | Context file with ${contextSections.filter(s => s.enabled).length} section(s) |
| \`.gemini/settings.json\` | CLI settings and preferences |
| \`.gemini/commands/\` | ${commands.length} custom slash command(s) |
| \`.skillz/\` | ${skills.length} agent skill(s) |
| \`setup.sh\` | Automated installation script |
| \`.gemini/config-export.json\` | Configuration export for re-import |

## 🚀 Quick Start

### Automatic Setup
\`\`\`bash
# Extract the zip to your project root
unzip gemini-config.zip -d my-project
cd my-project

# Run the setup script
chmod +x setup.sh
./setup.sh
\`\`\`

### Manual Setup
1. Copy \`GEMINI.md\` to your project root
2. Copy the \`.gemini/\` folder to your project root
${skills.length > 0 ? '3. Copy \`.skillz/\` contents to \`~/.skillz/\`\n' : ''}${activeExtensions.length > 0 ? `${skills.length > 0 ? '4' : '3'}. Install extensions:\n${activeExtensions.map(ext => `   \`\`\`bash\n   gemini extensions install ${ext.url}\n   \`\`\``).join('\n')}` : ''}

## 📝 Custom Commands

${commands.length > 0 ? commands.map(cmd => `### \`/${cmd.name}\`
${cmd.description}
`).join('\n') : 'No custom commands configured.'}

## 🧠 Skills

${skills.length > 0 ? `Skills extend Gemini CLI with specialized capabilities, similar to Claude's skills system.

${skills.map(skill => `### ${skill.name}
${skill.description}
`).join('\n')}

**Note:** Skills require the [gemini-cli-skillz](https://github.com/intellectronica/gemini-cli-skillz) extension to work.
` : 'No skills configured.'}

## 🔌 Extensions

${activeExtensions.length > 0 ? activeExtensions.map(ext => `- **${ext.name}**: ${ext.description}
`).join('') : 'No extensions configured.'}

## 📚 Learn More

- [Gemini CLI Documentation](https://geminicli.com/docs/)
- [GEMINI.md Guide](https://geminicli.com/docs/customization/gemini-md)
- [Custom Commands](https://geminicli.com/docs/customization/commands)
- [Settings Reference](https://geminicli.com/docs/customization/settings)

## 🔄 Re-import Configuration

To re-import this configuration into the Gemini CLI Configurator:
1. Open the configurator
2. Click "Import Configuration"
3. Paste the contents of \`.gemini/config-export.json\`
`;
  };

  const handleCopySettings = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(settings, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setSnackbar({ open: true, message: 'Settings copied to clipboard!', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to copy settings', severity: 'error' });
    }
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importData);
      
      if (data.version !== '1.0') {
        setSnackbar({ open: true, message: 'Unsupported configuration version', severity: 'error' });
        return;
      }

      // This would require additional store methods to properly import
      // For now, show success and close dialog
      setSnackbar({ open: true, message: 'Import functionality coming soon!', severity: 'info' });
      setImportDialogOpen(false);
      setImportData('');
    } catch {
      setSnackbar({ open: true, message: 'Invalid configuration format', severity: 'error' });
    }
  };

  const handleAddSkillzAndDownload = async () => {
    // Add skillz extension
    if (skillzExtension && !isSkillzInstalled) {
      toggleExtension(skillzExtension);
    }
    setShowSkillsWarning(false);
    
    // Small delay to let state update
    setTimeout(() => {
      generateAndDownloadZip();
    }, 100);
  };

  const fileCount = 1 + 1 + commands.length + skills.length + 1 + 1 + 1; // GEMINI.md, settings.json, commands, skills, setup.sh, README, config-export

  const summaryItems = [
    { label: 'Context', count: contextSections.filter(s => s.enabled).length },
    { label: 'Commands', count: commands.length },
    { label: 'Skills', count: skills.length },
    { label: 'Extensions', count: activeExtensions.length },
  ];

  return (
    <>
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: { xs: 0, md: drawerWidth },
          right: 0,
          p: { xs: 1.5, sm: 2 },
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: { xs: 1, sm: 2 },
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          zIndex: 1000,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
        }}
        elevation={3}
      >
        {/* Summary Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
          <Tooltip title={`${fileCount} files ready`}>
            <Badge badgeContent={fileCount} color="primary">
              <FolderIcon color="action" />
            </Badge>
          </Tooltip>
          
          {isSmall ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontWeight={500}>
                Ready to download
              </Typography>
              <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {summaryItems.map((item) => (
                <Chip
                  key={item.label}
                  label={`${item.count} ${item.label}`}
                  size="small"
                  variant="outlined"
                  sx={{ 
                    fontSize: '0.75rem',
                    opacity: item.count > 0 ? 1 : 0.5 
                  }}
                />
              ))}
              {hasSkillsButNoSkillz && (
                <Tooltip title="Skills require the Skillz extension">
                  <Chip
                    icon={<WarningIcon />}
                    label="Skillz needed"
                    size="small"
                    color="warning"
                    sx={{ fontSize: '0.75rem' }}
                  />
                </Tooltip>
              )}
            </Box>
          )}
        </Box>

        {/* Expanded details for mobile */}
        {isSmall && (
          <Collapse in={expanded}>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
              {summaryItems.map((item) => (
                <Chip
                  key={item.label}
                  label={`${item.count} ${item.label}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              ))}
            </Box>
          </Collapse>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Import configuration">
            <IconButton 
              onClick={() => setImportDialogOpen(true)}
              size={isSmall ? 'small' : 'medium'}
            >
              <UploadIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Copy settings.json">
            <IconButton 
              onClick={handleCopySettings} 
              color={copied ? 'success' : 'default'}
              size={isSmall ? 'small' : 'medium'}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </IconButton>
          </Tooltip>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadZip}
            size={isSmall ? 'small' : 'medium'}
            sx={{
              background: 'linear-gradient(135deg, #1a73e8 0%, #6c47ff 100%)',
              fontWeight: 600,
              px: { xs: 2, sm: 3 },
            }}
          >
            {isSmall ? 'Download' : 'Download Bundle'}
          </Button>
        </Box>
      </Paper>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Configuration</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Paste the contents of a <code>config-export.json</code> file to restore a previous configuration.
          </Typography>
          <TextField
            multiline
            rows={10}
            fullWidth
            placeholder='{"version": "1.0", ...}'
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.85rem' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleImport} variant="contained" disabled={!importData.trim()}>
            Import
          </Button>
        </DialogActions>
      </Dialog>

      {/* Skills Warning Dialog */}
      <Dialog open={showSkillsWarning} onClose={() => setShowSkillsWarning(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Skills Require Extension
        </DialogTitle>
        <DialogContent>
          <Typography paragraph>
            You have <strong>{skills.length} skill(s)</strong> configured, but the <strong>Gemini CLI Skillz</strong> extension is not selected.
          </Typography>
          <Typography paragraph>
            Skills are similar to Claude's skills and require the Skillz extension to function. The extension provides an MCP server that enables skill discovery and execution.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Would you like to add the Skillz extension to your bundle?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setShowSkillsWarning(false); generateAndDownloadZip(); }}>
            Download Without Extension
          </Button>
          <Button onClick={handleAddSkillzAndDownload} variant="contained" color="primary">
            Add Extension & Download
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
