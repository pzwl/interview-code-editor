import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useSession } from './SessionContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const socket = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastPingTime, setLastPingTime] = useState(null);
  const [peerCursors, setPeerCursors] = useState({});
  const { 
    sessionId, 
    userId, 
    updateDocument, 
    updateCodeState, 
    updateSessionState,
    setConnectionStatus 
  } = useSession();

  useEffect(() => {
    // DO NOT auto-initialize socket connection
    // Socket connection will be manually initialized only when needed
    const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
    
    // DO NOT CREATE SOCKET HERE - prevent auto-connection
    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, []);

  // Manual socket initialization method
  const initializeSocket = () => {
    if (socket.current && isConnected) return;
    
    const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
    socket.current = io(SERVER_URL, {
      transports: ['websocket'], 
      timeout: 20000,
    });
    setPeerCursors({});

    // Connection event handlers
    socket.current.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setConnectionStatus(true);
      toast.success('Connected to server');
    });

    socket.current.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      setIsConnected(false);
      setConnectionStatus(false);
      setPeerCursors({});
      toast.error('Disconnected from server');
    });

    socket.current.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
      setConnectionStatus(false);
      setPeerCursors({});
      toast.error('Connection failed');
    });

    // Session event handlers
    socket.current.on('session-state', (data) => {
      updateSessionState(data);
    });

    socket.current.on('user-joined', (data) => {
      console.log('User joined event received:', data);
      toast.success(`${data.user.role} joined the session`);
      // Update session state with new user list if provided
      if (data.users) {
        console.log('Updating session state with users:', data.users.map(u => ({ 
          id: u.id, 
          role: u.role, 
          active: u.active 
        })));
        updateSessionState({ users: data.users });
      }
    });

    socket.current.on('user-left', (data) => {
      console.log('User left event received:', data);
      toast.info(`${data.user.role} left the session`);
      // Update session state with new user list if provided
      if (data.users) {
        console.log('Updating session state with users after leave:', data.users.map(u => ({ 
          id: u.id, 
          role: u.role, 
          active: u.active 
        })));
        updateSessionState({ users: data.users });
      }
    });

    // Handle session updates (user list changes)
    socket.current.on('session-update', (data = {}) => {
      console.log('Session update event received:', data);
      if (data.users) {
        console.log('Session update users:', data.users.map(u => ({ 
          id: u.id, 
          role: u.role, 
          active: u.active 
        })));
      }
      updateSessionState(data);
      if (Array.isArray(data.users)) {
        const activeIds = new Set(data.users.filter((user) => user.active).map((user) => user.id));
        setPeerCursors((previous) => {
          const next = {};
          for (const [id, cursor] of Object.entries(previous)) {
            if (activeIds.has(id)) {
              next[id] = cursor;
            }
          }
          return next;
        });
      }
    });

    // Document collaboration handlers
    socket.current.on('document-operation', (data) => {
      updateDocument(data.document);
    });

    socket.current.on('cursor-position', (data = {}) => {
      if (!data.userId) {
        return;
      }

      setPeerCursors((previous) => ({
        ...previous,
        [data.userId]: {
          position: typeof data.position === 'number' ? data.position : 0,
          selection: data.selection || null,
          updatedAt: Date.now(),
        },
      }));
    });

    // Code collaboration handlers
    socket.current.on('text-selected', (data) => {
      // Handle text selection from other users
    });

    socket.current.on('code-converted', (data) => {
      updateCodeState(data.codeState);
      toast.success('Code converted successfully');
    });

    socket.current.on('code-update', (data) => {
      updateCodeState({ code: data.code, language: data.language });
    });

    socket.current.on('test-case-update', (data) => {
      updateCodeState({ testCases: data.testCases });
    });

    socket.current.on('code-execution-result', (data = {}) => {
      const results = Array.isArray(data.results) ? data.results : [];
      updateCodeState({
        executionResults: results,
        lastExecutedAt: data.ranAt || new Date().toISOString()
      });

      if (results.length && data.executedBy && data.executedBy !== userId) {
        const passed = results.filter((item) => item.status === 'passed').length;
        toast.success(`Tests updated: ${passed}/${results.length} passed`);
      }
    });
    // Session control handlers
    socket.current.on('session-control', (data) => {
      const { action, controlledBy } = data;
      toast.info(`Session ${action} by ${controlledBy}`);
    });

    // Error handlers
    socket.current.on('error', (data) => {
      console.error('Socket error:', data);
      toast.error(data.message || 'An error occurred');
    });

    // Heartbeat
    socket.current.on('pong', () => {
      setLastPingTime(new Date());
    });

    socket.current.on('heartbeat-ack', () => {
      setLastPingTime(new Date());
    });
  };

  // DON'T auto-join session - only join when explicitly requested
  // useEffect(() => {
  //   if (socket.current && isConnected && sessionId && userId && sessionId.trim() && userId.trim()) {
  //     console.log('Attempting to join session:', { sessionId, userId });
  //     socket.current.emit('join-session', { sessionId, userId });
  //   }
  // }, [sessionId, userId, isConnected]);

  // Manual join session method - use useCallback to prevent infinite re-renders
  const joinSession = useCallback((sessionId, userId) => {
    if (socket.current && isConnected && sessionId && userId) {
      console.log('Manually joining session:', { sessionId, userId });
      socket.current.emit('join-session', { sessionId, userId });
    }
  }, [isConnected]);

  // Heartbeat mechanism
  useEffect(() => {
    if (!isConnected) return;

    const heartbeatInterval = setInterval(() => {
      if (socket.current) {
        socket.current.emit('heartbeat');
      }
    }, 30000); // Send heartbeat every 30 seconds

    return () => clearInterval(heartbeatInterval);
  }, [isConnected]);

  // Socket methods
  const emitDocumentOperation = (operation) => {
    if (socket.current && isConnected) {
      socket.current.emit('document-operation', { operation });
    }
  };

  const emitCursorPosition = (position, selection) => {
    if (socket.current && isConnected) {
      socket.current.emit('cursor-position', { position, selection });
    }
  };

  const emitTextSelected = (selectedText, startPos, endPos) => {
    if (socket.current && isConnected) {
      socket.current.emit('text-selected', { selectedText, startPos, endPos });
    }
  };

  const emitConvertToCode = (selectedText, language) => {
    if (socket.current && isConnected) {
      socket.current.emit('convert-to-code', { selectedText, language });
    }
  };

  const emitCodeUpdate = (code, language) => {
    if (socket.current && isConnected) {
      socket.current.emit('code-update', { code, language });
    }
  };

  const emitTestCaseUpdate = (testCases) => {
    if (socket.current && isConnected) {
      socket.current.emit('test-case-update', { testCases });
    }
  };

  const emitCodeExecutionResult = (result) => {
    if (socket.current && isConnected) {
      socket.current.emit('code-execution-result', result);
    }
  };

  const emitSessionControl = (action) => {
    if (socket.current && isConnected) {
      socket.current.emit('session-control', { action });
    }
  };

  const emitExportSession = () => {
    if (socket.current && isConnected) {
      socket.current.emit('export-session');
    }
  };

  const value = {
    socket: socket.current,
    isConnected,
    lastPingTime,
    peerCursors,
    initializeSocket,
    joinSession,
    emitDocumentOperation,
    emitCursorPosition,
    emitTextSelected,
    emitConvertToCode,
    emitCodeUpdate,
    emitTestCaseUpdate,
    emitCodeExecutionResult,
    emitSessionControl,
    emitExportSession
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
