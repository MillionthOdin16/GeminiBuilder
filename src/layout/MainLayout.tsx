import React from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CssBaseline,
  Chip,
  ListSubheader,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  Code as CodeIcon,
  Extension as ExtensionIcon,
  Psychology as SkillIcon,
  Chat as ChatIcon,
  Folder as FolderIcon,
  Storage as MCPIcon,
  Terminal as TerminalIcon,
  AccountTree as GitIcon,
  FolderSpecial as ProjectIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import DownloadManager from './DownloadManager';

const drawerWidth = 260;

const coreMenuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Chat / REPL', icon: <ChatIcon />, path: '/chat' },
  { text: 'Code Editor', icon: <FolderIcon />, path: '/editor' },
  { text: 'Terminal', icon: <TerminalIcon />, path: '/terminal', isNew: true },
  { text: 'Git', icon: <GitIcon />, path: '/git', isNew: true },
  { text: 'Projects', icon: <ProjectIcon />, path: '/projects', isNew: true },
];

const configMenuItems = [
  { text: 'Context (GEMINI.md)', icon: <DescriptionIcon />, path: '/context' },
  { text: 'Settings (settings.json)', icon: <SettingsIcon />, path: '/settings' },
  { text: 'Agent Skills', icon: <SkillIcon />, path: '/skills' },
  { text: 'Custom Commands', icon: <CodeIcon />, path: '/commands' },
];

const integrationsMenuItems = [
  { text: 'Extensions', icon: <ExtensionIcon />, path: '/extensions' },
  { text: 'MCP Servers', icon: <MCPIcon />, path: '/mcp' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const renderMenuItems = (items: typeof coreMenuItems) => (
    items.map((item) => (
      <ListItem key={item.text} disablePadding>
        <ListItemButton
          selected={location.pathname === item.path}
          onClick={() => navigate(item.path)}
          sx={{ py: 0.5 }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
          <ListItemText 
            primary={item.text}
            primaryTypographyProps={{ fontSize: '0.875rem' }}
          />
          {item.isNew && (
            <Chip label="New" size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />
          )}
        </ListItemButton>
      </ListItem>
    ))
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px` }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            GeminiBuilder - Enterprise Gemini CLI Interface
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Toolbar>
            <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                GeminiBuilder
            </Typography>
        </Toolbar>
        <Divider />
        <List dense>
          <ListSubheader sx={{ bgcolor: 'transparent' }}>Core</ListSubheader>
          {renderMenuItems(coreMenuItems)}
        </List>
        <Divider />
        <List dense>
          <ListSubheader sx={{ bgcolor: 'transparent' }}>Configuration</ListSubheader>
          {renderMenuItems(configMenuItems)}
        </List>
        <Divider />
        <List dense>
          <ListSubheader sx={{ bgcolor: 'transparent' }}>Integrations</ListSubheader>
          {renderMenuItems(integrationsMenuItems)}
        </List>
      </Drawer>
      <Box
        component="main"
        sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3, pb: 10 }}
      >
        <Toolbar />
        <Outlet />
      </Box>
      <DownloadManager />
    </Box>
  );
}
