# GeminiBuilder

Enterprise-grade web interface for Gemini CLI with real-time chat, file management, and tool execution.

## Features

### Core Features
- **Real-time Chat Interface** - Stream messages to/from Gemini CLI with syntax highlighting and markdown rendering
- **Tool Confirmation Modal** - Approve or deny tool execution requests with parameter preview
- **File Explorer** - Browse and manage project files with real-time tree view
- **Code Editor** - Monaco-based editor with multi-tab support, syntax highlighting for 100+ languages
- **MCP Server Management** - Configure and manage Model Context Protocol servers

### Configuration Builder
- **Context Builder** - Design GEMINI.md with custom sections and live preview
- **Settings Generator** - Configure settings.json with theme, YOLO mode, checkpointing, and more
- **Custom Commands** - Create slash commands with TOML generation
- **Agent Skills** - Build and manage Anthropic-style skills with helper files
- **Extensions Manager** - Browse and install Gemini CLI extensions

### Quick Start Personas
Pre-configured personas for common development roles:
- Frontend Developer
- Backend Engineer
- Data Scientist

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend Framework** | React 19 + TypeScript |
| **UI Components** | Material UI v7 |
| **Code Editor** | Monaco Editor |
| **State Management** | Zustand |
| **Backend Framework** | Express.js 5 |
| **WebSocket** | ws (native Node.js) |
| **Process Management** | child_process |
| **File System** | fs.promises (async) |

## Project Structure

```
project/
├── server/                     # Backend server
│   ├── index.ts               # Express + WebSocket setup
│   ├── process-manager.ts     # Gemini CLI process lifecycle
│   ├── websocket-handler.ts   # Real-time message routing
│   ├── file-system-api.ts     # Disk operations with security
│   ├── settings-manager.ts    # settings.json management
│   ├── mcp-server-manager.ts  # MCP server configuration
│   ├── skills-manager.ts      # Agent skills management
│   └── types.ts               # Server type definitions
├── src/
│   ├── components/            # React components
│   │   ├── ChatInterface.tsx  # Real-time chat UI
│   │   ├── CodeEditor.tsx     # Monaco editor wrapper
│   │   ├── FileExplorer.tsx   # File tree component
│   │   ├── MCPManager.tsx     # MCP server UI
│   │   └── ToolConfirmationModal.tsx
│   ├── hooks/                 # React hooks
│   │   ├── useChat.ts         # Chat state management
│   │   ├── useFiles.ts        # File operations hook
│   │   └── useWebSocket.ts    # WebSocket connection
│   ├── lib/                   # Utility libraries
│   │   ├── ws-client.ts       # WebSocket client
│   │   └── file-utils.ts      # File utilities
│   ├── views/                 # Page components
│   ├── layout/                # Layout components
│   ├── store/                 # Zustand store
│   └── data/                  # Static data (personas, marketplace)
└── package.json
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Gemini CLI installed (optional, for full functionality)

### Installation

```bash
# Install dependencies
npm install

# Start development servers (frontend + backend)
npm run dev

# Or start individually
npm run dev:client  # Frontend on http://localhost:5173
npm run dev:server  # Backend on http://localhost:3001
```

### Production Build

```bash
# Build frontend
npm run build

# Build server (optional)
npm run build:server

# Start production server
npm start
```

## API Endpoints

### Settings
- `GET /api/settings` - Get current settings
- `PUT /api/settings` - Update settings
- `POST /api/settings/reset` - Reset to defaults
- `GET /api/settings/models` - List available models

### MCP Servers
- `GET /api/mcp/servers` - List configured servers
- `POST /api/mcp/servers` - Add new server
- `DELETE /api/mcp/servers/:name` - Remove server
- `POST /api/mcp/servers/:name/start` - Start server
- `POST /api/mcp/servers/:name/stop` - Stop server
- `POST /api/mcp/servers/:name/test` - Test connection
- `GET /api/mcp/tools` - List available tools

### Skills
- `GET /api/skills` - List all skills
- `GET /api/skills/:name` - Get skill details
- `POST /api/skills` - Create new skill
- `PUT /api/skills/:name` - Update skill
- `DELETE /api/skills/:name` - Delete skill

### Files
- `GET /api/files` - List directory contents
- `GET /api/files/read` - Read file content
- `POST /api/files/write` - Write file
- `DELETE /api/files` - Delete file
- `POST /api/files/mkdir` - Create directory
- `POST /api/files/search` - Search files

### Sessions
- `GET /api/sessions` - List active sessions
- `GET /api/sessions/:id` - Get session details

## WebSocket Protocol

Connect to `ws://localhost:3001` for real-time communication.

### Message Types

#### CLI Operations
- `cli:start` - Start Gemini CLI process
- `cli:input` - Send command to CLI
- `cli:output` - Receive CLI output
- `cli:stop` - Stop CLI process

#### Tool Operations
- `tool:request` - Tool execution request from CLI
- `tool:response` - User approval/denial

#### File Operations
- `file:read` / `file:write` / `file:delete`
- `directory:list`
- `file:change` - File system change event

## Environment Variables

```env
PORT=3001              # Server port
HOST=localhost         # Server host
CORS_ORIGIN=http://localhost:5173  # Allowed CORS origin
```

## Security Features

- Working directory sandboxing
- Symlink traversal prevention
- File size limits
- Command injection prevention
- CORS configuration

## License

MIT
