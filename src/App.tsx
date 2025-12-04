import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import Dashboard from './views/Dashboard';
import ContextBuilder from './views/ContextBuilder';
import SettingsBuilder from './views/SettingsBuilder';
import CommandBuilder from './views/CommandBuilder';
import ExtensionsManager from './views/ExtensionsManager';
import SkillsBuilder from './views/SkillsBuilder';
import ChatView from './views/ChatView';
import MCPServersView from './views/MCPServersView';
import EditorView from './views/EditorView';
import GitView from './views/GitView';
import TerminalView from './views/TerminalView';
import ProjectsView from './views/ProjectsView';
import TemplatesView from './views/TemplatesView';
import SnippetsView from './views/SnippetsView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="chat" element={<ChatView />} />
          <Route path="editor" element={<EditorView />} />
          <Route path="context" element={<ContextBuilder />} />
          <Route path="settings" element={<SettingsBuilder />} />
          <Route path="skills" element={<SkillsBuilder />} />
          <Route path="commands" element={<CommandBuilder />} />
          <Route path="extensions" element={<ExtensionsManager />} />
          <Route path="mcp" element={<MCPServersView />} />
          <Route path="git" element={<GitView />} />
          <Route path="terminal" element={<TerminalView />} />
          <Route path="projects" element={<ProjectsView />} />
          <Route path="templates" element={<TemplatesView />} />
          <Route path="snippets" element={<SnippetsView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
