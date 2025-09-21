import React from 'react';
import { Copy, Users, Crown, User } from 'lucide-react';
import toast from 'react-hot-toast';

function SessionHeader({ sessionId, userRole, users = [] }) {
  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    toast.success('Session ID copied to clipboard');
  };

  const getUserIcon = (role) => {
    return role === 'interviewer' ? <Crown className="w-4 h-4" /> : <User className="w-4 h-4" />;
  };

  const getUserColor = (role) => {
    return role === 'interviewer' ? 'text-purple-600' : 'text-blue-600';
  };

  return (
    <header className="session-header">
      <div className="session-info">
        <div className="session-id-container">
          <span className="session-label">Session ID:</span>
          <code className="session-id">{sessionId}</code>
          <button 
            onClick={copySessionId}
            className="copy-button"
            title="Copy Session ID"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        
        <div className="user-info">
          <div className={`current-user ${getUserColor(userRole)}`}>
            {getUserIcon(userRole)}
            <span>You ({userRole})</span>
          </div>
        </div>
      </div>

      <div className="users-list">
        <Users className="w-4 h-4 text-gray-500" />
        <span className="users-count">{users.length}/2</span>
        <div className="users-display">
          {users.map((user) => (
            <div 
              key={user.id} 
              className={`user-badge ${getUserColor(user.role)} ${!user.active ? 'inactive' : ''}`}
              title={`${user.role}${!user.active ? ' (offline)' : ''}`}
            >
              {getUserIcon(user.role)}
              <span>{user.role}</span>
              {!user.active && <span className="offline-indicator">●</span>}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: white;
          border-bottom: 1px solid #e9ecef;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .session-info {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .session-id-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .session-label {
          font-weight: 500;
          color: #6c757d;
        }

        .session-id {
          background: #f8f9fa;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.875rem;
          border: 1px solid #e9ecef;
        }

        .copy-button {
          padding: 0.25rem;
          border: none;
          background: transparent;
          color: #6c757d;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .copy-button:hover {
          background: #f8f9fa;
          color: #495057;
        }

        .user-info {
          display: flex;
          align-items: center;
        }

        .current-user {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
        }

        .users-list {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .users-count {
          font-weight: 500;
          color: #6c757d;
        }

        .users-display {
          display: flex;
          gap: 0.5rem;
        }

        .user-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
          transition: opacity 0.2s;
        }

        .user-badge.inactive {
          opacity: 0.5;
        }

        .offline-indicator {
          color: #dc3545;
          margin-left: 0.25rem;
        }

        @media (max-width: 768px) {
          .session-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .session-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }
      `}</style>
    </header>
  );
}

export default SessionHeader;