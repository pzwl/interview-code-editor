# Virtual Interview Platform

A collaborative virtual interview platform that combines real-time text editing with integrated code testing capabilities.

## Features

- **Real-time Collaborative Editing**: Two users can edit text simultaneously
- **Text-to-Code Conversion**: Convert selected text to executable code
- **Integrated Code Testing**: Run code with custom inputs and see outputs
- **Multi-language Support**: JavaScript, Python, Java, C++
- **Secure Execution**: Sandboxed code execution environment
- **Session Management**: Room creation, user roles, session persistence

## Quick Start

1. Install dependencies:
   ```bash
   npm run install:all
   ```

2. Start development servers:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
├── client/          # React frontend application
├── server/          # Node.js backend with Socket.io
├── shared/          # Shared utilities and types
└── docs/           # Documentation
```

## Technology Stack

- **Frontend**: React, Socket.io-client, Monaco Editor
- **Backend**: Node.js, Express, Socket.io
- **Code Execution**: Docker containers for sandboxed execution
- **Real-time**: WebSocket communication

## Development

- Frontend runs on `http://localhost:3000`
- Backend runs on `http://localhost:5000`
- WebSocket server on port 5000

## Security

- Sandboxed code execution prevents malicious code
- Session isolation for each interview
- Automatic cleanup after sessions end