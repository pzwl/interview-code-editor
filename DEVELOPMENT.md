 # Virtual Interview Platform - Development Guide

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Git (optional)

### Installation & Setup

1. **Install Dependencies**
   ```bash
   # Option 1: Using PowerShell script (Windows)
   .\install-deps.ps1
   
   # Option 2: Manual installation
   npm run install:all
   ```

2. **Start Development Servers**
   ```bash
   # Option 1: Using PowerShell script (Windows)
   .\start-dev.ps1
   
   # Option 2: Manual start
   npm run dev
   ```

3. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/health

## Project Structure

```
virtual-interview-platform/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   └── styles/         # CSS files
│   ├── public/             # Static assets
│   └── package.json
├── server/                 # Node.js backend
│   ├── handlers/           # Socket.io event handlers
│   ├── services/           # Business logic
│   ├── temp/               # Temporary code execution files
│   └── package.json
├── shared/                 # Shared utilities
└── docs/                   # Documentation
```

## Features Implementation Status

### ✅ Completed Features

1. **Real-time Collaborative Editing**
   - Multi-user text editing
   - Live cursor tracking
   - Sync status indicators

2. **Text-to-Code Conversion**
   - Right-click context menu
   - Language selection
   - Smart text selection

3. **Code Execution Environment**
   - Monaco code editor
   - Multi-language support (JS, Python, Java, C++)
   - Test case management
   - Secure sandboxed execution

4. **Session Management**
   - Room creation and joining
   - User role management
   - Session persistence
   - Auto-cleanup

5. **WebSocket Communication**
   - Real-time collaboration
   - Connection status monitoring
   - Heartbeat mechanism

### 🚧 In Development

1. **Enhanced UX Features**
   - Offline handling
   - Reconnection logic
   - Undo/redo functionality
   - Export capabilities

2. **Responsive Design**
   - Mobile compatibility
   - Accessibility features
   - Professional styling

## API Endpoints

### REST Endpoints
- `GET /health` - Health check
- `POST /api/sessions` - Create new session
- `POST /api/sessions/:id/join` - Join existing session
- `POST /api/execute-code` - Execute code

### WebSocket Events

#### Client → Server
- `join-session` - Join a session
- `document-operation` - Text editing operations
- `cursor-position` - Cursor position updates
- `text-selected` - Text selection events
- `convert-to-code` - Convert text to code
- `code-update` - Code editor updates
- `test-case-update` - Test case modifications
- `heartbeat` - Connection monitoring

#### Server → Client
- `session-state` - Current session state
- `user-joined` - User joined notification
- `document-operation` - Document updates
- `code-converted` - Code conversion results
- `code-execution-result` - Execution results
- `error` - Error notifications

## Development Commands

```bash
# Install all dependencies
npm run install:all

# Start development servers
npm run dev

# Start only server
npm run server:dev

# Start only client
npm run client:dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

### Server (.env)
```
PORT=5000
CLIENT_URL=http://localhost:3000
NODE_ENV=development
CODE_EXECUTION_TIMEOUT=10000
MAX_OUTPUT_SIZE=10240
SESSION_TIMEOUT=3600000
MAX_SESSIONS=100
```

### Client
```
REACT_APP_SERVER_URL=http://localhost:5000
```

## Testing the Application

### Manual Testing Scenarios

1. **Session Creation & Joining**
   - Create a session as interviewer
   - Copy session ID
   - Join from another browser/incognito as candidate
   - Verify both users appear in session

2. **Real-time Collaboration**
   - Type in one browser window
   - Verify changes appear in other window
   - Test cursor position tracking
   - Test simultaneous editing

3. **Text-to-Code Conversion**
   - Type algorithm description in editor
   - Select text and right-click
   - Choose "Convert to Code" → JavaScript
   - Verify code runner opens with selected text

4. **Code Execution**
   - Write simple code (e.g., `console.log("Hello World")`)
   - Add test input if needed
   - Click "Run" button
   - Verify output appears correctly

5. **Multi-language Support**
   - Test JavaScript: `console.log("Hello")`
   - Test Python: `print("Hello")`
   - Test Java: Basic main method
   - Test C++: Basic iostream program

6. **Error Handling**
   - Test invalid session ID
   - Test network disconnection
   - Test malformed code execution
   - Test session timeout

## Deployment

### Using Docker
```bash
# Build and run with Docker Compose
docker-compose up --build

# Access application
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

### Manual Deployment
1. Build client: `cd client && npm run build`
2. Start server: `cd server && npm start`
3. Serve client build files through web server

## Security Considerations

1. **Code Execution Sandboxing**
   - Limited execution time (10 seconds)
   - Output size limits
   - No file system access
   - Process isolation

2. **Session Security**
   - Session isolation
   - Automatic cleanup
   - Rate limiting
   - Input validation

3. **Network Security**
   - CORS configuration
   - Helmet security headers
   - Request rate limiting

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Kill process on port 3000 or 5000
   npx kill-port 3000
   npx kill-port 5000
   ```

2. **Dependencies Issues**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules client/node_modules server/node_modules
   npm run install:all
   ```

3. **WebSocket Connection Issues**
   - Check firewall settings
   - Verify server is running
   - Check browser console for errors

4. **Code Execution Fails**
   - Ensure Python/Java/G++ installed
   - Check temp directory permissions
   - Verify timeout settings

## Performance Optimization

1. **Frontend**
   - Code splitting with React.lazy
   - Monaco editor virtualization
   - Optimized re-renders with useMemo/useCallback

2. **Backend**
   - Session cleanup intervals
   - Connection pooling
   - Output size limiting

3. **Real-time Updates**
   - Debounced document operations
   - Efficient diff algorithms
   - Selective event broadcasting

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

## License

MIT License - see LICENSE file for details.