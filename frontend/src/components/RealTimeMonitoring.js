import React, { useState, useEffect } from 'react';
import './RealTimeMonitoring.css';

const RealTimeMonitoring = ({ user, tripData, onNavigate }) => {
  const [activities, setActivities] = useState([]);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [feedbackData, setFeedbackData] = useState(null);
  const [realTimeStats, setRealTimeStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Connect to WebSocket and setup real-time monitoring
  useEffect(() => {
    if (user && user.trip_id) {
      initializeMonitoring();
      setupWebSocketConnection();
      
      // Auto-refresh interval for fallback monitoring
      const refreshInterval = setInterval(() => {
        if (autoRefresh) {
          fetchAllMonitoringData();
        }
      }, 5000); // Refresh every 5 seconds

      return () => {
        clearInterval(refreshInterval);
        if (window.socketService) {
          window.socketService.disconnect();
        }
      };
    }
  }, [user, autoRefresh]);

  const initializeMonitoring = async () => {
    await fetchAllMonitoringData();
    await fetchCurrentActivity();
    await fetchRecentAlerts();
  };

  const setupWebSocketConnection = () => {
    if (window.socketService) {
      window.socketService.connect(`trip-monitoring-${user.trip_id}`, {
        onConnect: () => {
          setIsConnected(true);
          addAlert('Connected to real-time monitoring', 'success');
        },
        onDisconnect: () => {
          setIsConnected(false);
          addAlert('Disconnected from real-time monitoring', 'warning');
        },
        onMessage: (message) => {
          handleRealTimeUpdate(message);
        }
      });
    }
  };

  const fetchAllMonitoringData = async () => {
    try {
      // Fetch activities
      const activitiesResponse = await fetch(`/api/trips/${user.trip_id}/activities`);
      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData);
      }

      // Fetch real-time statistics
      const statsResponse = await fetch(`/api/trips/${user.trip_id}/statistics`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setRealTimeStats(statsData);
      }

      setLastUpdate(new Date());
    } catch (error) {
      addAlert('Failed to fetch monitoring data', 'error');
    }
  };

  const fetchCurrentActivity = async () => {
    try {
      const response = await fetch(`/api/trips/${user.trip_id}/current-activity`);
      if (response.ok) {
        const data = await response.json();
        setCurrentActivity(data);
        
        if (data.activity) {
          fetchActivityFeedback(data.activity.id);
        }
      }
    } catch (error) {
      addAlert('Failed to fetch current activity', 'error');
    }
  };

  const fetchActivityFeedback = async (activityId) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/feedback`);
      if (response.ok) {
        const data = await response.json();
        setFeedbackData(data);
        
        // Check for alerts based on feedback
        analyzeFeedbackForAlerts(data);
      }
    } catch (error) {
      console.error('Failed to fetch activity feedback:', error);
    }
  };

  const fetchRecentAlerts = async () => {
    // For now, we'll generate alerts based on current state
    // In a real implementation, this could fetch from an alerts database
    const recentAlerts = [];
    
    if (realTimeStats?.average_mood_score < 3) {
      recentAlerts.push({
        id: Date.now(),
        type: 'warning',
        title: 'Low Energy Alert',
        message: 'Group energy level is critically low',
        timestamp: new Date(),
        priority: 'high'
      });
    }
    
    setAlerts(recentAlerts);
  };

  const handleRealTimeUpdate = (message) => {
    switch (message.type) {
      case 'feedback_submitted':
        if (currentActivity && message.activity_id === currentActivity.activity_id) {
          fetchActivityFeedback(message.activity_id);
        }
        addAlert(`New feedback received from participant`, 'info');
        break;
        
      case 'participant_joined':
        addAlert(`${message.username} joined the trip`, 'success');
        fetchAllMonitoringData();
        break;
        
      case 'activity_started':
        if (message.activity) {
          setCurrentActivity({
            activity_id: message.activity_id,
            activity: message.activity,
            status: 'activity_ongoing',
            total_participants: realTimeStats?.total_participants || 0,
            participants_who_voted: []
          });
          fetchActivityFeedback(message.activity_id);
          addAlert(`Activity started: ${message.activity.title}`, 'success');
        }
        break;
        
      case 'activity_completed':
        setCurrentActivity(null);
        setFeedbackData(null);
        addAlert(`Activity completed: ${message.activity_title}`, 'info');
        fetchAllMonitoringData();
        break;
        
      case 'fatigue_alert':
        addAlert(message.message, 'warning');
        break;
        
      case 'pivot_suggested':
        addAlert(`AI suggests pivot: ${message.reason}`, 'info');
        break;
        
      default:
        break;
    }
  };

  const analyzeFeedbackForAlerts = (feedbackData) => {
    if (!feedbackData || !feedbackData.fatigue_analysis) return;

    const { overall_score, level } = feedbackData.fatigue_analysis;
    
    if (overall_score > 75) {
      addAlert(
        `CRITICAL: Group fatigue level is ${level} (${overall_score.toFixed(1)}%)`,
        'critical',
        'Immediate intervention required - consider ending current activity or pivot'
      );
    } else if (overall_score > 60) {
      addAlert(
        `HIGH: Group fatigue level is ${level} (${overall_score.toFixed(1)}%)`,
        'warning',
        'Consider AI optimization or activity pivot'
      );
    }

    // Check individual categories for specific alerts
    const { average_scores } = feedbackData;
    if (average_scores.sick < 3) {
      addAlert('Health Alert', 'critical', 'Participants reporting feeling sick - consider medical check');
    }
    
    if (average_scores.hungry > 4) {
      addAlert('Hunger Alert', 'warning', 'Participants are very hungry - schedule food break');
    }
    
    if (average_scores.tired > 4) {
      addAlert('Fatigue Alert', 'warning', 'Participants are very tired - consider rest activity');
    }
  };

  const addAlert = (title, type, message = null) => {
    const newAlert = {
      id: Date.now(),
      type, // 'success', 'warning', 'error', 'critical', 'info'
      title,
      message,
      timestamp: new Date(),
      priority: type === 'critical' ? 'high' : type === 'warning' ? 'medium' : 'low'
    };
    
    setAlerts(prev => [newAlert, ...prev.slice(0, 9)]); // Keep only last 10 alerts
  };

  const dismissAlert = (alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const triggerAIPivot = async () => {
    if (!currentActivity || !realTimeStats) return;

    try {
      const response = await fetch(`/api/trips/${user.trip_id}/pivot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: user.id,
          user_lat: 0, // Get from user location
          user_lng: 0, // Get from user location
          decision: 'PIVOT_WITH_AI',
          reason: 'Manual AI optimization trigger'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        addAlert('AI Pivot Triggered', 'success', result.message);
        fetchAllMonitoringData();
      } else {
        addAlert('AI Pivot Failed', 'error', 'Unable to trigger AI optimization');
      }
    } catch (error) {
      addAlert('AI Pivot Error', 'error', 'Failed to connect to AI service');
    }
  };

  const forceContinue = async () => {
    if (!currentActivity) return;

    try {
      const response = await fetch(`/api/trips/${user.trip_id}/pivot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: user.id,
          user_lat: 0,
          user_lng: 0,
          decision: 'FORCE_CONTINUE',
          reason: 'Manual continue decision'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        addAlert('Force Continue', 'info', result.message);
      } else {
        addAlert('Continue Failed', 'error', 'Unable to force continue');
      }
    } catch (error) {
      addAlert('Continue Error', 'error', 'Failed to force continue');
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'success': return '✅';
      default: return 'ℹ️';
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'error': return '#dc2626';
      case 'success': return '#22c55e';
      default: return '#3b82f6';
    }
  };

  return (
    <div className="real-time-monitoring">
      {/* Header */}
      <div className="monitoring-header">
        <div className="header-left">
          <h1>Real-time Monitoring</h1>
          <div className="trip-info">
            <span className="trip-name">{tripData?.name}</span>
            <span className="join-code">Code: {tripData?.join_code}</span>
          </div>
        </div>
        
        <div className="header-right">
          <div className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            <div className="status-dot"></div>
            {isConnected ? 'Real-time Active' : 'Disconnected'}
          </div>
          
          <div className="last-update">
            Last Update: {lastUpdate.toLocaleTimeString()}
          </div>
          
          <button 
            className={`refresh-btn ${autoRefresh ? 'auto' : 'manual'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '🔄 Auto Refresh' : '⏸️ Auto Off'}
          </button>
        </div>
      </div>

      {/* Alerts Panel */}
      {alerts.length > 0 && (
        <div className="alerts-panel">
          <div className="alerts-header">
            <h3>🚨 Active Alerts ({alerts.length})</h3>
            <button 
              className="clear-all-btn"
              onClick={() => setAlerts([])}
            >
              Clear All
            </button>
          </div>
          
          <div className="alerts-list">
            {alerts.map(alert => (
              <div 
                key={alert.id} 
                className={`alert-item ${alert.type}`}
                style={{ borderLeftColor: getAlertColor(alert.type) }}
              >
                <div className="alert-content">
                  <div className="alert-title">
                    {getAlertIcon(alert.type)} {alert.title}
                    <span className="alert-time">
                      {alert.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  {alert.message && (
                    <div className="alert-message">{alert.message}</div>
                  )}
                </div>
                
                <button 
                  className="dismiss-btn"
                  onClick={() => dismissAlert(alert.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Activity Monitor */}
      {currentActivity && currentActivity.activity && (
        <div className="current-activity-monitor">
          <div className="monitor-header">
            <h2>🎯 Current Activity Monitoring</h2>
            <div className="activity-actions">
              <button 
                className="action-btn primary"
                onClick={triggerAIPivot}
              >
                🤖 Trigger AI Pivot
              </button>
              <button 
                className="action-btn secondary"
                onClick={forceContinue}
              >
                ▶️ Force Continue
              </button>
            </div>
          </div>

          <div className="activity-details">
            <div className="activity-info">
              <h3>{currentActivity.activity.title}</h3>
              <div className="activity-meta">
                <span className="activity-type">
                  Type: {currentActivity.activity.type}
                </span>
                <span className="activity-time">
                  Started: {new Date(currentActivity.activity.start_time).toLocaleTimeString()}
                </span>
                {currentActivity.activity.location_name && (
                  <span className="activity-location">
                    📍 {currentActivity.activity.location_name}
                  </span>
                )}
              </div>
            </div>

            {/* Feedback Monitoring */}
            {feedbackData && (
              <div className="feedback-monitor">
                <h4>📊 Live Feedback Analysis</h4>
                
                <div className="feedback-stats">
                  <div className="stat-item">
                    <span className="stat-label">Participants Responded:</span>
                    <span className="stat-value">
                      {feedbackData.feedbacks_submitted}/{feedbackData.total_participants}
                    </span>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${(feedbackData.feedbacks_submitted / feedbackData.total_participants) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="stat-item">
                    <span className="stat-label">Fatigue Level:</span>
                    <span className={`stat-value fatigue-${feedbackData.fatigue_analysis?.level?.toLowerCase()}`}>
                      {feedbackData.fatigue_analysis?.level} 
                      ({feedbackData.fatigue_analysis?.overall_score?.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="category-breakdown">
                  {feedbackData.average_scores && Object.entries(feedbackData.average_scores).map(([category, score]) => (
                    <div key={category} className="category-item">
                      <div className="category-label">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </div>
                      <div className="category-score">
                        <div className="score-bar">
                          <div 
                            className="score-fill"
                            style={{ width: `${(score / 5) * 100}%` }}
                          ></div>
                        </div>
                        <span className="score-value">{score.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recommendations */}
                {feedbackData.recommendations && feedbackData.recommendations.length > 0 && (
                  <div className="recommendations">
                    <h5>💡 AI Recommendations</h5>
                    {feedbackData.recommendations.map((rec, index) => (
                      <div key={index} className={`recommendation ${rec.type}`}>
                        <span className="rec-message">{rec.message}</span>
                        <span className="rec-action">{rec.action}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Active Activity */}
      {!currentActivity || !currentActivity.activity && (
        <div className="no-active-activity">
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <h3>No Active Activity</h3>
            <p>Start an activity to begin real-time monitoring</p>
            <button 
              className="start-monitoring-btn"
              onClick={() => onNavigate('activities')}
            >
              Go to Activities
            </button>
          </div>
        </div>
      )}

      {/* Real-time Statistics */}
      {realTimeStats && (
        <div className="statistics-panel">
          <h3>📈 Trip Statistics</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-number">{realTimeStats.total_participants}</div>
                <div className="stat-label">Total Participants</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-content">
                <div className="stat-number">{realTimeStats.completed_activities}</div>
                <div className="stat-label">Completed Activities</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⚡</div>
              <div className="stat-content">
                <div className="stat-number">
                  {realTimeStats.average_mood_score?.toFixed(1) || 'N/A'}
                </div>
                <div className="stat-label">Avg Energy Level</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🔄</div>
              <div className="stat-content">
                <div className="stat-number">{realTimeStats.pending_activities}</div>
                <div className="stat-label">Pending Activities</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeMonitoring;