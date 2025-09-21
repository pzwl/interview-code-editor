import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { useSocket } from '../contexts/SocketContext';
import { Users, Video, Code2, Shield, ArrowRight, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';
import './HomePage.css';

const FEATURE_CARDS = [
  {
    title: 'Real-time collaboration',
    description: 'Latency-free text editing with synced cursors, selections, and code execution results.',
    icon: <Users size={22} />
  },
  {
    title: 'Code ready workspace',
    description: 'Batteries-included Monaco editor with multiple languages, test cases, and execution sandbox.',
    icon: <Code2 size={22} />
  },
  {
    title: 'Built for interviews',
    description: 'Session roles, connection health, and exportable transcripts keep interviews focused.',
    icon: <Shield size={22} />
  },
  {
    title: 'Video friendly',
    description: 'Designed to sit comfortably beside your favourite video platform for shared context.',
    icon: <Video size={22} />
  }
];

function HomePage() {
  const [sessionId, setSessionId] = useState('');
  const [createRole, setCreateRole] = useState('interviewer');
  const [joinRole, setJoinRole] = useState('candidate');
  const navigate = useNavigate();
  const { createSession, joinSession, isLoading, error } = useSession();
  const { initializeSocket } = useSocket();

  const handleCreateSession = async () => {
    try {
      const result = await createSession(createRole);

      localStorage.setItem('sessionFlow', 'create');
      localStorage.setItem('userRole', createRole);
      localStorage.setItem('currentSessionId', result.sessionId);
      if (result.userId) {
        localStorage.setItem('currentUserId', result.userId);
      } else {
        localStorage.removeItem('currentUserId');
      }

      initializeSocket();
      toast.success('Session created successfully');
      navigate(`/interview/${result.sessionId}`);
    } catch (createError) {
      toast.error('Failed to create session');
    }
  };

  const handleJoinSession = async () => {
    if (!sessionId.trim()) {
      toast.error('Please enter a session ID');
      return;
    }

    if (isLoading) {
      return;
    }

    const currentSessionId = localStorage.getItem('currentSessionId');
    if (currentSessionId === sessionId.trim()) {
      toast.error('You cannot join your own session. Share this session ID with another person.');
      return;
    }

    try {
      const result = await joinSession(sessionId.trim(), joinRole);
      localStorage.setItem('sessionFlow', 'join');
      localStorage.setItem('userRole', joinRole);
      localStorage.setItem('currentUserId', result.userId);

      initializeSocket();
      toast.success('Joined session successfully');
      navigate(`/interview/${sessionId.trim()}`);
    } catch (joinError) {
      toast.error(joinError.message || 'Failed to join session');
    }
  };

  return (
    <div className="home">
      <div className="home__backdrop" />

      <header className="home__nav container">
        <div className="home__brand">
          <Sparkles size={24} />
          <span>Intervue Studio</span>
        </div>
        <div className="home__actions">
          <ThemeToggle />
        </div>
      </header>

      <main className="home__content container">
        <section className="home__hero glass-panel">
          <div className="home__hero-content">
            <p className="home__eyebrow">High Signal Interviews</p>
            <h1>Run technical interviews that feel collaborative and natural.</h1>
            <p className="home__subtitle">
              Share instant workspaces, follow every keystroke, and evaluate code in seconds. Designed for interviewers who care about experience and insight.
            </p>
            <div className="home__cta">
              <button
                onClick={handleCreateSession}
                disabled={isLoading}
                className="button"
              >
                Start a session
                <ArrowRight size={18} />
              </button>
              <button
                onClick={() => {
                  const form = document.getElementById('join-card');
                  if (form) {
                    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="button button-secondary"
              >
                Join with code
              </button>
            </div>
            <div className="home__meta">
              <div>
                <span className="home__meta-value"><Users size={16} /> Two roles</span>
                <p>Interviewer & candidate flows built-in.</p>
              </div>
              <div>
                <span className="home__meta-value"><Code2 size={16} /> Monaco editor</span>
                <p>Languages, tests, execution out of the box.</p>
              </div>
              <div>
                <span className="home__meta-value"><Shield size={16} /> Secure by design</span>
                <p>Ephemeral sessions with inactivity cleanup.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="home__forms">
          <div className="home__card glass-panel">
            <div className="home__card-header">
              <div className="home__card-icon home__card-icon--create">
                <Sparkles size={18} />
              </div>
              <div>
                <h3>Create a fresh session</h3>
                <p>Generate a secure workspace and invite your candidate instantly.</p>
              </div>
            </div>

            <div className="home__field">
              <label>Your role</label>
              <select
                value={createRole}
                onChange={(event) => setCreateRole(event.target.value)}
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
              className="button"
            >
              {isLoading ? 'Creating...' : 'Create session'}
            </button>
          </div>

          <div className="home__card glass-panel" id="join-card">
            <div className="home__card-header">
              <div className="home__card-icon home__card-icon--join">
                <Users size={18} />
              </div>
              <div>
                <h3>Join with a session code</h3>
                <p>Hop directly into the interviewer’s workspace with the code they shared.</p>
              </div>
            </div>

            <div className="home__field">
              <label>Session ID</label>
              <input
                type="text"
                value={sessionId}
                onChange={(event) => setSessionId(event.target.value)}
                placeholder="e.g. 4f3b9c28-..."
                className="input"
                disabled={isLoading}
              />
            </div>

            <div className="home__field">
              <label>Your role</label>
              <select
                value={joinRole}
                onChange={(event) => setJoinRole(event.target.value)}
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
              className="button"
            >
              {isLoading ? 'Joining…' : 'Join session'}
            </button>
          </div>
        </section>

        {error && (
          <div className="home__error glass-panel">
            <p>{error}</p>
          </div>
        )}

        <section className="home__features">
          {FEATURE_CARDS.map((feature) => (
            <article key={feature.title} className="home__feature-card glass-panel">
              <div className="home__feature-icon">{feature.icon}</div>
              <h4>{feature.title}</h4>
              <p>{feature.description}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

export default HomePage;

