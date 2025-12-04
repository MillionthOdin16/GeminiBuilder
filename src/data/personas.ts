import type { Settings, ContextSection, AgentSkill, CustomCommand } from '../types';
import { CURATED_SKILLS } from './marketplace';

export interface Persona {
    id: string;
    name: string;
    description: string;
    settings: Partial<Settings>;
    contextSections: ContextSection[];
    skills: AgentSkill[];
    commands: CustomCommand[];
}

export const PERSONAS: Persona[] = [
    {
        id: 'frontend-dev',
        name: 'Frontend Developer',
        description: 'Optimized for React, TypeScript, and UI development. Includes strict linting context and component generators.',
        settings: {
            theme: 'dark',
            excludeTools: ['run_shell_command'], // Safer default
        },
        contextSections: [
            {
                id: 'fe-role',
                title: 'Role',
                content: 'You are an expert Frontend Engineer specializing in React, TypeScript, and Material UI. You prioritize accessibility and performance.',
                enabled: true
            },
            {
                id: 'fe-stack',
                title: 'Tech Stack',
                content: '- React 18+\n- TypeScript 5+\n- Material UI (MUI) v5\n- Vite',
                enabled: true
            }
        ],
        skills: [], // Could add a specific React skill if we had one in curated
        commands: [
            {
                id: 'cmd-fc',
                name: 'component:new',
                description: 'Generate a new React component with styles and types',
                prompt: 'Create a new React functional component named {{args}}. Include interface for props and use named export.'
            }
        ]
    },
    {
        id: 'backend-eng',
        name: 'Backend Engineer',
        description: 'Setup for Node.js/Python backend work. includes database helpers and API design context.',
        settings: {
            theme: 'system',
            autoAccept: false
        },
        contextSections: [
            {
                id: 'be-role',
                title: 'Role',
                content: 'You are a Senior Backend Engineer. You design robust, scalable REST and GraphQL APIs.',
                enabled: true
            },
            {
                id: 'be-security',
                title: 'Security Guidelines',
                content: 'Always validate inputs. Use parameterized queries for SQL. Never commit secrets.',
                enabled: true
            }
        ],
        skills: [
            // Add Data Analysis skill from curated
            CURATED_SKILLS.find(s => s.id === 'data-analysis')!
        ],
        commands: [
            {
                id: 'cmd-api',
                name: 'api:route',
                description: 'Generate an Express route handler',
                prompt: 'Write an Express.js route handler for {{args}}. Include error handling and input validation.'
            }
        ]
    },
    {
        id: 'data-scientist',
        name: 'Data Scientist',
        description: 'configured for Python, Pandas, and Jupyter. Includes data analysis skills and "YOLO" mode for quick experimentation.',
        settings: {
            theme: 'light',
            autoAccept: true, // YOLO for rapid notebook style work
        },
        contextSections: [
            {
                id: 'ds-role',
                title: 'Role',
                content: 'You are a Data Scientist. You prefer concise Python code using Pandas, NumPy, and Matplotlib.',
                enabled: true
            }
        ],
        skills: [
            CURATED_SKILLS.find(s => s.id === 'data-analysis')!,
            CURATED_SKILLS.find(s => s.id === 'web-search')!
        ],
        commands: []
    }
];
