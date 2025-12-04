import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Link,
} from '@mui/material';
import { Extension as ExtensionIcon, Add as AddIcon, Check as CheckIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { useAppStore } from '../store/appStore';
import type { Extension } from '../types';

import { CURATED_EXTENSIONS } from '../data/marketplace';

const AVAILABLE_EXTENSIONS = CURATED_EXTENSIONS;

export default function ExtensionsManager() {
  const { activeExtensions, toggleExtension } = useAppStore();

  const isInstalled = (ext: Extension) => activeExtensions.some(e => e.id === ext.id);

  return (
    <Box>
       <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Extensions Manager
        </Typography>
        <Typography variant="body1" color="text.secondary">
            Discover and install extensions to supercharge your Gemini CLI. 
            Select extensions here to include their installation instructions in your download.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {AVAILABLE_EXTENSIONS.map((ext) => {
            const installed = isInstalled(ext);
            return (
                <Box key={ext.id} sx={{ flex: 1, minWidth: 300, maxWidth: 400 }}>
                    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderColor: installed ? 'primary.main' : undefined, bgcolor: installed ? 'action.hover' : undefined }}>
                        <CardContent sx={{ flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <ExtensionIcon color={installed ? "primary" : "action"} sx={{ mr: 1 }} />
                                <Typography variant="h6" component="div">
                                    {ext.name}
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                {ext.description}
                            </Typography>
                            <Link href={ext.url} target="_blank" rel="noopener" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem' }}>
                                View on GitHub <OpenInNewIcon sx={{ fontSize: 14, ml: 0.5 }} />
                            </Link>
                        </CardContent>
                        <CardActions>
                            <Button 
                                fullWidth 
                                variant={installed ? "contained" : "outlined"} 
                                color={installed ? "success" : "primary"}
                                startIcon={installed ? <CheckIcon /> : <AddIcon />}
                                onClick={() => toggleExtension(ext)}
                            >
                                {installed ? 'Installed' : 'Add to Bundle'}
                            </Button>
                        </CardActions>
                    </Card>
                </Box>
            );
        })}
      </Box>

      {/* Installation Instructions Area */}
      {activeExtensions.length > 0 && (
          <Paper sx={{ mt: 4, p: 3, bgcolor: '#1e1e1e', color: '#d4d4d4' }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#fff' }}>
                  Installation Commands
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: '#aaa' }}>
                  Run these commands in your terminal after setting up Gemini CLI:
              </Typography>
              <Box component="pre" sx={{ fontFamily: 'monospace', overflowX: 'auto' }}>
                  {activeExtensions.map(ext => (
`# Install ${ext.name}
gemini extensions install ${ext.url}
`
                  )).join('\n')}
              </Box>
          </Paper>
      )}
    </Box>
  );
}
