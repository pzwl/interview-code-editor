import React from 'react';
import { Copy, Users, Crown, User } from 'lucide-react';
import toast from 'react-hot-toast';
import ThemeToggle from './ThemeToggle';
import './SessionHeader.css';

function SessionHeader({ sessionId, userRole, users = [] }) {
  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    toast.success('Session ID copied to clipboard');
  };

  const getUserIcon = (role) => (role === 'interviewer' ? <Crown size={16} /> : <User size={16} />);

  return (
    <header className="session-header glass-panel">
      <div className="session-header__left">
        <div className="session-header__id">
          <span className="session-header__label">Session</span>
          <code>{sessionId}</code>
          <button type="button" onClick={copySessionId} className="session-header__copy" title="Copy session ID">
            <Copy size={16} />
          </button>
        </div>

        <div className="session-header__badge session-header__badge--current">
          {getUserIcon(userRole)}
          <span>You · {userRole}</span>
        </div>
      </div>

      <div className="session-header__right">
        <div className="session-header__participants">
          <div className="session-header__count">
            <Users size={16} />
            <span>{users.length}/2</span>
          </div>
          <div className="session-header__list">
            {users.map((user) => (
              <span
                key={user.id}
                className={`session-header__badge ${user.role} ${user.active ? '' : 'is-inactive'}`.trim()}
                title={`${user.role}${user.active ? '' : ' (offline)'}`}
              >
                {getUserIcon(user.role)}
                <span className="session-header__badge-label">{user.role}</span>
                {!user.active && <span className="session-header__badge-indicator">Offline</span>}
              </span>
            ))}
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}

export default SessionHeader;
