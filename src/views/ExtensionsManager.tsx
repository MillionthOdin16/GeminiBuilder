import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Link,
  Grid,
  TextField,
  InputAdornment,
  Chip,
  Tabs,
  Tab,
  Alert,
  IconButton,
  Collapse,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { 
  Extension as ExtensionIcon, 
  Add as AddIcon, 
  Check as CheckIcon, 
  OpenInNew as OpenInNewIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { useAppStore } from '../store/appStore';
import type { Extension } from '../types';

import { CURATED_EXTENSIONS, EXTENSION_CATEGORIES } from '../data/marketplace';

export default function ExtensionsManager() {
  const { activeExtensions, toggleExtension } = useAppStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCommands, setShowCommands] = useState(true);
  const [copied, setCopied] = useState(false);

  const isInstalled = (ext: Extension) => activeExtensions.some(e => e.id === ext.id);

  const filteredExtensions = useMemo(() => {
    return CURATED_EXTENSIONS.filter(ext => {
      const matchesSearch = !searchQuery || 
        ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ext.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!selectedCategory) return matchesSearch;
      
      const category = EXTENSION_CATEGORIES.find(c => c.id === selectedCategory);
      return matchesSearch && category?.extensions.includes(ext.id);
    });
  }, [searchQuery, selectedCategory]);

  const handleCopyCommands = async () => {
    const commands = activeExtensions
      .map(ext => `gemini extensions install ${ext.url}`)
      .join('\n');
    
    try {
      await navigator.clipboard.writeText(commands);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

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
            Extensions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Extend Gemini CLI with MCP servers and integrations
          </Typography>
        </Box>
        <Chip 
          label={`${activeExtensions.length} selected`} 
          color="primary" 
          variant="outlined"
        />
      </Box>

      {/* Search and filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search extensions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: { md: 300 } }}
          />
          
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              label="All"
              size="small"
              onClick={() => setSelectedCategory(null)}
              color={selectedCategory === null ? 'primary' : 'default'}
              variant={selectedCategory === null ? 'filled' : 'outlined'}
            />
            {EXTENSION_CATEGORIES.map((cat) => (
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
        </Box>
      </Paper>

      {/* Extensions Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {filteredExtensions.map((ext) => {
          const installed = isInstalled(ext);
          return (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={ext.id}>
              <Card 
                variant="outlined" 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderColor: installed ? 'success.main' : 'divider',
                  borderWidth: installed ? 2 : 1,
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: 2,
                    borderColor: installed ? 'success.main' : 'primary.light',
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <ExtensionIcon 
                      color={installed ? "success" : "action"} 
                      fontSize="small"
                    />
                    <Typography variant="subtitle1" fontWeight={600} noWrap>
                      {ext.name}
                    </Typography>
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
                      mb: 1,
                    }}
                  >
                    {ext.description}
                  </Typography>
                  <Link 
                    href={ext.url} 
                    target="_blank" 
                    rel="noopener" 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    View on GitHub <OpenInNewIcon sx={{ fontSize: 12, ml: 0.5 }} />
                  </Link>
                </CardContent>
                <CardActions sx={{ pt: 0 }}>
                  <Button 
                    fullWidth 
                    size="small"
                    variant={installed ? "contained" : "outlined"} 
                    color={installed ? "success" : "primary"}
                    startIcon={installed ? <CheckIcon /> : <AddIcon />}
                    onClick={() => toggleExtension(ext)}
                  >
                    {installed ? 'Added' : 'Add'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {filteredExtensions.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No extensions found matching "{searchQuery}"
          </Typography>
        </Paper>
      )}

      {/* Installation Instructions */}
      {activeExtensions.length > 0 && (
        <Paper sx={{ bgcolor: '#1e1e1e', color: '#d4d4d4', overflow: 'hidden' }}>
          <Box 
            sx={{ 
              p: 2, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
            }}
            onClick={() => setShowCommands(!showCommands)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 600 }}>
                Installation Commands
              </Typography>
              <Chip 
                label={`${activeExtensions.length} extension${activeExtensions.length > 1 ? 's' : ''}`} 
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton 
                size="small" 
                onClick={(e) => { e.stopPropagation(); handleCopyCommands(); }}
                sx={{ color: copied ? 'success.main' : '#aaa' }}
              >
                <CopyIcon fontSize="small" />
              </IconButton>
              {showCommands ? <ExpandLessIcon sx={{ color: '#aaa' }} /> : <ExpandMoreIcon sx={{ color: '#aaa' }} />}
            </Box>
          </Box>
          
          <Collapse in={showCommands}>
            <Box sx={{ px: 2, pb: 2 }}>
              <Typography variant="body2" sx={{ mb: 2, color: '#aaa' }}>
                Run these commands in your terminal after setting up Gemini CLI:
              </Typography>
              <Box 
                component="pre" 
                sx={{ 
                  fontFamily: 'monospace', 
                  fontSize: '0.85rem',
                  overflowX: 'auto',
                  bgcolor: 'rgba(0,0,0,0.3)',
                  p: 2,
                  borderRadius: 1,
                  m: 0,
                }}
              >
                {activeExtensions.map(ext => (
                  <Box key={ext.id} sx={{ mb: 1 }}>
                    <Box component="span" sx={{ color: '#6a9955' }}># Install {ext.name}</Box>
                    {'\n'}
                    <Box component="span" sx={{ color: '#dcdcaa' }}>gemini</Box>
                    <Box component="span" sx={{ color: '#ce9178' }}> extensions install </Box>
                    <Box component="span" sx={{ color: '#9cdcfe' }}>{ext.url}</Box>
                    {'\n'}
                  </Box>
                ))}
              </Box>
            </Box>
          </Collapse>
        </Paper>
      )}

      {/* Tip for new users */}
      {activeExtensions.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Tip:</strong> Select extensions above to include installation commands in your downloaded bundle. 
            Extensions add powerful integrations like database access, cloud deployment, and project management tools.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}
