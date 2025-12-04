/**
 * ChatInterface - Real-time chat/REPL component
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Chip,
  Tooltip,
  Button,
  Divider,
} from '@mui/material';
import {
  Send as SendIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Person as UserIcon,
  SmartToy as AssistantIcon,
  Build as ToolIcon,
  Info as SystemIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useChat } from '../hooks/useChat';
import type { ChatMessage } from '../hooks/useChat';
import ToolConfirmationModal from './ToolConfirmationModal';

interface ChatInterfaceProps {
  onStartCLI?: () => void;
  onStopCLI?: () => void;
}

export default function ChatInterface({ onStartCLI, onStopCLI }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isStreaming,
    isCLIRunning,
    sendMessage,
    startCLI,
    stopCLI,
    clearMessages,
    approveToolRequest,
    denyToolRequest,
    pendingToolRequest,
  } = useChat();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending message
  const handleSend = () => {
    if (!input.trim() || isStreaming || !isCLIRunning) return;

    // Add to history
    setCommandHistory((prev) => [...prev, input]);
    setHistoryIndex(-1);

    sendMessage(input);
    setInput('');
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'ArrowUp') {
      if (commandHistory.length > 0) {
        const newIndex =
          historyIndex === -1
            ? commandHistory.length - 1
            : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex]);
        }
      }
    }
  };

  // Start CLI handler
  const handleStartCLI = () => {
    startCLI();
    onStartCLI?.();
  };

  // Stop CLI handler
  const handleStopCLI = () => {
    stopCLI();
    onStopCLI?.();
  };

  // Get icon for message role
  const getRoleIcon = (role: ChatMessage['role']) => {
    switch (role) {
      case 'user':
        return <UserIcon fontSize="small" />;
      case 'assistant':
        return <AssistantIcon fontSize="small" />;
      case 'tool':
        return <ToolIcon fontSize="small" />;
      case 'system':
        return <SystemIcon fontSize="small" />;
      default:
        return null;
    }
  };

  // Get color for message role
  const getRoleColor = (role: ChatMessage['role'], isError?: boolean) => {
    if (isError) return '#ff5252';
    switch (role) {
      case 'user':
        return '#90caf9';
      case 'assistant':
        return '#a5d6a7';
      case 'tool':
        return '#ffcc80';
      case 'system':
        return '#b0bec5';
      default:
        return '#ffffff';
    }
  };

  // Copy message content
  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Paper
        sx={{
          p: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        elevation={1}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">Gemini Chat</Typography>
          <Chip
            size="small"
            label={isCLIRunning ? 'Running' : 'Stopped'}
            color={isCLIRunning ? 'success' : 'default'}
          />
          {isStreaming && (
            <CircularProgress size={16} sx={{ ml: 1 }} />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {!isCLIRunning ? (
            <Button
              variant="contained"
              size="small"
              startIcon={<PlayIcon />}
              onClick={handleStartCLI}
            >
              Start CLI
            </Button>
          ) : (
            <Button
              variant="outlined"
              size="small"
              startIcon={<StopIcon />}
              onClick={handleStopCLI}
              color="error"
            >
              Stop CLI
            </Button>
          )}
          <Tooltip title="Clear Messages">
            <IconButton size="small" onClick={clearMessages}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Messages */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 2,
          bgcolor: '#1e1e1e',
        }}
      >
        {messages.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary',
            }}
          >
            <AssistantIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6">Welcome to Gemini Builder</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {isCLIRunning
                ? 'Type a message to start chatting'
                : 'Click "Start CLI" to begin'}
            </Typography>
          </Box>
        )}

        {messages.map((message) => (
          <Box
            key={message.id}
            sx={{
              mb: 2,
              p: 2,
              borderRadius: 1,
              bgcolor: message.role === 'user' ? 'rgba(144, 202, 249, 0.1)' : 'rgba(255, 255, 255, 0.05)',
              borderLeft: `3px solid ${getRoleColor(message.role, message.isError)}`,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ color: getRoleColor(message.role, message.isError) }}>
                  {getRoleIcon(message.role)}
                </Box>
                <Typography
                  variant="caption"
                  sx={{ color: getRoleColor(message.role, message.isError), fontWeight: 'bold' }}
                >
                  {message.role.charAt(0).toUpperCase() + message.role.slice(1)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {message.timestamp.toLocaleTimeString()}
                </Typography>
                {message.isStreaming && (
                  <CircularProgress size={12} sx={{ ml: 1 }} />
                )}
              </Box>
              <Tooltip title="Copy">
                <IconButton
                  size="small"
                  onClick={() => copyToClipboard(message.content)}
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ color: message.isError ? '#ff5252' : 'inherit' }}>
              {message.role === 'assistant' ? (
                <ReactMarkdown
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const inline = !match;
                      return !inline ? (
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match ? match[1] : 'text'}
                          PreTag="div"
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code
                          className={className}
                          {...props}
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                <Typography
                  component="pre"
                  sx={{
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    m: 0,
                  }}
                >
                  {message.content}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      {/* Input */}
      <Paper sx={{ p: 2 }} elevation={2}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            ref={inputRef}
            fullWidth
            variant="outlined"
            placeholder={
              isCLIRunning
                ? 'Type a message...'
                : 'Start the CLI to begin chatting'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isCLIRunning || isStreaming}
            multiline
            maxRows={4}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper',
              },
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming || !isCLIRunning}
          >
            {isStreaming ? <CircularProgress size={24} /> : <SendIcon />}
          </IconButton>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
          Press Enter to send, Shift+Enter for new line, ↑/↓ for history
        </Typography>
      </Paper>

      {/* Tool Confirmation Modal */}
      {pendingToolRequest && (
        <ToolConfirmationModal
          open={!!pendingToolRequest}
          toolName={pendingToolRequest.toolName}
          description={pendingToolRequest.description}
          parameters={pendingToolRequest.parameters}
          onApprove={() => approveToolRequest(pendingToolRequest.toolName)}
          onDeny={() => denyToolRequest(pendingToolRequest.toolName)}
        />
      )}
    </Box>
  );
}
