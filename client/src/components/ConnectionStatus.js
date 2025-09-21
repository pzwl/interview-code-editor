import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

function ConnectionStatus({ isConnected }) {
  return (
    <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
      {isConnected ? (
        <>
          <Wifi className="w-4 h-4" />
          <span>Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Disconnected</span>
        </>
      )}

      <style jsx>{`
        .connection-status {
          position: fixed;
          top: 80px;
          right: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
          z-index: 1000;
          transition: all 0.3s ease;
        }

        .connection-status.connected {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .connection-status.disconnected {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
          100% {
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .connection-status {
            top: 140px;
            right: 0.5rem;
            font-size: 0.75rem;
            padding: 0.375rem 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}

export default ConnectionStatus;