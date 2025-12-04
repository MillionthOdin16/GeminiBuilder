/**
 * useFiles - React hook for file system operations
 */

import { useState, useCallback, useEffect } from 'react';
import { wsClient } from '../lib/ws-client';

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  isHidden?: boolean;
}

interface UseFilesOptions {
  workingDirectory?: string;
  showHidden?: boolean;
  autoLoad?: boolean;
}

interface UseFilesReturn {
  entries: FileEntry[];
  currentPath: string;
  isLoading: boolean;
  error: string | null;
  loadDirectory: (path?: string) => void;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  createDirectory: (path: string) => Promise<void>;
  navigateTo: (path: string) => void;
  navigateUp: () => void;
  refresh: () => void;
  openFile: FileEntry | null;
  openFileContent: string | null;
  setOpenFile: (file: FileEntry | null) => void;
}

export function useFiles(options: UseFilesOptions = {}): UseFilesReturn {
  const { workingDirectory = '.', showHidden = false, autoLoad = true } = options;
  
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState(workingDirectory);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFile, setOpenFile] = useState<FileEntry | null>(null);
  const [openFileContent, setOpenFileContent] = useState<string | null>(null);
  const [pendingFileRead, setPendingFileRead] = useState<{
    resolve: (content: string) => void;
    reject: (error: Error) => void;
  } | null>(null);
  const [pendingOperation, setPendingOperation] = useState<{
    resolve: () => void;
    reject: (error: Error) => void;
  } | null>(null);

  // Load directory contents
  const loadDirectory = useCallback((path?: string) => {
    const targetPath = path ?? currentPath;
    setIsLoading(true);
    setError(null);
    
    wsClient.send({
      type: 'directory:list',
      payload: { path: targetPath },
    });
  }, [currentPath]);

  // Navigate to a path
  const navigateTo = useCallback((path: string) => {
    setCurrentPath(path);
    loadDirectory(path);
  }, [loadDirectory]);

  // Navigate up one directory
  const navigateUp = useCallback(() => {
    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length > 0) {
      parts.pop();
      const parentPath = parts.length > 0 ? parts.join('/') : '.';
      navigateTo(parentPath);
    }
  }, [currentPath, navigateTo]);

  // Refresh current directory
  const refresh = useCallback(() => {
    loadDirectory(currentPath);
  }, [currentPath, loadDirectory]);

  // Read a file
  const readFile = useCallback((path: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      setPendingFileRead({ resolve, reject });
      wsClient.send({
        type: 'file:read',
        payload: { path },
      });
    });
  }, []);

  // Write a file
  const writeFile = useCallback((path: string, content: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setPendingOperation({ resolve, reject });
      wsClient.send({
        type: 'file:write',
        payload: { path, content },
      });
    });
  }, []);

  // Delete a file
  const deleteFile = useCallback((path: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setPendingOperation({ resolve, reject });
      wsClient.send({
        type: 'file:delete',
        payload: { path },
      });
    });
  }, []);

  // Create a directory
  const createDirectory = useCallback((path: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setPendingOperation({ resolve, reject });
      wsClient.send({
        type: 'file:mkdir',
        payload: { path },
      });
    });
  }, []);

  // Listen for WebSocket messages
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Directory list response
    unsubscribers.push(
      wsClient.on('directory:list:response', (message) => {
        const payload = message.payload as { path: string; entries: FileEntry[] };
        setEntries(
          showHidden
            ? payload.entries
            : payload.entries.filter((e) => !e.isHidden)
        );
        setCurrentPath(payload.path);
        setIsLoading(false);
      })
    );

    // File read response
    unsubscribers.push(
      wsClient.on('file:read:response', (message) => {
        const payload = message.payload as { path: string; content: string };
        if (pendingFileRead) {
          pendingFileRead.resolve(payload.content);
          setPendingFileRead(null);
        }
        // Also update open file content if it matches
        if (openFile?.path === payload.path) {
          setOpenFileContent(payload.content);
        }
      })
    );

    // File write response
    unsubscribers.push(
      wsClient.on('file:write:response', (message) => {
        const payload = message.payload as { success: boolean };
        if (pendingOperation) {
          if (payload.success) {
            pendingOperation.resolve();
            refresh(); // Refresh directory after write
          } else {
            pendingOperation.reject(new Error('Write failed'));
          }
          setPendingOperation(null);
        }
      })
    );

    // File delete response
    unsubscribers.push(
      wsClient.on('file:delete:response', (message) => {
        const payload = message.payload as { success: boolean };
        if (pendingOperation) {
          if (payload.success) {
            pendingOperation.resolve();
            refresh();
          } else {
            pendingOperation.reject(new Error('Delete failed'));
          }
          setPendingOperation(null);
        }
      })
    );

    // Directory create response
    unsubscribers.push(
      wsClient.on('file:mkdir:response', (message) => {
        const payload = message.payload as { success: boolean };
        if (pendingOperation) {
          if (payload.success) {
            pendingOperation.resolve();
            refresh();
          } else {
            pendingOperation.reject(new Error('Create directory failed'));
          }
          setPendingOperation(null);
        }
      })
    );

    // File change events (for file watching)
    unsubscribers.push(
      wsClient.on('file:change', () => {
        refresh();
      })
    );

    // Error handling
    unsubscribers.push(
      wsClient.on('error', (message) => {
        const payload = message.payload as { code: string; message: string };
        
        if (
          payload.code.startsWith('FILE_') ||
          payload.code.startsWith('DIRECTORY_')
        ) {
          setError(payload.message);
          setIsLoading(false);
          
          if (pendingFileRead) {
            pendingFileRead.reject(new Error(payload.message));
            setPendingFileRead(null);
          }
          if (pendingOperation) {
            pendingOperation.reject(new Error(payload.message));
            setPendingOperation(null);
          }
        }
      })
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [showHidden, openFile, pendingFileRead, pendingOperation, refresh]);

  // Auto-load on mount
   
  useEffect(() => {
    if (autoLoad) {
      loadDirectory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad]);

  // Load file content when openFile changes
  useEffect(() => {
    if (openFile && openFile.type === 'file') {
      readFile(openFile.path).then((content) => {
         
        setOpenFileContent(content);
      }).catch((err) => {
         
        setError(err.message);
      });
    } else {
       
      setOpenFileContent(null);
    }
  }, [openFile, readFile]);

  return {
    entries,
    currentPath,
    isLoading,
    error,
    loadDirectory,
    readFile,
    writeFile,
    deleteFile,
    createDirectory,
    navigateTo,
    navigateUp,
    refresh,
    openFile,
    openFileContent,
    setOpenFile,
  };
}
