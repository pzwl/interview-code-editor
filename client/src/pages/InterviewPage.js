import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { useSocket } from '../contexts/SocketContext';
import CollaborativeEditor from '../components/CollaborativeEditor';
import CodeRunner from '../components/CodeRunner';
import SessionHeader from '../components/SessionHeader';
import ConnectionStatus from '../components/ConnectionStatus';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import './InterviewPage.css';

function InterviewPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [showCodeRunner, setShowCodeRunner] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState(null);
  const [showJoinInterface, setShowJoinInterface] = useState(false);
  const [userRole, setUserRole] = useState('candidate');
  const [hasJoinedSocket, setHasJoinedSocket] = useState(false); // Add this state
  
  const {
    joinSession,
    sessionState,
    userRole: currentUserRole,
    userId,
    isLoading,
    error
  } = useSession();
  
  const { isConnected, initializeSocket, joinSession: socketJoinSession } = useSocket();

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }

    // Check if we came from a proper session creation/join flow
    const hasSessionFlow = localStorage.getItem('sessionFlow');
    if (hasSessionFlow) {
      const savedRole = localStorage.getItem('userRole') || 'candidate';
      // Auto-join only if we have proper flow
      joinSession(sessionId, savedRole).catch(() => {
        toast.error('Failed to join session');
        setShowJoinInterface(true);
      });
      localStorage.removeItem('sessionFlow'); // Clean up
    } else {
      // If no proper flow, show join interface instead of redirecting
      setShowJoinInterface(true);
    }
  }, [sessionId, navigate, joinSession]);

  // Join socket session when user data is available (only once)
  useEffect(() => {
    if (sessionId && userId && isConnected && !hasJoinedSocket) {
      console.log('Joining socket session:', { sessionId, userId });
      socketJoinSession(sessionId, userId);
      setHasJoinedSocket(true);
    }
  }, [sessionId, userId, isConnected, hasJoinedSocket, socketJoinSession]);

  // Watch for successful session joining to hide join interface
  useEffect(() => {
    if (userId && showJoinInterface) {
      setShowJoinInterface(false);
    }
  }, [userId, showJoinInterface]);

  const handleManualJoin = async () => {
    try {
      // Join the session via SessionContext first
      const result = await joinSession(sessionId, userRole);
      
      // Initialize socket AFTER successful join
      initializeSocket();
      
      if (result && result.userId) {
        toast.success('Joined session successfully!');
      } else {
        throw new Error('Failed to get user ID from session');
      }
    } catch (error) {
      console.error('Join session error:', error);
      toast.error(error.message || 'Failed to join session');
    }
  };

  const handleTextSelection = (text, range) => {
    setSelectedText(text);
    setSelectionRange(range);
  };

  const handleConvertToCode = (language = 'javascript') => {
    if (!selectedText.trim()) {
      toast.error('Please select some text first');
      return;
    }
    
    setShowCodeRunner(true);
    toast.success('Code runner opened');
  };

  const handleCloseCodeRunner = () => {
    setShowCodeRunner(false);
    setSelectedText('');
    setSelectionRange(null);
  };

  // Show join interface if accessed directly without proper flow
  if (showJoinInterface) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 max-w-md w-full mx-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Join Interview Session</h2>
          <p className="text-gray-600 mb-6">
            You're trying to access session: <strong>{sessionId}</strong>
          </p>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Role
            </label>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="candidate">Candidate</option>
              <option value="interviewer">Interviewer</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleManualJoin}
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Joining...' : 'Join Session'}
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Go Home
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="interview-error">
        <div className="error-container">
          <h2>Session Error</h2>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/')} 
            className="button button-primary"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!userId) {
    return <LoadingSpinner />;
  }

  return (
    <div className="interview-page">
      <SessionHeader 
        sessionId={sessionId}
        userRole={currentUserRole}
        users={sessionState.users}
      />
      
      <ConnectionStatus isConnected={isConnected} />
      
      <div className="interview-layout">
        <div className={`editor-section ${showCodeRunner ? 'with-code-runner' : 'full-width'}`}>
          <CollaborativeEditor
            content={sessionState.document.content}
            onTextSelection={handleTextSelection}
            onConvertToCode={handleConvertToCode}
            selectedText={selectedText}
            selectionRange={selectionRange}
          />
        </div>
        
        {showCodeRunner && (
          <div className="code-runner-section">
            <CodeRunner
              initialCode={selectedText}
              onClose={handleCloseCodeRunner}
              sessionId={sessionId}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default InterviewPage;