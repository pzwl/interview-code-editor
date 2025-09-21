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
  const [hasJoinedSocket, setHasJoinedSocket] = useState(false);

  const {
    joinSession,
    sessionState,
    userRole: currentUserRole,
    userId,
    isLoading,
    error,
    updateCodeState
  } = useSession();

  const {
    isConnected,
    initializeSocket,
    joinSession: socketJoinSession
  } = useSocket();

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }

    const sessionFlow = localStorage.getItem('sessionFlow');
    const savedRole = localStorage.getItem('userRole') || 'candidate';

    if (sessionFlow === 'create') {
      joinSession(sessionId, savedRole).catch(() => {
        toast.error('Failed to join session');
        setShowJoinInterface(true);
      });
    } else if (sessionFlow === 'join') {
      setShowJoinInterface(false);
    } else if (!userId) {
      setShowJoinInterface(true);
    }

    if (sessionFlow) {
      localStorage.removeItem('sessionFlow');
    }
  }, [sessionId, navigate, joinSession, userId]);

  useEffect(() => {
    if (sessionId && userId && isConnected && !hasJoinedSocket) {
      socketJoinSession(sessionId, userId);
      setHasJoinedSocket(true);
    }
  }, [sessionId, userId, isConnected, hasJoinedSocket, socketJoinSession]);

  useEffect(() => {
    if (userId && showJoinInterface) {
      setShowJoinInterface(false);
    }
  }, [userId, showJoinInterface]);

  useEffect(() => {
    if (sessionState?.codeState?.code) {
      setShowCodeRunner(true);
    }
  }, [sessionState?.codeState?.code]);

  const handleManualJoin = async () => {
    try {
      const result = await joinSession(sessionId, userRole);
      initializeSocket();

      if (result && result.userId) {
        toast.success('Joined session successfully!');
      } else {
        throw new Error('Failed to get user ID from session');
      }
    } catch (joinError) {
      toast.error(joinError.message || 'Failed to join session');
    }
  };

  const handleTextSelection = (text, range) => {
    setSelectedText(text);
    setSelectionRange(range);
  };

  const handleConvertToCode = ({ language, code }) => {
    if (!code || !code.trim()) {
      toast.error('Please select some runnable code first');
      return;
    }

    updateCodeState({
      code,
      language,
      selectedText: code,
      executionResults: [],
      lastExecutedAt: null
    });

    setShowCodeRunner(true);
    toast.success(`Code runner ready (${language})`);
  };

  const handleCloseCodeRunner = () => {
    setShowCodeRunner(false);
    setSelectedText('');
    setSelectionRange(null);
  };

  if (showJoinInterface) {
    return (
      <div className="interview-join">
        <div className="interview-join__backdrop" />
        <div className="interview-join__dialog glass-panel">
          <h2>Join interview session</h2>
          <p className="text-muted">Enter your role to continue into session <strong>{sessionId}</strong>.</p>

          <label className="interview-join__field">
            <span>Your role</span>
            <select
              value={userRole}
              onChange={(event) => setUserRole(event.target.value)}
              className="input"
              disabled={isLoading}
            >
              <option value="candidate">Candidate</option>
              <option value="interviewer">Interviewer</option>
            </select>
          </label>

          <div className="interview-join__actions">
            <button
              type="button"
              onClick={handleManualJoin}
              disabled={isLoading}
              className="button"
            >
              {isLoading ? 'Joining…' : 'Join session'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="button button-secondary"
            >
              Go home
            </button>
          </div>

          {error && (
            <div className="interview-join__error">
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isLoading && !userId) {
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
            className="button"
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
              codeState={sessionState.codeState}
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
