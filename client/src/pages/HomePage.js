import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { useSocket } from '../contexts/SocketContext';
import { Users, Video, Code, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

function HomePage() {
  const [sessionId, setSessionId] = useState('');
  const [createRole, setCreateRole] = useState('interviewer');
  const [joinRole, setJoinRole] = useState('candidate');
  const navigate = useNavigate();
  const { createSession, joinSession, isLoading, error } = useSession();
  const { initializeSocket } = useSocket();

  const handleCreateSession = async () => {
    console.log('Create session button clicked, role:', createRole);
    try {
      console.log('Calling createSession...');
      const result = await createSession(createRole);
      console.log('Session created:', result);
      
      localStorage.setItem('sessionFlow', 'create');
      localStorage.setItem('userRole', createRole);
      localStorage.setItem('currentSessionId', result.sessionId); // Save session ID
      localStorage.setItem('currentUserId', result.userId); // Save user ID
      
      // Initialize socket AFTER successful session creation
      console.log('Initializing socket...');
      initializeSocket();
      
      toast.success('Session created successfully!');
      navigate(`/interview/${result.sessionId}`);
    } catch (error) {
      console.error('Create session error:', error);
      toast.error('Failed to create session');
    }
  };

  const handleJoinSession = async () => {
    if (!sessionId.trim()) {
      toast.error('Please enter a session ID');
      return;
    }

    // Prevent double-clicks during loading
    if (isLoading) {
      console.log('Join already in progress, ignoring click');
      return;
    }

    // Check if user is trying to join their own session
    const currentSessionId = localStorage.getItem('currentSessionId');
    if (currentSessionId === sessionId.trim()) {
      toast.error('You cannot join your own session. Share this session ID with another person.');
      return;
    }

    try {
      console.log('=== HomePage.handleJoinSession CALLED ===');
      console.log('Session ID:', sessionId.trim());
      console.log('Join Role:', joinRole);
      console.log('Is Loading:', isLoading);
      console.log('==========================================');
      
      // Join session first via HTTP API
      const result = await joinSession(sessionId.trim(), joinRole);
      localStorage.setItem('sessionFlow', 'join');
      localStorage.setItem('userRole', joinRole);
      localStorage.setItem('currentUserId', result.userId); // Store the user ID
      
      // Initialize socket AFTER successful join
      initializeSocket();
      
      toast.success('Joined session successfully!');
      navigate(`/interview/${sessionId}`);
    } catch (error) {
      toast.error(error.message || 'Failed to join session');
    }
  };

  const checkSessionStatus = async () => {
    if (!sessionId.trim()) {
      toast.error('Please enter a session ID');
      return;
    }

    const sessionIdToCheck = sessionId.trim();
    console.log('Checking status for session ID:', sessionIdToCheck);

    try {
      const url = `http://localhost:5000/api/sessions/${sessionIdToCheck}/status`;
      console.log('Making request to:', url);
      
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Session status response:', data);
      
      if (response.ok && data.sessionId) {
        alert(`Session Status:
ID: ${data.sessionId}
Total Users: ${data.userCount}
Active Users: ${data.activeUserCount}
User Details: ${JSON.stringify(data.users, null, 2)}`);
      } else {
        alert('Session not found: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error checking session status:', error);
      alert('Failed to check session status: ' + error.message);
    }
  };

  const listAllSessions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/sessions/debug/all');
      const data = await response.json();
      console.log('All sessions:', data);
      
      if (response.ok) {
        alert(`All Sessions:
Total: ${data.totalSessions || 0}
Active: ${data.activeSessions || 0}
Session IDs: ${JSON.stringify(data.sessions || [], null, 2)}`);
      } else {
        alert('Failed to get sessions: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error listing sessions:', error);
      alert('Failed to list sessions: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Code className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Virtual Interview Platform</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Collaborative Technical Interviews
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Conduct seamless technical interviews with real-time collaboration, 
            text editing, and integrated code testing capabilities.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">Real-time Collaboration</h3>
            <p className="text-gray-600 text-sm">
              Two users can edit and collaborate simultaneously with live updates.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Code className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">Code Conversion</h3>
            <p className="text-gray-600 text-sm">
              Convert selected text to executable code with syntax highlighting.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Video className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">Integrated Testing</h3>
            <p className="text-gray-600 text-sm">
              Run code with custom inputs and see outputs in real-time.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">Secure Execution</h3>
            <p className="text-gray-600 text-sm">
              Sandboxed code execution environment for safe testing.
            </p>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Create Session */}
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Create New Session</h3>
            <p className="text-gray-600 mb-6">
              Start a new interview session and share the session ID with your candidate.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Role
              </label>
              <select
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value)}
                className="input"
                disabled={isLoading}
              >
                <option value="interviewer">Interviewer</option>
                <option value="candidate">Candidate</option>
              </select>
            </div>

            <button
              onClick={handleCreateSession}
              disabled={isLoading}
              className="button button-primary w-full"
            >
              {isLoading ? 'Creating...' : 'Create Session'}
            </button>
          </div>

          {/* Join Session */}
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Join Existing Session</h3>
            <p className="text-gray-600 mb-6">
              Enter the session ID provided by your interviewer to join the session.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session ID
              </label>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Enter session ID"
                className="input"
                disabled={isLoading}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Role
              </label>
              <select
                value={joinRole}
                onChange={(e) => setJoinRole(e.target.value)}
                className="input"
                disabled={isLoading}
              >
                <option value="candidate">Candidate</option>
                <option value="interviewer">Interviewer</option>
              </select>
            </div>

            <button
              onClick={handleJoinSession}
              disabled={isLoading || !sessionId.trim()}
              className="button button-primary w-full mb-2"
            >
              {isLoading ? 'Joining...' : 'Join Session'}
            </button>
            
            <button
              onClick={checkSessionStatus}
              disabled={!sessionId.trim()}
              className="button w-full bg-gray-500 hover:bg-gray-600 text-white mb-2"
            >
              Debug: Check Session Status
            </button>
            
            <button
              onClick={listAllSessions}
              className="button w-full bg-purple-500 hover:bg-purple-600 text-white"
            >
              Debug: List All Sessions
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-center">{error}</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4">How to Use</h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">For Interviewers:</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Create a new session</li>
                  <li>Share the session ID with the candidate</li>
                  <li>Start collaborating on technical problems</li>
                  <li>Convert text to code and test solutions</li>
                </ol>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">For Candidates:</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Receive the session ID from your interviewer</li>
                  <li>Join the session using the provided ID</li>
                  <li>Collaborate in real-time on problem solving</li>
                  <li>Write and test your code solutions</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default HomePage;