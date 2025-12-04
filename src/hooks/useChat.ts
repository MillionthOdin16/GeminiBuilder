/**
 * useChat - React hook for chat/REPL functionality
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { wsClient } from '../lib/ws-client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolName?: string;
  toolResult?: unknown;
  isError?: boolean;
}

interface UseChatOptions {
  maxMessages?: number;
  autoScroll?: boolean;
  onToolRequest?: (tool: ToolRequest) => void;
}

interface ToolRequest {
  toolName: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  isCLIRunning: boolean;
  sendMessage: (content: string) => void;
  startCLI: (options?: { model?: string }) => void;
  stopCLI: () => void;
  clearMessages: () => void;
  approveToolRequest: (toolName: string, result?: unknown) => void;
  denyToolRequest: (toolName: string) => void;
  pendingToolRequest: ToolRequest | null;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { maxMessages = 1000, onToolRequest } = options;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCLIRunning, setIsCLIRunning] = useState(false);
  const [pendingToolRequest, setPendingToolRequest] = useState<ToolRequest | null>(null);
  
  const streamingMessageRef = useRef<string>('');
  const streamingIdRef = useRef<string | null>(null);

  // Add a new message
  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    
    setMessages((prev) => {
      const updated = [...prev, newMessage];
      return updated.slice(-maxMessages);
    });
    
    return newMessage.id;
  }, [maxMessages]);

  // Update a message
  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
    );
  }, []);

  // Append content to a streaming message
  const appendToMessage = useCallback((id: string, content: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, content: msg.content + content } : msg
      )
    );
  }, []);

  // Send a message to CLI
  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return;

    // Add user message
    addMessage({ role: 'user', content });

    // Start streaming response
    setIsStreaming(true);
    streamingMessageRef.current = '';
    const messageId = addMessage({ role: 'assistant', content: '', isStreaming: true });
    streamingIdRef.current = messageId;

    // Send to CLI
    wsClient.send({
      type: 'cli:input',
      payload: { command: content },
    });
  }, [addMessage]);

  // Start CLI
  const startCLI = useCallback((cliOptions?: { model?: string }) => {
    wsClient.send({
      type: 'cli:start',
      payload: cliOptions,
    });
  }, []);

  // Stop CLI
  const stopCLI = useCallback(() => {
    wsClient.send({
      type: 'cli:stop',
    });
  }, []);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    streamingMessageRef.current = '';
    streamingIdRef.current = null;
    setIsStreaming(false);
  }, []);

  // Approve tool request
  const approveToolRequest = useCallback((toolName: string, result?: unknown) => {
    wsClient.send({
      type: 'tool:response',
      payload: { toolName, approved: true, result },
    });
    setPendingToolRequest(null);
  }, []);

  // Deny tool request
  const denyToolRequest = useCallback((toolName: string) => {
    wsClient.send({
      type: 'tool:response',
      payload: { toolName, approved: false },
    });
    setPendingToolRequest(null);
  }, []);

  // Listen for WebSocket messages
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // CLI output
    unsubscribers.push(
      wsClient.on('cli:output', (message) => {
        const payload = message.payload as {
          content: string;
          isError?: boolean;
          isComplete?: boolean;
        };

        if (streamingIdRef.current) {
          streamingMessageRef.current += payload.content;
          appendToMessage(streamingIdRef.current, payload.content);

          if (payload.isError) {
            updateMessage(streamingIdRef.current, { isError: true });
          }

          if (payload.isComplete) {
            updateMessage(streamingIdRef.current, { isStreaming: false });
            streamingIdRef.current = null;
            streamingMessageRef.current = '';
            setIsStreaming(false);
          }
        } else {
          // New message from CLI (not in response to user input)
          addMessage({
            role: 'assistant',
            content: payload.content,
            isError: payload.isError,
          });
        }
      })
    );

    // CLI started
    unsubscribers.push(
      wsClient.on('cli:started', () => {
        setIsCLIRunning(true);
        addMessage({
          role: 'system',
          content: '✓ Gemini CLI started successfully',
        });
      })
    );

    // CLI stopped
    unsubscribers.push(
      wsClient.on('cli:stopped', () => {
        setIsCLIRunning(false);
        setIsStreaming(false);
        streamingIdRef.current = null;
        addMessage({
          role: 'system',
          content: '✓ Gemini CLI stopped',
        });
      })
    );

    // Tool request
    unsubscribers.push(
      wsClient.on('tool:request', (message) => {
        const payload = message.payload as ToolRequest;
        setPendingToolRequest(payload);
        onToolRequest?.(payload);
        
        addMessage({
          role: 'tool',
          content: `Tool request: ${payload.toolName}`,
          toolName: payload.toolName,
        });
      })
    );

    // Tool result
    unsubscribers.push(
      wsClient.on('tool:result', (message) => {
        const payload = message.payload as {
          toolName: string;
          success: boolean;
          result?: unknown;
          error?: string;
        };

        addMessage({
          role: 'tool',
          content: payload.success
            ? `Tool ${payload.toolName} completed successfully`
            : `Tool ${payload.toolName} failed: ${payload.error}`,
          toolName: payload.toolName,
          toolResult: payload.result,
          isError: !payload.success,
        });
      })
    );

    // Error messages
    unsubscribers.push(
      wsClient.on('error', (message) => {
        const payload = message.payload as { code: string; message: string };
        addMessage({
          role: 'system',
          content: `Error: ${payload.message}`,
          isError: true,
        });
        setIsStreaming(false);
        streamingIdRef.current = null;
      })
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [addMessage, appendToMessage, updateMessage, onToolRequest]);

  return {
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
  };
}
