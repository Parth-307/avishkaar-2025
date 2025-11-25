import React, { useState, useEffect } from 'react';
import './ConnectionStatus.css';

const ConnectionStatus = ({ connectionStatus, reconnectAttempts, maxReconnectAttempts, participantsCount }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    setLastUpdate(new Date());
  }, [connectionStatus, participantsCount]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return '#10b981'; // Green
      case 'connecting':
        return '#f59e0b'; // Yellow
      case 'reconnecting':
        return '#f59e0b'; // Yellow
      case 'error':
        return '#ef4444'; // Red
      case 'failed':
        return '#dc2626'; // Dark red
      default:
        return '#6b7280'; // Gray
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return '🟢';
      case 'connecting':
      case 'reconnecting':
        return '🟡';
      case 'error':
      case 'failed':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Live Updates Active';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return `Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`;
      case 'error':
        return 'Connection Error';
      case 'failed':
        return 'Connection Failed';
      default:
        return 'Offline';
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="connection-status">
      <div 
        className="status-indicator"
        style={{ backgroundColor: getStatusColor() }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="status-icon">{getStatusIcon()}</span>
        <span className="status-text">{getStatusText()}</span>
        {participantsCount > 0 && (
          <span className="participants-count">{participantsCount} online</span>
        )}
      </div>

      {isExpanded && (
        <div className="status-details">
          <div className="detail-row">
            <span className="detail-label">Connection Status:</span>
            <span className="detail-value">{connectionStatus}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">Participants Online:</span>
            <span className="detail-value">{participantsCount}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">Reconnection Attempts:</span>
            <span className="detail-value">{reconnectAttempts}/{maxReconnectAttempts}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">Last Update:</span>
            <span className="detail-value">{formatTime(lastUpdate)}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">Real-time Features:</span>
            <div className="features-list">
              <span className="feature-tag active">Live Feedback</span>
              <span className="feature-tag active">Activity Updates</span>
              <span className="feature-tag active">Participant Status</span>
              <span className="feature-tag active">Admin Decisions</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;