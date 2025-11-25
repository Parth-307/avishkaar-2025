// ParticipantExperience - Optimized experience for participants with offline support and accessibility
import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useActivityStatus } from '../hooks/useActivityStatus';
import ActiveActivity from '../components/ActiveActivity';
import VotingInterface from '../components/VotingInterface';
import { submitFeedback } from '../services/feedbackApi';
import { defaultErrorHandler } from '../utils/errorHandling';

const ParticipantExperience = ({ 
  trip, 
  userId, 
  isHost = false,
  onActivityChange,
  onFeedbackSubmitted
}) => {
  const [currentActivity, setCurrentActivity] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [userPreferences, setUserPreferences] = useState({
    enableNotifications: true,
    autoSubmit: false,
    reducedMotion: false,
    highContrast: false
  });

  // WebSocket connection for real-time updates
  const webSocket = useWebSocket({
    tripId: trip?.id,
    userId,
    autoReconnect: true,
    enableHeartbeat: true,
    onMessage: handleWebSocketMessage,
    onConnect: () => console.log('Connected to real-time updates'),
    onDisconnect: () => console.log('Disconnected from real-time updates'),
    onError: (error) => console.error('WebSocket error:', error)
  });

  // Activity status management
  const activityStatus = useActivityStatus(trip?.id, {
    userId,
    isHost,
    autoTransition: false, // Manual control for participants
    onStatusChange: handleActivityStatusChange,
    onActivityComplete: handleActivityComplete
  });

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load user preferences
    loadUserPreferences();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load user preferences from localStorage
  const loadUserPreferences = () => {
    try {
      const saved = localStorage.getItem('tripplanner_user_preferences');
      if (saved) {
        setUserPreferences(JSON.parse(saved));
      }
    } catch (error) {
      console.warn('Error loading user preferences:', error);
    }
  };

  // Save user preferences to localStorage
  const saveUserPreferences = (newPreferences) => {
    try {
      const updated = { ...userPreferences, ...newPreferences };
      setUserPreferences(updated);
      localStorage.setItem('tripplanner_user_preferences', JSON.stringify(updated));
    } catch (error) {
      console.warn('Error saving user preferences:', error);
    }
  };

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message) => {
    switch (message.type) {
      case 'activity_update':
        if (message.activity) {
          setCurrentActivity(message.activity);
          if (onActivityChange) {
            onActivityChange(message.activity);
          }
        }
        break;
        
      case 'feedback_request':
        if (message.activity_id === currentActivity?.id) {
          // Trigger feedback modal or notification
          if (userPreferences.enableNotifications && 'Notification' in window) {
            requestNotificationPermission();
            showFeedbackNotification();
          }
        }
        break;
        
      case 'trip_update':
        // Handle trip-level updates
        break;
        
      default:
        console.log('Unhandled message type:', message.type);
    }
  }, [currentActivity, userPreferences, onActivityChange]);

  // Handle activity status changes
  const handleActivityStatusChange = useCallback((status, data) => {
    console.log('Activity status changed:', status, data);
    
    if (status === 'active' && data.activity) {
      setCurrentActivity(data.activity);
    }
  }, []);

  // Handle activity completion
  const handleActivityComplete = useCallback((data) => {
    console.log('Activity completed:', data);
    setCurrentActivity(null);
  }, []);

  // Process offline queue when coming back online
  const processOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    
    console.log(`Processing ${offlineQueue.length} offline actions`);
    
    const processedItems = [];
    const failedItems = [];
    
    for (const item of offlineQueue) {
      try {
        switch (item.type) {
          case 'feedback':
            await submitFeedback(item.data);
            processedItems.push(item.id);
            break;
          case 'status_update':
            // Handle status updates
            processedItems.push(item.id);
            break;
          default:
            console.warn('Unknown offline action type:', item.type);
            failedItems.push(item.id);
        }
      } catch (error) {
        console.error('Error processing offline action:', error);
        failedItems.push(item.id);
      }
    }
    
    // Remove processed items from queue
    setOfflineQueue(prev => prev.filter(item => 
      !processedItems.includes(item.id) && !failedItems.includes(item.id)
    ));
    
    console.log(`Processed ${processedItems.length} items, ${failedItems.length} failed`);
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  // Show feedback notification
  const showFeedbackNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Feedback Requested', {
        body: 'Please share your feedback for the current activity',
        icon: '/icon-192.png',
        badge: '/badge-72.png'
      });
    }
  };

  // Handle feedback submission with offline support
  const handleFeedbackSubmission = async (feedbackData) => {
    try {
      if (isOnline) {
        const result = await submitFeedback({
          activityId: currentActivity?.id,
          ...feedbackData
        });
        
        if (result.success) {
          if (onFeedbackSubmitted) {
            onFeedbackSubmitted(result.data);
          }
        } else {
          throw new Error(result.message);
        }
      } else {
        // Queue for later processing
        const offlineItem = {
          id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'feedback',
          data: {
            activityId: currentActivity?.id,
            ...feedbackData,
            queuedAt: Date.now()
          }
        };
        
        setOfflineQueue(prev => [...prev, offlineItem]);
        
        // Show offline feedback message
        if (onFeedbackSubmitted) {
          onFeedbackSubmitted({
            id: offlineItem.id,
            offline: true,
            message: 'Feedback saved offline and will be submitted when you\'re back online'
          });
        }
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      const { error: appError } = defaultErrorHandler(error, {
        context: 'ParticipantExperience.feedbackSubmission',
        activityId: currentActivity?.id
      });
      
      throw appError;
    }
  };

  // Accessibility: Handle keyboard navigation
  const handleKeyDown = useCallback((event) => {
    // ESC key to close modals or return to previous state
    if (event.key === 'Escape') {
      // Handle escape key logic
    }
    
    // Space or Enter to activate focused elements
    if (event.key === ' ' || event.key === 'Enter') {
      if (document.activeElement?.getAttribute('role') === 'button') {
        document.activeElement.click();
      }
    }
  }, []);

  // Set up keyboard navigation
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Get connection status message
  const getConnectionStatus = () => {
    if (webSocket.isConnected) {
      return { 
        status: 'connected', 
        message: 'Connected', 
        color: '#10B981',
        icon: '🟢'
      };
    } else if (webSocket.isConnecting) {
      return { 
        status: 'connecting', 
        message: 'Connecting...', 
        color: '#F59E0B',
        icon: '🟡'
      };
    } else if (isOnline) {
      return { 
        status: 'disconnected', 
        message: 'Disconnected', 
        color: '#EF4444',
        icon: '🔴'
      };
    } else {
      return { 
        status: 'offline', 
        message: 'Offline', 
        color: '#6B7280',
        icon: '⚫'
      };
    }
  };

  // Handle preferences change
  const updatePreference = (key, value) => {
    saveUserPreferences({ [key]: value });
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className={`participant-experience ${userPreferences.highContrast ? 'high-contrast' : ''} ${userPreferences.reducedMotion ? 'reduced-motion' : ''}`}>
      {/* Connection Status Bar */}
      <div className="connection-status-bar">
        <div className="status-indicator" style={{ color: connectionStatus.color }}>
          <span className="status-icon">{connectionStatus.icon}</span>
          <span className="status-text">{connectionStatus.message}</span>
        </div>
        
        {offlineQueue.length > 0 && (
          <div className="offline-indicator">
            <span className="offline-icon">📥</span>
            <span>{offlineQueue.length} offline actions</span>
          </div>
        )}
        
        {/* User Preferences Toggle */}
        <div className="preferences-toggle">
          <button 
            className="preferences-btn"
            onClick={() => {/* Toggle preferences panel */}}
            aria-label="Toggle preferences"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Main Activity Display */}
      <div className="activity-container">
        {currentActivity ? (
          <>
            {/* Activity Information */}
            <ActiveActivity
              activity={currentActivity}
              trip={trip}
              participants={activityStatus.participants}
              onActivityComplete={activityStatus.completeActivity}
              isHost={isHost}
              isActive={activityStatus.isActive}
              participantResponses={activityStatus.responseCount}
              totalParticipants={activityStatus.totalParticipants}
            />
            
            {/* Voting Interface for Participants */}
            {!isHost && (
              <VotingInterface
                activity={currentActivity}
                trip={trip}
                onFeedbackSubmitted={handleFeedbackSubmission}
                isVisible={activityStatus.isActive}
                participantCount={activityStatus.totalParticipants}
                respondedParticipants={activityStatus.responseCount}
              />
            )}
            
            {/* Host Controls */}
            {isHost && (
              <div className="host-controls">
                <h4>🎮 Host Controls</h4>
                <div className="control-buttons">
                  <button 
                    className="btn-secondary"
                    onClick={() => activityStatus.completeActivity('manual')}
                    disabled={!activityStatus.canComplete}
                  >
                    ✓ Complete Activity
                  </button>
                  
                  <button 
                    className="btn-secondary"
                    onClick={() => activityStatus.skipActivity('manual')}
                    disabled={!activityStatus.canSkip}
                  >
                    ⏭️ Skip Activity
                  </button>
                  
                  <button 
                    className="btn-primary"
                    onClick={() => webSocket.sendMessage({
                      type: 'request_feedback',
                      activity_id: currentActivity.id
                    })}
                  >
                    📝 Request Feedback
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="no-activity">
            <div className="no-activity-content">
              <div className="no-activity-icon">📅</div>
              <h3>No Active Activity</h3>
              <p>Waiting for the next activity to begin...</p>
              
              {isHost && (
                <button 
                  className="btn-primary"
                  onClick={() => {/* Navigate to activity creation */}}
                >
                  ➕ Start New Activity
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Preferences Panel (Hidden by default) */}
      <div className="preferences-panel" style={{ display: 'none' }}>
        <h4>⚙️ Preferences</h4>
        
        <div className="preference-item">
          <label>
            <input
              type="checkbox"
              checked={userPreferences.enableNotifications}
              onChange={(e) => updatePreference('enableNotifications', e.target.checked)}
            />
            Enable notifications
          </label>
        </div>
        
        <div className="preference-item">
          <label>
            <input
              type="checkbox"
              checked={userPreferences.autoSubmit}
              onChange={(e) => updatePreference('autoSubmit', e.target.checked)}
            />
            Auto-submit feedback
          </label>
        </div>
        
        <div className="preference-item">
          <label>
            <input
              type="checkbox"
              checked={userPreferences.reducedMotion}
              onChange={(e) => updatePreference('reducedMotion', e.target.checked)}
            />
            Reduced motion
          </label>
        </div>
        
        <div className="preference-item">
          <label>
            <input
              type="checkbox"
              checked={userPreferences.highContrast}
              onChange={(e) => updatePreference('highContrast', e.target.checked)}
            />
            High contrast mode
          </label>
        </div>
      </div>

      {/* Accessibility Announcements */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        id="accessibility-announcements"
      >
        {/* Screen reader announcements will be inserted here */}
      </div>
    </div>
  );
};

export default ParticipantExperience;