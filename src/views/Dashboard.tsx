import React from 'react';
import { Typography, Box, Card, CardActionArea, Chip, Paper, Button } from '@mui/material';
import { useAppStore } from '../store/appStore';
import { useNavigate } from 'react-router-dom';
import { PERSONAS } from '../data/personas';
import { 
    RocketLaunch as RocketIcon, 
    Person as PersonIcon,
    Chat as ChatIcon,
    Code as CodeIcon,
    Storage as MCPIcon,
} from '@mui/icons-material';
import type { Persona } from '../data/personas';

export default function Dashboard() {
    const { settings, contextSections, commands, skills, loadPersona } = useAppStore();
    const navigate = useNavigate();

    const handleLoadPersona = (persona: Persona) => {
        if (confirm(`Load "${persona.name}" persona? This will append to your current configuration.`)) {
            loadPersona(persona);
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                GeminiBuilder - Enterprise Gemini CLI Interface
            </Typography>
            <Typography variant="body1" paragraph color="text.secondary">
                Build, configure, and interact with Gemini CLI. Design your perfect AI agent with context, 
                settings, skills, and commands, or use the real-time chat interface to interact directly.
            </Typography>

            {/* Quick Actions */}
            <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <RocketIcon color="primary" /> Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
                <Card variant="outlined" sx={{ minWidth: 200 }}>
                    <CardActionArea onClick={() => navigate('/chat')} sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ChatIcon color="primary" />
                            <Typography variant="h6">Start Chat</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            Open the real-time chat interface
                        </Typography>
                        <Chip label="New" size="small" color="primary" sx={{ mt: 1 }} />
                    </CardActionArea>
                </Card>
                <Card variant="outlined" sx={{ minWidth: 200 }}>
                    <CardActionArea onClick={() => navigate('/editor')} sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CodeIcon color="primary" />
                            <Typography variant="h6">Code Editor</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            Browse and edit project files
                        </Typography>
                        <Chip label="New" size="small" color="primary" sx={{ mt: 1 }} />
                    </CardActionArea>
                </Card>
                <Card variant="outlined" sx={{ minWidth: 200 }}>
                    <CardActionArea onClick={() => navigate('/mcp')} sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MCPIcon color="primary" />
                            <Typography variant="h6">MCP Servers</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            Manage MCP integrations
                        </Typography>
                        <Chip label="New" size="small" color="primary" sx={{ mt: 1 }} />
                    </CardActionArea>
                </Card>
            </Box>

            {/* Quick Start Personas */}
            <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon color="action" /> Quick Start Personas
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
                {PERSONAS.map((persona) => (
                    <Card key={persona.id} variant="outlined" sx={{ flex: 1, minWidth: 250, maxWidth: 350 }}>
                        <CardActionArea onClick={() => handleLoadPersona(persona)} sx={{ height: '100%', p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <PersonIcon color="action" sx={{ mr: 1 }} />
                                <Typography variant="h6">{persona.name}</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                {persona.description}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                <Chip size="small" label={`${persona.skills.length} Skills`} />
                                <Chip size="small" label={`${persona.commands.length} Commands`} />
                            </Box>
                        </CardActionArea>
                    </Card>
                ))}
            </Box>

            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Current Configuration</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {/* Context Stats */}
                <Box sx={{ flex: 1, minWidth: 250 }}>
                    <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" gutterBottom>Context (GEMINI.md)</Typography>
                        <Typography variant="h3" color="primary">
                            {contextSections.filter(s => s.enabled).length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Active Sections</Typography>
                        <Box sx={{ flexGrow: 1 }} />
                        <Button variant="outlined" onClick={() => navigate('/context')} sx={{ mt: 2 }}>
                            Edit Context
                        </Button>
                    </Paper>
                </Box>

                {/* Settings Stats */}
                <Box sx={{ flex: 1, minWidth: 250 }}>
                    <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" gutterBottom>Settings</Typography>
                        <Typography variant="body1">
                            Theme: <strong>{settings.theme}</strong>
                        </Typography>
                        <Typography variant="body1">
                            YOLO Mode: <strong>{settings.autoAccept ? 'ON' : 'OFF'}</strong>
                        </Typography>
                        <Box sx={{ flexGrow: 1 }} />
                        <Button variant="outlined" onClick={() => navigate('/settings')} sx={{ mt: 2 }}>
                            Configure Settings
                        </Button>
                    </Paper>
                </Box>

                {/* Commands Stats */}
                <Box sx={{ flex: 1, minWidth: 250 }}>
                    <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" gutterBottom>Custom Commands</Typography>
                        <Typography variant="h3" color="primary">
                            {commands.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Defined Commands</Typography>
                        <Box sx={{ flexGrow: 1 }} />
                        <Button variant="outlined" onClick={() => navigate('/commands')} sx={{ mt: 2 }}>
                            Manage Commands
                        </Button>
                    </Paper>
                </Box>

                {/* Skills Stats */}
                <Box sx={{ flex: 1, minWidth: 250 }}>
                    <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" gutterBottom>Agent Skills</Typography>
                        <Typography variant="h3" color="primary">
                            {skills.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Configured Skills</Typography>
                        <Box sx={{ flexGrow: 1 }} />
                        <Button variant="outlined" onClick={() => navigate('/skills')} sx={{ mt: 2 }}>
                            Manage Skills
                        </Button>
                    </Paper>
                </Box>
            </Box>
        </Box>
    );
}
