import React, { useState } from 'react';
import { 
    Typography, 
    Box, 
    Card, 
    CardActionArea, 
    Chip, 
    Paper, 
    Button,
    Grid,
    Avatar,
    TextField,
    InputAdornment,
    Tabs,
    Tab,
    useTheme,
    useMediaQuery,
    Alert,
    Collapse,
    IconButton,
} from '@mui/material';
import { useAppStore } from '../store/appStore';
import { useNavigate } from 'react-router-dom';
import { PERSONAS } from '../data/personas';
import type { Persona } from '../types';
import { 
    RocketLaunch as RocketIcon, 
    Person as PersonIcon,
    Search as SearchIcon,
    Description as DescriptionIcon,
    Settings as SettingsIcon,
    Code as CodeIcon,
    Psychology as SkillIcon,
    Extension as ExtensionIcon,
    ArrowForward as ArrowIcon,
    Close as CloseIcon,
    AutoAwesome as AutoAwesomeIcon,
    CheckCircle as CheckIcon,
} from '@mui/icons-material';

// Persona category icons
const personaIcons: Record<string, React.ReactNode> = {
    'frontend-dev': '⚛️',
    'backend-eng': '🔧',
    'fullstack-dev': '🌐',
    'data-scientist': '📊',
    'devops-eng': '🚀',
    'mobile-dev': '📱',
    'security-eng': '🔒',
    'tech-writer': '📝',
    'ai-engineer': '🤖',
    'architect': '🏗️',
    'startup-founder': '💡',
    'code-reviewer': '🔍',
};

