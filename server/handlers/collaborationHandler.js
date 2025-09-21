const sessionManager = require('../services/sessionManager');

function collaborationHandler(socket, io, sessions) {
  // Join a session
  socket.on('join-session', (data) => {
    console.log('Join session request:', data);
    const { sessionId, userId } = data;
    
    if (!sessionId || !userId) {
      console.log('Missing sessionId or userId');
      socket.emit('error', { message: 'Invalid session data' });
      return;
    }
    
    // Check if session exists
    const session = sessions.getSession(sessionId);
    if (!session) {
      console.log('Session not found:', sessionId);
      socket.emit('error', { message: 'Session not found' });
      return;
    }
    
    // Check if user exists in session
    if (!session.users.has(userId)) {
      console.log('User not found in session:', { sessionId, userId, existingUsers: Array.from(session.users.keys()) });
      socket.emit('error', { message: 'User not found in session' });
      return;
    }
    
    if (sessions.addUserSocket(sessionId, userId, socket.id)) {
      socket.join(sessionId);
      
      const user = sessions.getUserBySocket(socket.id);
      
      if (session && user) {
        console.log(`User ${userId} (${user.role}) joined session ${sessionId}`);
        
        // Get updated user list
        const updatedUsers = Array.from(session.users.values());
        console.log('Updated users after join:', updatedUsers.map(u => ({ 
          id: u.id, 
          role: u.role, 
          active: u.active,
          socketId: u.socketId ? u.socketId.substring(0, 8) + '...' : 'none'
        })));
        
        // Notify other users in the session with updated user list
        socket.to(sessionId).emit('user-joined', {
          user: {
            id: user.id,
            role: user.role,
            active: true
          },
          users: updatedUsers // Include updated user list
        });

        // Send current session state to the joining user
        socket.emit('session-state', {
          document: session.document,
          codeState: session.codeState,
          users: updatedUsers
        });
        
        // Also send updated session state to all users in the session
        io.to(sessionId).emit('session-update', {
          users: updatedUsers
        });
      } else {
        console.log('Session or user not found after joining');
        socket.emit('error', { message: 'Session not found' });
      }
    } else {
      console.log('Failed to add user to session - user might not exist in session');
      socket.emit('error', { message: 'Failed to join session' });
    }
  });

  // Handle text editor operations
  socket.on('document-operation', (data) => {
    const session = sessions.getSessionBySocket(socket.id);
    const user = sessions.getUserBySocket(socket.id);
    
    if (!session || !user) {
      socket.emit('error', { message: 'Invalid session' });
      return;
    }

    const { operation } = data;
    console.log(`Document operation from ${user.role}:`, operation);
    
    // Update document state
    const updatedDocument = sessions.updateDocument(session.id, {
      ...operation,
      userId: user.id,
      timestamp: new Date()
    });

    if (updatedDocument) {
      console.log('Updated document content:', updatedDocument.content.substring(0, 100) + '...');
      
      // Broadcast operation to other users in the session
      socket.to(session.id).emit('document-operation', {
        operation: {
          ...operation,
          userId: user.id
        },
        document: updatedDocument
      });
    }
  });

  // Handle cursor position updates
  socket.on('cursor-position', (data) => {
    const session = sessions.getSessionBySocket(socket.id);
    const user = sessions.getUserBySocket(socket.id);
    
    if (!session || !user) return;

    // Broadcast cursor position to other users
    socket.to(session.id).emit('cursor-position', {
      userId: user.id,
      position: data.position,
      selection: data.selection
    });
  });

  // Handle text selection for code conversion
  socket.on('text-selected', (data) => {
    const session = sessions.getSessionBySocket(socket.id);
    const user = sessions.getUserBySocket(socket.id);
    
    if (!session || !user) return;

    const { selectedText, startPos, endPos } = data;
    
    // Update session code state
    sessions.updateCodeState(session.id, {
      selectedText,
      selectionRange: { startPos, endPos }
    });

    // Notify other users about text selection
    socket.to(session.id).emit('text-selected', {
      userId: user.id,
      selectedText,
      startPos,
      endPos
    });
  });

  // Handle code conversion
  socket.on('convert-to-code', (data) => {
    const session = sessions.getSessionBySocket(socket.id);
    const user = sessions.getUserBySocket(socket.id);
    
    if (!session || !user) return;

    const { selectedText, language } = data;
    
    // Update code state
    const codeState = sessions.updateCodeState(session.id, {
      selectedText,
      language,
      code: selectedText, // Initial code is the selected text
      lastModifiedBy: user.id
    });

    // Broadcast code conversion to all users in session
    io.to(session.id).emit('code-converted', {
      codeState,
      convertedBy: user.id
    });
  });

  // Handle code updates in the code editor
  socket.on('code-update', (data) => {
    const session = sessions.getSessionBySocket(socket.id);
    const user = sessions.getUserBySocket(socket.id);
    
    if (!session || !user) return;

    const { code, language } = data;
    
    const codeState = sessions.updateCodeState(session.id, {
      code,
      language,
      lastModifiedBy: user.id
    });

    // Broadcast code update to other users
    socket.to(session.id).emit('code-update', {
      code,
      language,
      updatedBy: user.id
    });
  });

  // Handle test case management
  socket.on('test-case-update', (data) => {
    const session = sessions.getSessionBySocket(socket.id);
    const user = sessions.getUserBySocket(socket.id);
    
    if (!session || !user) return;

    const { testCases } = data;
    
    const codeState = sessions.updateCodeState(session.id, {
      testCases,
      lastModifiedBy: user.id
    });

    // Broadcast test case update
    socket.to(session.id).emit('test-case-update', {
      testCases,
      updatedBy: user.id
    });
  });

  // Handle code execution results
  socket.on('code-execution-result', (data = {}) => {
    const session = sessions.getSessionBySocket(socket.id);
    const user = sessions.getUserBySocket(socket.id);

    if (!session || !user) return;

    const ranAt = data.ranAt || new Date().toISOString();

    sessions.updateCodeState(session.id, {
      executionResults: Array.isArray(data.results) ? data.results : [],
      lastExecutedAt: ranAt
    });

    io.to(session.id).emit('code-execution-result', {
      ...data,
      ranAt,
      executedBy: user.id,
      timestamp: new Date().toISOString()
    });
  });

  // Handle session control events
  socket.on('session-control', (data) => {
    const session = sessions.getSessionBySocket(socket.id);
    const user = sessions.getUserBySocket(socket.id);
    
    if (!session || !user) return;

    const { action } = data; // 'start', 'pause', 'end'
    
    // Only interviewer can control session (optional business logic)
    if (user.role === 'interviewer') {
      io.to(session.id).emit('session-control', {
        action,
        controlledBy: user.id,
        timestamp: new Date()
      });
    }
  });

  // Handle connection status updates
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Handle export/copy requests
  socket.on('export-session', () => {
    const session = sessions.getSessionBySocket(socket.id);
    const user = sessions.getUserBySocket(socket.id);
    
    if (!session || !user) return;

    const exportData = {
      sessionId: session.id,
      createdAt: session.createdAt,
      exportedAt: new Date(),
      document: session.document,
      codeState: session.codeState,
      users: Array.from(session.users.values()).map(u => ({
        role: u.role,
        joinedAt: u.joinedAt
      }))
    };

    socket.emit('export-data', exportData);
  });

  // Handle heartbeat for connection monitoring
  socket.on('heartbeat', () => {
    const user = sessions.getUserBySocket(socket.id);
    if (user) {
      user.lastSeen = new Date();
      socket.emit('heartbeat-ack');
    }
  });
}

module.exports = collaborationHandler;