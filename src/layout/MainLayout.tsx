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
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import DownloadManager from './DownloadManager';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Chat / REPL', icon: <ChatIcon />, path: '/chat', isNew: true },
  { text: 'Code Editor', icon: <FolderIcon />, path: '/editor', isNew: true },
  { text: 'Context (GEMINI.md)', icon: <DescriptionIcon />, path: '/context' },
  { text: 'Settings (settings.json)', icon: <SettingsIcon />, path: '/settings' },
  { text: 'Agent Skills', icon: <SkillIcon />, path: '/skills' },
  { text: 'Custom Commands', icon: <CodeIcon />, path: '/commands' },
  { text: 'Extensions', icon: <ExtensionIcon />, path: '/extensions' },
  { text: 'MCP Servers', icon: <MCPIcon />, path: '/mcp', isNew: true },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

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
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
                {item.isNew && (
                  <Chip label="New" size="small" color="primary" sx={{ ml: 1 }} />
                )}
              </ListItemButton>
            </ListItem>
          ))}
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
