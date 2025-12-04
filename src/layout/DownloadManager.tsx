import React from 'react';
import { Paper, Typography, Box, Button, Badge } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useAppStore } from '../store/appStore';

export default function DownloadManager() {
  const { settings, contextSections, commands, activeExtensions, skills } = useAppStore();

  const handleDownloadZip = async () => {
    const zip = new JSZip();

    // 1. GEMINI.md
    const geminiMdContent = contextSections
      .filter((s) => s.enabled)
      .map((s) => `# ${s.title}\n\n${s.content}`)
      .join('\n\n');
    zip.file('GEMINI.md', geminiMdContent);

    // 2. .gemini/settings.json
    zip.file('.gemini/settings.json', JSON.stringify(settings, null, 2));

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

                const tomlContent = `description = "${cmd.description}"\n\nprompt = """\n${cmd.prompt}\n"""`;
                currentFolder.file(fileName, tomlContent);
            });
        }
    }

    // 4. .skillz folder
    if (skills.length > 0) {
        const skillsBase = zip.folder('.skillz');
        if (skillsBase) {
            skills.forEach((skill) => {
                const skillFolder = skillsBase.folder(skill.name);
                if (skillFolder) {
                    // Create SKILL.md
                    const skillMdContent = `---
name: ${skill.name}
description: ${skill.description}
---

${skill.instructions}`;
                    skillFolder.file('SKILL.md', skillMdContent);

                    // Create helper files
                    skill.files.forEach((f) => {
                        skillFolder.file(f.name, f.content);
                    });
                }
            });
        }
    }

    // 5. Installation Script
    let scriptContent = `#!/bin/bash
# Gemini Config Setup Script
`;

    if (activeExtensions.length > 0) {
        scriptContent += `
echo "Installing Extensions..."
${activeExtensions.map(ext => `gemini extensions install ${ext.url}`).join('\n')}
`;
    }

    if (skills.length > 0) {
        scriptContent += `
echo "Setting up Skills..."
mkdir -p ~/.skillz
# Copy skills from the bundled .skillz folder to ~/.skillz
# Assuming you run this script from the unzipped folder
if [ -d ".skillz" ]; then
    cp -r .skillz/* ~/.skillz/
    echo "Skills installed to ~/.skillz"
else
    echo "Warning: .skillz folder not found in current directory."
fi
`;
    }

    if (activeExtensions.length > 0 || skills.length > 0) {
        zip.file('setup.sh', scriptContent);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'gemini-config.zip');
  };

  const fileCount = 1 + 1 + commands.length + skills.length + ((activeExtensions.length > 0 || skills.length > 0) ? 1 : 0); 

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 240, // Match drawer width
        right: 0,
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: 'background.paper',
        borderTop: '1px solid #e0e0e0',
        zIndex: 1000,
      }}
      elevation={3}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Badge badgeContent={fileCount} color="primary">
            <DescriptionIconWrapper />
        </Badge>
        <Typography variant="body1">
          <strong>Ready to download:</strong> GEMINI.md, settings.json, {commands.length} Custom Commands
        </Typography>
      </Box>
      <Button
        variant="contained"
        color="primary"
        startIcon={<DownloadIcon />}
        onClick={handleDownloadZip}
      >
        Download All (.zip)
      </Button>
    </Paper>
  );
}

function DescriptionIconWrapper() {
    // Just a placeholder for the icon in badge to avoid circular dependency or extra imports if not needed
    return <Box sx={{ width: 24, height: 24, bgcolor: 'primary.main', borderRadius: '50%' }} />;
}
