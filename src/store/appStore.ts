import { create } from 'zustand';
import type { AppState, Settings, ContextSection } from '../types';

const defaultSettings: Settings = {
  theme: 'system',
  autoAccept: false,
  checkpointing: {
    enabled: true,
  },
  telemetry: {
    enabled: false,
  },
  includeDirectories: [],
  excludeTools: [],
  mcpServers: {},
};

const defaultContextSections: ContextSection[] = [
  {
    id: 'project-role',
    title: 'Project Role & Persona',
    content: 'You are an expert Senior Software Engineer. You write clean, efficient, and well-documented code.',
    enabled: true,
  },
  {
    id: 'tech-stack',
    title: 'Technology Stack',
    content: '- Frontend: React, TypeScript, Material UI\n- Backend: Node.js, Express\n- Database: PostgreSQL',
    enabled: true,
  },
  {
    id: 'coding-standards',
    title: 'Coding Standards',
    content: '- Use functional components and hooks.\n- Prefer const over let.\n- Use async/await for asynchronous operations.',
    enabled: true,
  },
];

export const useAppStore = create<AppState>((set) => ({
  settings: defaultSettings,
  commands: [],
  contextSections: defaultContextSections,
  activeExtensions: [],
  skills: [
    {
      id: 'example-skill',
      name: 'hello-world',
      description: 'A simple example skill that prints a greeting.',
      instructions: 'When the user asks for a greeting, run the hello.py script.',
      files: [
        {
          id: 'file-1',
          name: 'hello.py',
          content: 'print("Hello from the hello-world skill!")'
        }
      ]
    }
  ],

  updateSettings: (newSettings) =>
    set((state) => ({ settings: { ...state.settings, ...newSettings } })),

  addCommand: (command) =>
    set((state) => ({ commands: [...state.commands, command] })),

  updateCommand: (id, updatedCommand) =>
    set((state) => ({
      commands: state.commands.map((cmd) =>
        cmd.id === id ? { ...cmd, ...updatedCommand } : cmd
      ),
    })),

  removeCommand: (id) =>
    set((state) => ({
      commands: state.commands.filter((cmd) => cmd.id !== id),
    })),

  addContextSection: (section) =>
    set((state) => ({ contextSections: [...state.contextSections, section] })),

  // Updated to handle both content and title updates
  updateContextSection: (id, contentOrPartial) =>
    set((state) => ({
      contextSections: state.contextSections.map((sec) =>
        sec.id === id 
          ? (typeof contentOrPartial === 'string' ? { ...sec, content: contentOrPartial } : { ...sec, ...contentOrPartial })
          : sec
      ),
    })),

  toggleContextSection: (id) =>
    set((state) => ({
      contextSections: state.contextSections.map((sec) =>
        sec.id === id ? { ...sec, enabled: !sec.enabled } : sec
      ),
    })),

  removeContextSection: (id) =>
    set((state) => ({
      contextSections: state.contextSections.filter((sec) => sec.id !== id),
    })),

  reorderContextSections: (newOrder) =>
    set(() => ({ contextSections: newOrder })),

  toggleExtension: (extension) =>
    set((state) => {
      const exists = state.activeExtensions.find((e) => e.id === extension.id);
      if (exists) {
        return {
          activeExtensions: state.activeExtensions.filter(
            (e) => e.id !== extension.id
          ),
        };
      } else {
        return { activeExtensions: [...state.activeExtensions, extension] };
      }
    }),

  addSkill: (skill) =>
    set((state) => ({ skills: [...state.skills, skill] })),

  updateSkill: (id, updatedSkill) =>
    set((state) => ({
      skills: state.skills.map((s) =>
        s.id === id ? { ...s, ...updatedSkill } : s
      ),
    })),

  removeSkill: (id) =>
    set((state) => ({
      skills: state.skills.filter((s) => s.id !== id),
    })),

  // Bulk actions for Personas
  loadPersona: (persona) => 
    set((state) => ({
        settings: { ...state.settings, ...persona.settings },
        contextSections: [...state.contextSections, ...persona.contextSections],
        skills: [...state.skills, ...persona.skills],
        commands: [...state.commands, ...persona.commands]
    })),
}));
