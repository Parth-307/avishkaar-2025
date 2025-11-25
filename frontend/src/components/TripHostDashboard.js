import React, { useState, useEffect } from 'react';
import './TripHostDashboard.css';

const TripHostDashboard = ({ user, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [tripData, setTripData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [activities, setActivities] = useState([]);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch trip data on component mount
  useEffect(() => {
    if (user && user.trip_id) {
      fetchTripData();
      fetchStatistics();
      fetchParticipants();
      fetchActivities();
      fetchCurrentActivity();
    }
  }, [user]);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    if (tripData && user) {
      connectWebSocket();
      return () => {
        // Cleanup WebSocket connection
        if (window.socketService) {
          window.socketService.disconnect();
        }
      };
    }
  }, [tripData, user]);

  const fetchTripData = async () => {
    try {
      const response = await fetch(`/api/trips/${user.trip_id}`);
      if (response.ok) {
        const data = await response.json();
        setTripData(data);
      }
    } catch (err) {
      setError('Failed to fetch trip data');
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch(`/api/trips/${user.trip_id}/statistics`);
      if (response.ok) {
        const stats = await response.json();
        setStatistics(stats);
      }
    } catch (err) {
      setError('Failed to fetch statistics');
    }
  };

  const fetchParticipants = async () => {
    try {
      const response = await fetch(`/api/trips/${user.trip_id}/participants`);
      if (response.ok) {
        const data = await response.json();
        setParticipants(data.participants);
      }
    } catch (err) {
      setError('Failed to fetch participants');
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch(`/api/trips/${user.trip_id}/activities`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (err) {
      setError('Failed to fetch activities');
    }
  };

  const fetchCurrentActivity = async () => {
    try {
      const response = await fetch(`/api/trips/${user.trip_id}/current-activity`);
      if (response.ok) {
        const data = await response.json();
        setCurrentActivity(data);
        setLoading(false);
      }
    } catch (err) {
      setError('Failed to fetch current activity');
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    if (window.socketService) {
      window.socketService.connect(`trip-${user.trip_id}`, {
        onConnect: () => {
          setIsConnected(true);
        },
        onDisconnect: () => {
          setIsConnected(false);
        },
        onMessage: (message) => {
          handleWebSocketMessage(message);
        }
      });
    }
  };

  const handleWebSocketMessage = (message) => {
    switch (message.type) {
      case 'participant_joined':
        fetchParticipants();
        fetchStatistics();
        break;
      case 'activity_started':
        setCurrentActivity({
          activity_id: message.activity_id,
          activity: message.activity,
          status: 'activity_ongoing'
        });
        fetchActivities();
        break;
      case 'feedback_submitted':
        // Update current activity feedback count
        if (currentActivity && currentActivity.activity_id === message.activity_id) {
          fetchCurrentActivity();
        }
        fetchStatistics();
        break;
      case 'activity_completed':
        setCurrentActivity(null);
        fetchActivities();
        fetchStatistics();
        break;
      default:
        break;
    }
  };

  const renderOverview = () => (
    <div className="dashboard-overview">
      {/* Connection Status */}
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        <span className="status-indicator"></span>
        {isConnected ? 'Real-time Connected' : 'Disconnected'}
      </div>

      {/* Trip Header */}
      <div className="trip-header">
        <h2>{tripData?.name || 'Trip Dashboard'}</h2>
        <div className="trip-meta">
          <span className="join-code">
            Join Code: <strong>{tripData?.join_code}</strong>
          </span>
          <span className="created-date">
            Created: {new Date(tripData?.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Statistics Grid */}
      {statistics && (
        <div className="statistics-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-number">{statistics.total_participants}</div>
              <div className="stat-label">Total Participants</div>
              <div className="stat-detail">Active: {statistics.active_participants}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <div className="stat-number">{statistics.total_activities}</div>
              <div className="stat-label">Total Activities</div>
              <div className="stat-detail">
                {statistics.completed_activities} completed, {statistics.pending_activities} pending
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⚡</div>
            <div className="stat-content">
              <div className="stat-number">{statistics.average_mood_score?.toFixed(1) || 'N/A'}</div>
              <div className="stat-label">Average Energy</div>
              <div className="stat-detail">Energy Level</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🔄</div>
            <div className="stat-content">
              <div className="stat-number">{currentActivity ? '1' : '0'}</div>
              <div className="stat-label">Active Activity</div>
              <div className="stat-detail">
                {currentActivity?.status === 'waiting_for_votes' ? 'Waiting for votes' : 'In progress'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Activity Alert */}
      {currentActivity && currentActivity.activity && (
        <div className="current-activity-alert">
          <h3>🎯 Current Activity: {currentActivity.activity.title}</h3>
          <div className="activity-status">
            Status: <span className={`status-badge ${currentActivity.status}`}>
              {currentActivity.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          {currentActivity.participants_who_voted && (
            <div className="feedback-progress">
              Feedback: {currentActivity.participants_who_voted.length}/{currentActivity.total_participants} participants
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button 
            className="action-btn primary"
            onClick={() => onNavigate('create-activity')}
          >
            ➕ Create Activity
          </button>
          <button 
            className="action-btn secondary"
            onClick={() => onNavigate('manage-activities')}
          >
            📋 Manage Activities
          </button>
          <button 
            className="action-btn secondary"
            onClick={() => onNavigate('monitoring')}
          >
            📊 Real-time Monitoring
          </button>
          <button 
            className="action-btn secondary"
            onClick={() => onNavigate('trip-settings')}
          >
            ⚙️ Trip Settings
          </button>
        </div>
      </div>
    </div>
  );

  const renderParticipants = () => (
    <div className="participants-section">
      <h3>Trip Participants ({participants.length})</h3>
      <div className="participants-grid">
        {participants.map((participant) => (
          <div key={participant.id} className="participant-card">
            <div className="participant-info">
              <div className="participant-name">{participant.full_name}</div>
              <div className="participant-username">@{participant.username}</div>
            </div>
            <div className="participant-status">
              <span className={`status-badge ${participant.is_admin ? 'admin' : 'participant'}`}>
                {participant.is_admin ? 'Host' : 'Participant'}
              </span>
            </div>
            <div className="participant-since">
              Joined: {new Date(participant.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderActivities = () => (
    <div className="activities-section">
      <div className="activities-header">
        <h3>Trip Activities ({activities.length})</h3>
        <button 
          className="create-activity-btn"
          onClick={() => onNavigate('create-activity')}
        >
          ➕ Create New Activity
        </button>
      </div>
      
      <div className="activities-list">
        {activities.map((activity) => (
          <div key={activity.id} className={`activity-card ${activity.status}`}>
            <div className="activity-header">
              <div className="activity-title">{activity.title}</div>
              <span className={`status-badge ${activity.status}`}>
                {activity.status.toUpperCase()}
              </span>
            </div>
            
            <div className="activity-details">
              <div className="activity-time">
                {new Date(activity.start_time).toLocaleString()}
              </div>
              <div className="activity-location">
                📍 {activity.location_name || 'Location TBD'}
              </div>
              {activity.description && (
                <div className="activity-description">
                  {activity.description}
                </div>
              )}
            </div>

            <div className="activity-actions">
              {activity.status === 'pending' && (
                <>
                  <button 
                    className="start-activity-btn"
                    onClick={() => startActivity(activity.id)}
                  >
                    ▶️ Start Activity
                  </button>
                  <button 
                    className="edit-activity-btn"
                    onClick={() => onNavigate('edit-activity', { activityId: activity.id })}
                  >
                    ✏️ Edit
                  </button>
                </>
              )}
              
              {activity.status === 'active' && (
                <button 
                  className="complete-activity-btn"
                  onClick={() => completeActivity(activity.id)}
                >
                  ✅ Complete Activity
                </button>
              )}

              {activity.is_ai_generated && (
                <span className="ai-badge">🤖 AI Generated</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const startActivity = async (activityId) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'active' }),
      });

      if (response.ok) {
        // Broadcast activity start via WebSocket
        if (window.socketService) {
          window.socketService.send({
            type: 'activity_started',
            activity_id: activityId,
            trip_id: user.trip_id
          });
        }
        
        fetchActivities();
        fetchCurrentActivity();
      }
    } catch (err) {
      setError('Failed to start activity');
    }
  };

  const completeActivity = async (activityId) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' }),
      });

      if (response.ok) {
        // Broadcast activity completion
        if (window.socketService) {
          window.socketService.send({
            type: 'activity_completed',
            activity_id: activityId,
            trip_id: user.trip_id
          });
        }
        
        fetchActivities();
        setCurrentActivity(null);
      }
    } catch (err) {
      setError('Failed to complete activity');
    }
  };

  if (loading) {
    return (
      <div className="trip-host-dashboard loading">
        <div className="loading-spinner">⏳ Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="trip-host-dashboard error">
        <div className="error-message">❌ {error}</div>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="trip-host-dashboard">
      {/* Navigation Tabs */}
      <div className="dashboard-nav">
        <button 
          className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          🏠 Overview
        </button>
        <button 
          className={`nav-tab ${activeTab === 'participants' ? 'active' : ''}`}
          onClick={() => setActiveTab('participants')}
        >
          👥 Participants
        </button>
        <button 
          className={`nav-tab ${activeTab === 'activities' ? 'active' : ''}`}
          onClick={() => setActiveTab('activities')}
        >
          📅 Activities
        </button>
        <button 
          className={`nav-tab ${activeTab === 'monitoring' ? 'active' : ''}`}
          onClick={() => onNavigate('monitoring')}
        >
          📊 Monitoring
        </button>
      </div>

      {/* Content Area */}
      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'participants' && renderParticipants()}
        {activeTab === 'activities' && renderActivities()}
      </div>
    </div>
  );
};

export default TripHostDashboard;