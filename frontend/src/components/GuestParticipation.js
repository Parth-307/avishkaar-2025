import React, { useState, useEffect } from 'react';
import './GuestParticipation.css';

const GuestParticipation = ({ user, tripData, onNavigate }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [tripOverview, setTripOverview] = useState(null);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [participantStatus, setParticipantStatus] = useState(null);
  const [upcomingActivities, setUpcomingActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  // Load participant data and trip information
  useEffect(() => {
    if (user && user.trip_id) {
      loadParticipantData();
      checkOnboardingStatus();
    }
  }, [user]);

  // Show welcome message on first visit
  useEffect(() => {
    if (!hasCompletedOnboarding) {
      setShowWelcome(true);
    }
  }, [hasCompletedOnboarding]);

  const loadParticipantData = async () => {
    try {
      setIsLoading(true);

      // Fetch trip overview
      const tripResponse = await fetch(`/api/trips/${user.trip_id}`);
      if (tripResponse.ok) {
        const trip = await tripResponse.json();
        setTripOverview(trip);
      }

      // Fetch current activity
      const activityResponse = await fetch(`/api/trips/${user.trip_id}/current-activity`);
      if (activityResponse.ok) {
        const activity = await activityResponse.json();
        setCurrentActivity(activity);
      }

      // Fetch upcoming activities
      const activitiesResponse = await fetch(`/api/trips/${user.trip_id}/activities?status=pending`);
      if (activitiesResponse.ok) {
        const activities = await activitiesResponse.json();
        setUpcomingActivities(activities.slice(0, 3)); // Show next 3 activities
      }

      // Initialize participant status
      setParticipantStatus({
        role: user.is_admin ? 'host' : 'participant',
        joinedAt: new Date().toISOString(),
        completedSteps: [],
        preferences: {
          notifications: true,
          locationSharing: false,
          activityReminders: true
        }
      });

    } catch (error) {
      console.error('Failed to load participant data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkOnboardingStatus = () => {
    const completed = localStorage.getItem(`onboarding_completed_${user.trip_id}_${user.id}`);
    setHasCompletedOnboarding(completed === 'true');
  };

  const completeOnboarding = () => {
    localStorage.setItem(`onboarding_completed_${user.trip_id}_${user.id}`, 'true');
    setHasCompletedOnboarding(true);
    setShowWelcome(false);
    setCurrentStep(2);
  };

  const skipOnboarding = () => {
    localStorage.setItem(`onboarding_skipped_${user.trip_id}_${user.id}`, 'true');
    setHasCompletedOnboarding(true);
    setShowWelcome(false);
    setCurrentStep(2);
  };

  const completeStep = (stepId) => {
    setParticipantStatus(prev => ({
      ...prev,
      completedSteps: [...prev.completedSteps, stepId]
    }));

    // Move to next step
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const renderWelcomeStep = () => (
    <div className="welcome-step">
      <div className="welcome-content">
        <div className="welcome-icon">🎉</div>
        <h2>{getWelcomeMessage()}, {user?.full_name?.split(' ')[0]}!</h2>
        <p className="welcome-message">
          Welcome to <strong>{tripOverview?.name}</strong>! We're excited to have you join our trip.
        </p>
        
        <div className="trip-highlights">
          <div className="highlight-item">
            <span className="highlight-icon">👥</span>
            <span>{participantStatus?.role === 'host' ? 'You\'re the host' : 'Join fellow adventurers'}</span>
          </div>
          <div className="highlight-item">
            <span className="highlight-icon">🎯</span>
            <span>{upcomingActivities.length} upcoming activities</span>
          </div>
          <div className="highlight-item">
            <span className="highlight-icon">📱</span>
            <span>Real-time updates and voting</span>
          </div>
        </div>

        <div className="welcome-actions">
          <button 
            className="btn-primary"
            onClick={() => setCurrentStep(2)}
          >
            Let's Get Started
          </button>
          <button 
            className="btn-secondary"
            onClick={skipOnboarding}
          >
            Skip Tutorial
          </button>
        </div>
      </div>
    </div>
  );

  const renderTripOverviewStep = () => (
    <div className="overview-step">
      <div className="step-header">
        <h2>Trip Overview</h2>
        <p>Here's what you need to know about this trip</p>
      </div>

      <div className="overview-content">
        <div className="trip-info-card">
          <div className="trip-basic-info">
            <h3>{tripOverview?.name}</h3>
            <div className="trip-meta">
              <span className="meta-item">
                <span className="meta-icon">🔗</span>
                Join Code: <strong>{tripOverview?.join_code}</strong>
              </span>
              <span className="meta-item">
                <span className="meta-icon">👥</span>
                {participantStatus?.role === 'host' ? 'You\'re the host' : 'Group trip'}
              </span>
            </div>
          </div>
        </div>

        <div className="upcoming-activities-card">
          <h4>📅 Upcoming Activities</h4>
          {upcomingActivities.length > 0 ? (
            <div className="activities-preview">
              {upcomingActivities.map((activity, index) => (
                <div key={activity.id} className="activity-preview">
                  <div className="activity-number">{index + 1}</div>
                  <div className="activity-details">
                    <div className="activity-title">{activity.title}</div>
                    <div className="activity-time">
                      {new Date(activity.start_time).toLocaleDateString()} at {new Date(activity.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-activities">
              <p>No upcoming activities scheduled yet. The host will add activities soon!</p>
            </div>
          )}
        </div>

        <div className="your-role-card">
          <h4>👤 Your Role</h4>
          <div className="role-info">
            <div className={`role-badge ${participantStatus?.role}`}>
              {participantStatus?.role === 'host' ? '🎯 Trip Host' : '🧳 Participant'}
            </div>
            <div className="role-description">
              {participantStatus?.role === 'host' 
                ? "As the host, you can create activities, manage the group, and make important decisions."
                : "As a participant, you'll vote on activities, provide feedback, and help shape the trip experience."
              }
            </div>
          </div>
        </div>
      </div>

      <div className="step-actions">
        <button 
          className="btn-primary"
          onClick={() => completeStep('overview')}
        >
          Got It!
        </button>
      </div>
    </div>
  );

  const renderActivityParticipationStep = () => (
    <div className="participation-step">
      <div className="step-header">
        <h2>How Activities Work</h2>
        <p>Understanding the activity cycle and your role in it</p>
      </div>

      <div className="participation-content">
        <div className="activity-cycle">
          <h4>🔄 Activity Cycle</h4>
          <div className="cycle-steps">
            <div className="cycle-step">
              <div className="step-icon">📢</div>
              <div className="step-title">Activity Starts</div>
              <div className="step-description">Host begins a new activity</div>
            </div>
            
            <div className="cycle-arrow">→</div>
            
            <div className="cycle-step">
              <div className="step-icon">🎯</div>
              <div className="step-title">Participate</div>
              <div className="step-description">Engage in the activity</div>
            </div>
            
            <div className="cycle-arrow">→</div>
            
            <div className="cycle-step">
              <div className="step-icon">📊</div>
              <div className="step-title">Provide Feedback</div>
              <div className="step-description">Rate your experience (1-5)</div>
            </div>
            
            <div className="cycle-arrow">→</div>
            
            <div className="cycle-step">
              <div className="step-icon">🤖</div>
              <div className="step-title">AI Analysis</div>
              <div className="step-description">System optimizes next activity</div>
            </div>
          </div>
        </div>

        <div className="feedback-categories">
          <h4>📝 5-Category Feedback</h4>
          <p>Rate each category from 1 (low) to 5 (high):</p>
          <div className="categories-grid">
            <div className="category-item">
              <span className="category-icon">😴</span>
              <span className="category-name">Energy Level</span>
              <span className="category-desc">How energetic do you feel?</span>
            </div>
            <div className="category-item">
              <span className="category-icon">🤒</span>
              <span className="category-name">Health</span>
              <span className="category-desc">How are you feeling physically?</span>
            </div>
            <div className="category-item">
              <span className="category-icon">🍽️</span>
              <span className="category-name">Hunger</span>
              <span className="category-desc">How hungry are you?</span>
            </div>
            <div className="category-item">
              <span className="category-icon">🌟</span>
              <span className="category-name">Adventure</span>
              <span className="category-desc">How adventurous do you feel?</span>
            </div>
            <div className="category-item">
              <span className="category-icon">⏰</span>
              <span className="category-name">Fatigue</span>
              <span className="category-desc">How tired are you?</span>
            </div>
          </div>
        </div>
      </div>

      <div className="step-actions">
        <button 
          className="btn-primary"
          onClick={() => completeStep('participation')}
        >
          I Understand
        </button>
      </div>
    </div>
  );

  const renderRealTimeFeaturesStep = () => (
    <div className="realtime-step">
      <div className="step-header">
        <h2>Real-time Features</h2>
        <p>Stay connected with your group throughout the trip</p>
      </div>

      <div className="realtime-content">
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🔔</div>
            <h4>Live Notifications</h4>
            <p>Get instant updates when activities start, when feedback is needed, or when group decisions are made.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h4>Live Dashboard</h4>
            <p>See real-time activity status, participant responses, and group mood analytics.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🤝</div>
            <h4>Group Coordination</h4>
            <p>Connect with other participants, see who's online, and coordinate meetups.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🧠</div>
            <h4>AI Optimization</h4>
            <p>Watch as AI learns from group feedback and suggests better activities.</p>
          </div>
        </div>

        <div className="connection-status">
          <h4>🔗 Connection Status</h4>
          <div className="status-indicator">
            <div className="status-dot connected"></div>
            <span>Connected to trip: {tripOverview?.name}</span>
          </div>
          <p className="status-description">
            You're now connected to the real-time updates. You'll receive notifications for important events.
          </p>
        </div>

        <div className="preferences-setup">
          <h4>⚙️ Notification Preferences</h4>
          <div className="preference-items">
            <label className="preference-item">
              <input 
                type="checkbox" 
                checked={participantStatus?.preferences?.notifications}
                onChange={(e) => setParticipantStatus(prev => ({
                  ...prev,
                  preferences: { ...prev.preferences, notifications: e.target.checked }
                }))}
              />
              <span>Enable notifications</span>
            </label>
            
            <label className="preference-item">
              <input 
                type="checkbox" 
                checked={participantStatus?.preferences?.activityReminders}
                onChange={(e) => setParticipantStatus(prev => ({
                  ...prev,
                  preferences: { ...prev.preferences, activityReminders: e.target.checked }
                }))}
              />
              <span>Remind me before activities</span>
            </label>
          </div>
        </div>
      </div>

      <div className="step-actions">
        <button 
          className="btn-primary"
          onClick={() => completeStep('realtime')}
        >
          Start Participating!
        </button>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="participant-dashboard">
      {/* Current Activity Status */}
      {currentActivity && currentActivity.activity ? (
        <div className="current-activity-section">
          <h2>🎯 Current Activity</h2>
          <div className="activity-status-card">
            <div className="activity-header">
              <h3>{currentActivity.activity.title}</h3>
              <span className={`status-badge ${currentActivity.status}`}>
                {currentActivity.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            
            <div className="activity-details">
              <div className="detail-item">
                <span className="detail-icon">📍</span>
                <span>{currentActivity.activity.location_name || 'Location TBD'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">⏰</span>
                <span>
                  {new Date(currentActivity.activity.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">👥</span>
                <span>{currentActivity.total_participants} participants</span>
              </div>
            </div>

            {currentActivity.status === 'activity_ongoing' && (
              <div className="activity-actions">
                <button 
                  className="btn-primary"
                  onClick={() => onNavigate('feedback', { activityId: currentActivity.activity_id })}
                >
                  Provide Feedback
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => onNavigate('activity-details', { activityId: currentActivity.activity_id })}
                >
                  View Details
                </button>
              </div>
            )}

            {currentActivity.status === 'waiting_for_votes' && (
              <div className="waiting-message">
                <span className="waiting-icon">⏳</span>
                Waiting for all participants to submit feedback...
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="no-activity-section">
          <div className="no-activity-content">
            <div className="no-activity-icon">🎯</div>
            <h2>No Active Activity</h2>
            <p>The host hasn't started any activities yet. Check back soon!</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <button 
            className="action-card"
            onClick={() => onNavigate('trip-overview')}
          >
            <span className="action-icon">📋</span>
            <span className="action-title">Trip Overview</span>
            <span className="action-desc">View trip details and participants</span>
          </button>
          
          <button 
            className="action-card"
            onClick={() => onNavigate('my-activities')}
          >
            <span className="action-icon">📅</span>
            <span className="action-title">My Activities</span>
            <span className="action-desc">See your activity history</span>
          </button>
          
          <button 
            className="action-card"
            onClick={() => onNavigate('group-chat')}
          >
            <span className="action-icon">💬</span>
            <span className="action-title">Group Chat</span>
            <span className="action-desc">Connect with participants</span>
          </button>
          
          <button 
            className="action-card"
            onClick={() => onNavigate('settings')}
          >
            <span className="action-icon">⚙️</span>
            <span className="action-title">Settings</span>
            <span className="action-desc">Manage your preferences</span>
          </button>
        </div>
      </div>

      {/* Upcoming Activities Preview */}
      {upcomingActivities.length > 0 && (
        <div className="upcoming-section">
          <h2>📅 Next Activities</h2>
          <div className="upcoming-list">
            {upcomingActivities.map((activity, index) => (
              <div key={activity.id} className="upcoming-item">
                <div className="item-number">{index + 1}</div>
                <div className="item-details">
                  <div className="item-title">{activity.title}</div>
                  <div className="item-time">
                    {new Date(activity.start_time).toLocaleDateString()} at {new Date(activity.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <button 
            className="view-all-btn"
            onClick={() => onNavigate('all-activities')}
          >
            View All Activities
          </button>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="guest-participation loading">
        <div className="loading-spinner">⏳</div>
        <p>Loading your trip experience...</p>
      </div>
    );
  }

  return (
    <div className="guest-participation">
      {/* Welcome Modal */}
      {showWelcome && !hasCompletedOnboarding && (
        <div className="welcome-modal">
          <div className="modal-content">
            {currentStep === 1 && renderWelcomeStep()}
            {currentStep === 2 && renderTripOverviewStep()}
            {currentStep === 3 && renderActivityParticipationStep()}
            {currentStep === 4 && renderRealTimeFeaturesStep()}
            
            {/* Progress indicator */}
            <div className="onboarding-progress">
              <div className="progress-dots">
                {[1, 2, 3, 4].map(step => (
                  <div 
                    key={step}
                    className={`progress-dot ${currentStep >= step ? 'active' : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard */}
      <div className="participation-content">
        <div className="dashboard-header">
          <div className="header-info">
            <h1>My Trip Experience</h1>
            <p>Welcome to {tripOverview?.name}</p>
          </div>
          
          <div className="header-actions">
            {participantStatus?.role === 'participant' && (
              <button 
                className="feedback-btn"
                onClick={() => onNavigate('feedback')}
              >
                📊 Provide Feedback
              </button>
            )}
            
            <button 
              className="settings-btn"
              onClick={() => onNavigate('participant-settings')}
            >
              ⚙️
            </button>
          </div>
        </div>

        {renderDashboard()}
      </div>
    </div>
  );
};

export default GuestParticipation;