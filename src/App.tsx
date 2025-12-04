import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import Dashboard from './views/Dashboard';
import ContextBuilder from './views/ContextBuilder';
import SettingsBuilder from './views/SettingsBuilder';
import CommandBuilder from './views/CommandBuilder';
import ExtensionsManager from './views/ExtensionsManager';
import SkillsBuilder from './views/SkillsBuilder';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="context" element={<ContextBuilder />} />
          <Route path="settings" element={<SettingsBuilder />} />
          <Route path="skills" element={<SkillsBuilder />} />
          <Route path="commands" element={<CommandBuilder />} />
          <Route path="extensions" element={<ExtensionsManager />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
