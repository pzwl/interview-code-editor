const { v4: uuidv4 } = require('uuid');

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.userSockets = new Map();
  }

  createSession(userRole = 'interviewer') {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      createdAt: new Date(),
      lastActivity: new Date(),
      users: new Map(),
      document: {
        content: '',
        version: 0,
        operations: []
      },
      codeState: {
        selectedText: '',
        language: 'javascript',
        code: '',
        testCases: []
      }
    };

    this.sessions.set(sessionId, session);
    
    return {
      sessionId,
      userRole,
      success: true
    };
  }

  joinSession(sessionId, userRole) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    console.log(`Attempting to join session ${sessionId} with role ${userRole}`);
    console.log(`Current users in session:`, Array.from(session.users.values()));

    // Clean up inactive users first - be more aggressive 
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000); // 1 minute instead of 5
    
    // Remove old inactive users
    const usersToRemove = [];
    session.users.forEach((user, userId) => {
      if (!user.active && user.lastSeen && user.lastSeen < oneMinuteAgo) {
        usersToRemove.push(userId);
      }
    });
    
    usersToRemove.forEach(userId => {
      console.log(`Removing inactive user ${userId} from session ${sessionId}`);
      session.users.delete(userId);
    });

    // Check if session is full (max 2 active users)
    const currentActiveUsers = Array.from(session.users.values()).filter(user => user.active);
    console.log(`Active users after cleanup:`, currentActiveUsers);
    
    if (currentActiveUsers.length >= 2) {
      return { success: false, error: 'Session is full' };
    }

    // Check if an inactive user with this role exists (allow rejoining)
    const existingUser = Array.from(session.users.values()).find(user => 
      user.role === userRole && !user.active
    );

    let userId;
    if (existingUser) {
      // Reactivate existing user
      userId = existingUser.id;
      existingUser.active = true;
      existingUser.lastSeen = new Date();
      console.log(`Reactivating existing user ${userId} with role ${userRole}`);
    } else {
      // Check if role is already taken by an active user
      const activeRoles = currentActiveUsers.map(user => user.role);
      if (activeRoles.includes(userRole)) {
        return { success: false, error: 'Role already taken' };
      }

      // Create new user
      userId = uuidv4();
      session.users.set(userId, {
        id: userId,
        role: userRole,
        joinedAt: new Date(),
        active: true
      });
      console.log(`Created new user ${userId} with role ${userRole}`);
    }

    session.lastActivity = new Date();

    return {
      sessionId,
      userId,
      userRole,
      success: true,
      sessionState: {
        document: session.document,
        codeState: session.codeState,
        users: Array.from(session.users.values())
      }
    };
  }

  addUserSocket(sessionId, userId, socketId) {
    const session = this.sessions.get(sessionId);
    if (session && session.users.has(userId)) {
      this.userSockets.set(socketId, { sessionId, userId });
      const user = session.users.get(userId);
      user.socketId = socketId;
      user.active = true;
      session.lastActivity = new Date();
      return true;
    }
    return false;
  }

  handleDisconnection(socketId) {
    const userInfo = this.userSockets.get(socketId);
    if (userInfo) {
      const { sessionId, userId } = userInfo;
      const session = this.sessions.get(sessionId);
      
      if (session && session.users.has(userId)) {
        const user = session.users.get(userId);
        user.active = false;
        user.lastSeen = new Date();
        
        // If both users are inactive, mark session for cleanup
        const activeUsers = Array.from(session.users.values()).filter(u => u.active);
        if (activeUsers.length === 0) {
          session.inactive = true;
        }
      }
      
      this.userSockets.delete(socketId);
    }
  }

  updateDocument(sessionId, operation) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Update the document content based on the operation
    if (operation.type === 'insert' && operation.content !== undefined) {
      session.document.content = operation.content;
    }

    session.document.operations.push(operation);
    session.document.version++;
    session.lastActivity = new Date();

    return session.document;
  }

  updateCodeState(sessionId, codeState) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.codeState = { ...session.codeState, ...codeState };
    session.lastActivity = new Date();

    return session.codeState;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  getSessionBySocket(socketId) {
    const userInfo = this.userSockets.get(socketId);
    if (userInfo) {
      return this.sessions.get(userInfo.sessionId);
    }
    return null;
  }

  getUserBySocket(socketId) {
    const userInfo = this.userSockets.get(socketId);
    if (userInfo) {
      const session = this.sessions.get(userInfo.sessionId);
      if (session) {
        return session.users.get(userInfo.userId);
      }
    }
    return null;
  }

  isValidSession(sessionId) {
    return this.sessions.has(sessionId);
  }

  cleanupInactiveSessions() {
    const now = new Date();
    const timeout = parseInt(process.env.SESSION_TIMEOUT) || 3600000; // 1 hour

    for (const [sessionId, session] of this.sessions.entries()) {
      const timeSinceActivity = now - session.lastActivity;
      
      if (timeSinceActivity > timeout || session.inactive) {
        console.log(`Cleaning up inactive session: ${sessionId}`);
        this.sessions.delete(sessionId);
        
        // Clean up associated user sockets
        for (const [socketId, userInfo] of this.userSockets.entries()) {
          if (userInfo.sessionId === sessionId) {
            this.userSockets.delete(socketId);
          }
        }
      }
    }
  }

  getSessionStats() {
    return {
      totalSessions: this.sessions.size,
      activeSessions: Array.from(this.sessions.values()).filter(s => !s.inactive).length,
      totalConnections: this.userSockets.size
    };
  }
}

module.exports = new SessionManager();