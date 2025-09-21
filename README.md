# 🚀 Virtual Interview Platform

A **real-time collaborative interview platform** that revolutionizes technical interviews by providing live document editing, code execution, and seamless communication between interviewers and candidates.

## ✨ Overview

The Virtual Interview Platform enables interviewers to conduct technical interviews in a shared, interactive environment. Think of it as a **smart shared notepad** combined with a **code execution engine** - perfect for coding interviews, technical assessments, and collaborative problem-solving sessions.

### 🎯 How It Works

1. **👨‍💼 Interviewer Creates Session**: The interviewer starts a new interview session and receives a unique session ID
2. **👨‍💻 Candidate Joins**: The candidate uses the session ID to join the interview room
3. **📝 Collaborative Editing**: Both parties can write, edit, and collaborate in real-time on a shared document
4. **🔍 Code Selection & Execution**: Select any text/code written by the candidate and convert it to executable code
5. **⚡ Live Code Testing**: Run the selected code with custom inputs, similar to competitive programming judges (like CPH Judge)

## 🌟 Key Features

### 📋 **Shared Notepad Functionality**
- **Real-time collaborative editing** - See changes instantly as they're typed
- **Multi-user synchronization** - Multiple people can edit simultaneously
- **Live cursor tracking** - See where others are typing
- **Auto-save** - No data loss, everything is saved automatically

### 👥 **Role-Based System**
- **Interviewer Role**: Create sessions, manage interviews, execute code
- **Candidate Role**: Join sessions, write code, collaborate on solutions
- **Session Management**: Unique session IDs for secure, private interviews

### 💻 **Advanced Code Execution**
- **Text-to-Code Conversion**: Select any text and convert it to executable code
- **Multiple Language Support**: JavaScript, Python, Java, C++, and more
- **Custom Input Testing**: Provide test inputs to validate code functionality
- **Real-time Results**: See code output instantly, just like competitive programming platforms
- **Syntax Highlighting**: Clean, readable code with proper formatting

### 🔄 **Real-Time Communication**
- **WebSocket Technology**: Ultra-low latency communication using Socket.io
- **Live User Status**: See who's online and active in the session
- **Connection Monitoring**: Real-time connection status indicators
- **Instant Synchronization**: Changes appear immediately across all devices

### 🎨 **Modern User Experience**
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Clean Interface**: Intuitive, distraction-free design focused on productivity
- **Dark/Light Themes**: Comfortable viewing in any environment
- **Accessibility**: Built with accessibility standards in mind

## 🛠️ Tech Stack

### **Frontend**
- **⚛️ React 18** - Modern UI framework with hooks and context
- **🔌 Socket.io Client** - Real-time bidirectional communication
- **🧭 React Router** - Single-page application routing
- **🎨 CSS3** - Modern styling with flexbox and grid
- **📱 Responsive Design** - Mobile-first approach

### **Backend**
- **🟢 Node.js** - JavaScript runtime for server-side logic
- **🚀 Express.js** - Fast, minimalist web framework
- **🔌 Socket.io** - Real-time communication engine
- **💾 Session Management** - In-memory session storage with cleanup
- **🔒 CORS Support** - Cross-origin resource sharing enabled

### **Development Tools**
- **🐳 Docker** - Containerization for easy deployment
- **📦 npm/yarn** - Package management
- **🔧 ESLint** - Code quality and consistency
- **🎯 Hot Reload** - Development server with live reloading

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **Git** - For cloning the repository

### 📥 Installation

1. **Clone the repository**:
```bash
git clone https://github.com/pzwl/interview-code-editor.git
cd interview-code-editor
```

2. **Install dependencies** (automated script):
```bash
# Windows PowerShell
./install-deps.ps1

# Or manually:
npm install
cd client && npm install
cd ../server && npm install
```

3. **Start the development servers**:
```bash
# Windows PowerShell (starts both client and server)
./start-dev.ps1

# Or manually:
# Terminal 1 - Start the server
cd server && npm start

# Terminal 2 - Start the client  
cd client && npm start
```

4. **Open your browser** and navigate to `http://localhost:3000`

### 🐳 Docker Quick Start

```bash
# Clone and start with Docker
git clone https://github.com/pzwl/interview-code-editor.git
cd interview-code-editor
docker-compose up
```

## 📖 How to Use

### **For Interviewers**

1. **🎯 Create a Session**
   - Click "Create New Session"
   - Select "Interviewer" role
   - Share the generated Session ID with the candidate

2. **📝 Conduct the Interview**
   - Start typing questions or problems in the shared editor
   - Watch the candidate's responses in real-time
   - Select any code written by the candidate

