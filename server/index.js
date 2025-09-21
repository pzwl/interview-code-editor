const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const sessionManager = require('./services/sessionManager');
const codeExecutor = require('./services/codeExecutor');
const collaborationHandler = require('./handlers/collaborationHandler');

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json());

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/execute-code', async (req, res) => {
  try {
    const { code, language, input, sessionId } = req.body;
    
    if (!sessionManager.isValidSession(sessionId)) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const result = await codeExecutor.execute(code, language, input);
    res.json(result);
  } catch (error) {
    console.error('Code execution error:', error);
    res.status(500).json({ error: 'Code execution failed' });
  }
});

app.post('/api/sessions', (req, res) => {
  try {
    const { userRole } = req.body;
    const session = sessionManager.createSession(userRole);
    res.json(session);
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

app.post('/api/sessions/:sessionId/join', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userRole } = req.body;
    
    console.log('=== HTTP API JOIN REQUEST ===');
    console.log('Session ID:', sessionId);
    console.log('User Role:', userRole);
    console.log('Request headers:', req.headers);
    console.log('Request IP:', req.ip);
    console.log('User-Agent:', req.get('User-Agent'));
    console.log('==============================');
    
    const result = sessionManager.joinSession(sessionId, userRole);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Session join error:', error);
    res.status(500).json({ error: 'Failed to join session' });
  }
});

// Debug endpoint to check session status
app.get('/api/sessions/:sessionId/status', (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log('Debug endpoint called for session ID:', sessionId);
    
    const session = sessionManager.getSession(sessionId);
    console.log('Session found:', !!session);
    
    if (!session) {
      console.log('Session not found, returning 404');
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    
    const users = Array.from(session.users.values());
    console.log('Session users:', users);
    
    const responseData = {
      sessionId,
      userCount: users.length,
      activeUserCount: users.filter(u => u.active).length,
      users: users.map(u => ({
        id: u.id,
        role: u.role,
        active: u.active,
        joinedAt: u.joinedAt,
        lastSeen: u.lastSeen
      }))
    };
    
    console.log('Sending response:', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('Session status error:', error);
    res.status(500).json({ error: 'Failed to get session status' });
  }
});

// Debug endpoint to list all sessions
app.get('/api/sessions/debug/all', (req, res) => {
  try {
    const stats = sessionManager.getSessionStats();
    res.json(stats);
  } catch (error) {
    console.error('Session list error:', error);
    res.status(500).json({ error: 'Failed to get session list' });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle collaboration events
  collaborationHandler(socket, io, sessionManager);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Get user socket info before disconnection  
    const userSocketInfo = sessionManager.userSockets?.get(socket.id);
    
    // If user was in a session, get session info BEFORE handling disconnection
    if (userSocketInfo && userSocketInfo.sessionId) {
      const session = sessionManager.getSession(userSocketInfo.sessionId);
      if (session) {
        const user = session.users.get(userSocketInfo.userId);
        
        if (user) {
          // Handle the disconnection AFTER getting user info
          sessionManager.handleDisconnection(socket.id);
          
          // Get updated users list after disconnection
          const updatedUsers = Array.from(session.users.values());
          
          console.log(`User ${user.role} (${user.id}) disconnected from session ${userSocketInfo.sessionId}`);
          console.log('Updated users:', updatedUsers.map(u => ({ id: u.id, role: u.role, active: u.active })));
          
          // Notify OTHER users that this user left (use io.to instead of socket.to)
          io.to(userSocketInfo.sessionId).emit('user-left', {
            user: {
              id: user.id,
              role: user.role,
              active: false
            },
            users: updatedUsers
          });
          
          // Send updated session state to all users in the session
          io.to(userSocketInfo.sessionId).emit('session-update', {
            users: updatedUsers
          });
        } else {
          // Handle disconnection if user not found
          sessionManager.handleDisconnection(socket.id);
        }
      } else {
        // Handle disconnection if session not found
        sessionManager.handleDisconnection(socket.id);
      }
    } else {
      // Handle disconnection if no session info
      sessionManager.handleDisconnection(socket.id);
    }
  });
});

// Cleanup inactive sessions every 5 minutes
setInterval(() => {
  sessionManager.cleanupInactiveSessions();
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Client URL: ${process.env.CLIENT_URL || "http://localhost:3000"}`);
});

module.exports = { app, server, io };