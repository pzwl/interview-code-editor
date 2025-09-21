import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import './ConnectionStatus.css';

function ConnectionStatus({ isConnected }) {
  return (
    <div className={`connection-status ${isConnected ? 'is-connected' : 'is-disconnected'}`}>
      <span className="connection-status__icon" aria-hidden="true">
        {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
      </span>
      <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
    </div>
  );
}

export default ConnectionStatus;