3. **⚡ Test Candidate's Code**
   - Highlight the code you want to test
   - Right-click and select "Convert to Code"
   - Choose the programming language
   - Add test inputs and run the code
   - See results instantly

### **For Candidates**

1. **🔗 Join a Session**
   - Click "Join Session" 
   - Enter the Session ID provided by the interviewer
   - Select "Candidate" role

2. **💻 Write Your Solutions**
   - Type your answers and code solutions in the shared editor
   - See the interviewer's questions and feedback in real-time
   - Collaborate and discuss approaches live

3. **🧪 Test Your Code**
   - Write code solutions for the given problems
   - The interviewer can test your code with different inputs
   - See the execution results and debug if needed

## 🏗️ Project Structure

```
interview-code-editor/
├── 📁 client/                 # React Frontend Application
│   ├── 📁 public/            # Static assets
│   ├── 📁 src/
│   │   ├── 📁 components/    # Reusable UI components
│   │   │   ├── 📄 CollaborativeEditor.js    # Main text editor
│   │   │   ├── 📄 CodeRunner.js             # Code execution interface
│   │   │   ├── 📄 SessionHeader.js          # Session info display
│   │   │   └── 📄 ConnectionStatus.js       # Connection indicator
│   │   ├── 📁 contexts/      # React Context providers
│   │   │   ├── 📄 SessionContext.js         # Session state management
│   │   │   └── 📄 SocketContext.js          # WebSocket communication
│   │   ├── 📁 pages/         # Page components
│   │   │   ├── 📄 HomePage.js               # Landing page
│   │   │   └── 📄 InterviewPage.js          # Main interview interface
│   │   └── 📁 styles/        # CSS styling files
│   └── 📄 package.json       # Frontend dependencies
├── 📁 server/                # Node.js Backend Application
│   ├── 📁 handlers/          # Socket.io event handlers
│   │   └── 📄 collaborationHandler.js       # Real-time collaboration logic
│   ├── 📁 services/          # Business logic services
│   │   ├── 📄 sessionManager.js             # Session management
│   │   └── 📄 codeExecutor.js               # Code execution engine
│   ├── 📄 index.js           # Main server file
│   └── 📄 package.json       # Backend dependencies
├── 📄 docker-compose.yml     # Docker configuration
├── 📄 README.md              # This file
├── 📄 DEVELOPMENT.md         # Development guide
└── 📄 .gitignore             # Git ignore rules
```

## 🔧 Configuration

### Environment Variables

Create `.env` files in both client and server directories:

**Server (.env)**:
```env
PORT=5000
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

**Client (.env)**:
```env
REACT_APP_SERVER_URL=http://localhost:5000
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **🍴 Fork the repository**
2. **🌿 Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **💻 Make your changes** and add tests if applicable
4. **✅ Commit your changes**: `git commit -m 'Add amazing feature'`
5. **📤 Push to the branch**: `git push origin feature/amazing-feature`
6. **🔄 Open a Pull Request**

### Development Guidelines
- Follow the existing code style and conventions
- Add comments for complex logic
- Test your changes thoroughly
- Update documentation as needed

## 📝 API Documentation

### WebSocket Events

**Client → Server**:
- `join-session`: Join an interview session
- `document-operation`: Send text editing operations
- `cursor-position`: Share cursor position
- `code-execution`: Request code execution

**Server → Client**:
- `user-joined`: Notify when user joins
- `user-left`: Notify when user leaves  
- `document-operation`: Broadcast text changes
- `session-update`: Session state updates
- `code-execution-result`: Code execution results

## 🐛 Troubleshooting

### Common Issues

**Connection Problems**:
- Ensure both client (3000) and server (5000) ports are available
- Check firewall settings
- Verify WebSocket connections aren't blocked

**Code Execution Issues**:
- Ensure server has necessary runtime environments installed
- Check code syntax and language selection
- Verify input format matches expected structure

## 🔮 Roadmap

- **🎥 Video/Audio Integration**: Add video calling capabilities
- **📊 Analytics Dashboard**: Interview session analytics and insights
- **🔐 User Authentication**: Secure user accounts and session history
- **☁️ Cloud Deployment**: One-click cloud deployment options
- **🧪 Advanced Testing**: Unit test frameworks and code quality metrics
- **🎨 Customization**: Themes, layouts, and personalization options

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ for the developer community
- Inspired by modern collaborative tools and competitive programming platforms
- Thanks to all contributors and users providing feedback

---

**⭐ Star this repository if you find it helpful!**

For questions, issues, or feature requests, please [open an issue](https://github.com/pzwl/interview-code-editor/issues) or reach out to the maintainers.