export default function Dashboard() {
    const { settings, contextSections, commands, skills, activeExtensions, loadPersona } = useAppStore();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showWelcome, setShowWelcome] = useState(true);

    const handleLoadPersona = (persona: Persona) => {
        if (confirm(`Load "${persona.name}" persona? This will add to your current configuration.`)) {
            loadPersona(persona);
        }
    };

    const filteredPersonas = PERSONAS.filter(persona => {
        const matchesSearch = persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            persona.description.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (selectedCategory === 'all') return matchesSearch;
        
        // Simple category matching based on persona characteristics
        const categories: Record<string, string[]> = {
            'frontend': ['frontend-dev', 'fullstack-dev', 'mobile-dev'],
            'backend': ['backend-eng', 'fullstack-dev', 'devops-eng'],
            'data': ['data-scientist', 'ai-engineer'],
            'other': ['security-eng', 'tech-writer', 'architect', 'startup-founder', 'code-reviewer'],
        };
        
        return matchesSearch && (categories[selectedCategory]?.includes(persona.id) ?? true);
    });

    const statCards = [
        { 
            title: 'Context', 
            subtitle: 'GEMINI.md', 
            count: contextSections.filter(s => s.enabled).length,
            total: contextSections.length,
            icon: <DescriptionIcon />,
            path: '/context',
            color: '#1a73e8'
        },
        { 
            title: 'Settings', 
            subtitle: 'settings.json', 
            count: null,
            detail: settings.theme || 'Default',
            icon: <SettingsIcon />,
            path: '/settings',
            color: '#34a853'
        },
        { 
            title: 'Skills', 
            subtitle: 'Agent abilities', 
            count: skills.length,
            icon: <SkillIcon />,
            path: '/skills',
            color: '#ea4335'
        },
        { 
            title: 'Commands', 
            subtitle: 'Custom commands', 
            count: commands.length,
            icon: <CodeIcon />,
            path: '/commands',
            color: '#fbbc04'
        },
        { 
            title: 'Extensions', 
            subtitle: 'MCP servers', 
            count: activeExtensions.length,
            icon: <ExtensionIcon />,
            path: '/extensions',
            color: '#9c27b0'
        },
    ];

    return (
        <Box>
            {/* Welcome Banner */}
            <Collapse in={showWelcome}>
                <Alert 
                    severity="info" 
                    icon={<AutoAwesomeIcon />}
                    action={
                        <IconButton size="small" onClick={() => setShowWelcome(false)}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    }
                    sx={{ 
                        mb: 3, 
                        background: 'linear-gradient(135deg, rgba(26, 115, 232, 0.1) 0%, rgba(108, 71, 255, 0.1) 100%)',
                        border: '1px solid rgba(26, 115, 232, 0.3)',
                    }}
                >
                    <Typography variant="body2">
                        <strong>Welcome to Gemini CLI Configurator!</strong> Design your perfect AI coding agent by configuring context, settings, skills, and commands. 
                        Start with a persona below or build your own from scratch.
                    </Typography>
                </Alert>
            </Collapse>

            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={700} gutterBottom>
                    Design Your AI Agent
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Configure context, settings, skills, and commands, then download a ready-to-use bundle for Gemini CLI.
                </Typography>
            </Box>

            {/* Stats Cards */}
            <Box sx={{ mb: 4 }}>
                <Grid container spacing={2}>
                    {statCards.map((card) => (
                        <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={card.title}>
                            <Paper
                                sx={{
                                    p: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 4,
                                        borderColor: card.color,
                                    },
                                }}
                                onClick={() => navigate(card.path)}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Avatar 
                                        sx={{ 
                                            width: 32, 
                                            height: 32, 
                                            bgcolor: `${card.color}15`,
                                            color: card.color,
                                        }}
                                    >
                                        {card.icon}
                                    </Avatar>
                                </Box>
                                <Typography variant="h4" fontWeight={700} color={card.color}>
                                    {card.count !== null ? card.count : card.detail}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" noWrap>
                                    {card.title}
                                </Typography>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Quick Start Personas Section */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between', 
                    alignItems: { xs: 'stretch', sm: 'center' }, 
                    gap: 2,
                    mb: 3 
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <RocketIcon color="primary" />
                        <Typography variant="h6" fontWeight={600}>
                            Quick Start Personas
                        </Typography>
                        <Chip label={PERSONAS.length} size="small" color="primary" variant="outlined" />
                    </Box>
                    
                    <TextField
                        size="small"
                        placeholder="Search personas..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ 
                            width: { xs: '100%', sm: 250 },
                        }}
                    />
                </Box>

                {/* Category Tabs */}
                <Tabs 
                    value={selectedCategory} 
                    onChange={(_, v) => setSelectedCategory(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="All" value="all" />
                    <Tab label="Frontend" value="frontend" />
                    <Tab label="Backend" value="backend" />
                    <Tab label="Data & AI" value="data" />
                    <Tab label="Other" value="other" />
                </Tabs>

                {/* Persona Cards Grid */}
                <Grid container spacing={2}>
                    {filteredPersonas.map((persona) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={persona.id}>
                            <Card 
                                variant="outlined" 
                                sx={{ 
                                    height: '100%',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 4,
                                        borderColor: 'primary.main',
                                    },
                                }}
                            >
                                <CardActionArea 
                                    onClick={() => handleLoadPersona(persona)} 
                                    sx={{ 
                                        height: '100%', 
                                        p: 2,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, width: '100%' }}>
                                        <Typography variant="h5" component="span">
                                            {personaIcons[persona.id] || '👤'}
                                        </Typography>
                                        <Typography variant="subtitle1" fontWeight={600} sx={{ flexGrow: 1 }}>
                                            {persona.name}
                                        </Typography>
                                    </Box>
                                    
                                    <Typography 
                                        variant="body2" 
                                        color="text.secondary" 
                                        sx={{ 
                                            mb: 2,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            minHeight: 40,
                                        }}
                                    >
                                        {persona.description}
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 'auto' }}>
                                        {persona.skills.length > 0 && (
                                            <Chip 
                                                size="small" 
                                                label={`${persona.skills.length} Skills`}
                                                icon={<SkillIcon sx={{ fontSize: 14 }} />}
                                                sx={{ fontSize: '0.7rem' }}
                                            />
                                        )}
                                        {persona.commands.length > 0 && (
                                            <Chip 
                                                size="small" 
                                                label={`${persona.commands.length} Commands`}
                                                icon={<CodeIcon sx={{ fontSize: 14 }} />}
                                                sx={{ fontSize: '0.7rem' }}
                                            />
                                        )}
                                        {persona.contextSections.length > 0 && (
                                            <Chip 
                                                size="small" 
                                                label={`${persona.contextSections.length} Context`}
                                                variant="outlined"
                                                sx={{ fontSize: '0.7rem' }}
                                            />
                                        )}
                                    </Box>
                                </CardActionArea>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                {filteredPersonas.length === 0 && (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                            No personas found matching "{searchQuery}"
                        </Typography>
                    </Paper>
                )}
            </Box>

            {/* Quick Actions */}
            <Paper sx={{ p: 3, background: 'linear-gradient(135deg, rgba(26, 115, 232, 0.05) 0%, rgba(108, 71, 255, 0.05) 100%)' }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                    Build From Scratch
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Create your own custom configuration step by step
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button 
                        variant="outlined" 
                        startIcon={<DescriptionIcon />}
                        onClick={() => navigate('/context')}
                    >
                        Add Context
                    </Button>
                    <Button 
                        variant="outlined" 
                        startIcon={<SkillIcon />}
                        onClick={() => navigate('/skills')}
                    >
                        Add Skills
                    </Button>
                    <Button 
                        variant="outlined" 
                        startIcon={<CodeIcon />}
                        onClick={() => navigate('/commands')}
                    >
                        Add Commands
                    </Button>
                    <Button 
                        variant="outlined" 
                        startIcon={<ExtensionIcon />}
                        onClick={() => navigate('/extensions')}
                    >
                        Browse Extensions
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}
