import React, { useState, useEffect } from 'react';
import ActivityFeedback from './ActivityFeedback';
import { submitFeedback } from '../services/feedbackApi';
import { defaultErrorHandler } from '../utils/errorHandling';
import './VotingInterface.css';

const VotingInterface = ({ 
  activity, 
  trip, 
  onFeedbackSubmitted,
  onCancel,
  isVisible = true,
  enableRealTimeUpdates = true,
  participantCount = 0,
  respondedParticipants = 0
}) => {
  const [feedbackState, setFeedbackState] = useState({
    tired: 5,
    energetic: 5,
    sick: 5,
    hungry: 5,
    adventurous: 5
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [autoSubmitTimer, setAutoSubmitTimer] = useState(null);

  const feedbackCategories = [
    { 
      key: 'tired', 
      label: '😴 Tired', 
      color: '#6B73FF',
      description: 'How tired do you feel?',
      emoji: '😴',
      icon: '😴'
    },
    { 
      key: 'energetic', 
      label: '⚡ Energetic', 
      color: '#10B981',
      description: 'How energetic do you feel?',
      emoji: '⚡',
      icon: '⚡'
    },
    { 
      key: 'sick', 
      label: '🤒 Sick', 
      color: '#F59E0B',
      description: 'How unwell do you feel?',
      emoji: '🤒',
      icon: '🤒'
    },
    { 
      key: 'hungry', 
      label: '🍽️ Hungry', 
      color: '#EF4444',
      description: 'How hungry are you?',
      emoji: '🍽️',
      icon: '🍽️'
    },
    { 
      key: 'adventurous', 
      label: '🗻 Adventurous', 
      color: '#8B5CF6',
      description: 'How adventurous are you feeling?',
      emoji: '🗻',
      icon: '🗻'
    }
  ];

  // Handle slider change
  const handleSliderChange = (category, value) => {
    const numValue = parseInt(value);
    setFeedbackState(prev => ({
      ...prev,
      [category]: numValue
    }));
    
    // Clear submit status when user makes changes
    if (submitStatus) {
      setSubmitStatus(null);
    }
  };

  // Quick preset options
  const getQuickPreset = (category, value) => {
    const presets = {
      1: { label: 'Very Low', color: '#DC2626' },
      3: { label: 'Low', color: '#F59E0B' },
      5: { label: 'Medium', color: '#6B7280' },
      7: { label: 'High', color: '#10B981' },
      10: { label: 'Very High', color: '#059669' }
    };
    
    return presets[value] || { label: 'Unknown', color: '#6B7280' };
  };

  // Handle submit feedback
  const handleSubmitFeedback = async (feedbackData) => {
    if (!activity?.id) {
      setSubmitStatus({
        type: 'error',
        message: 'No activity selected. Please try again.'
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const result = await submitFeedback({
        activityId: activity.id,
        ...feedbackData
      });

      if (result.success) {
        setHasSubmitted(true);
        setSubmitStatus({
          type: 'success',
          message: result.message || 'Feedback submitted successfully!'
        });
        
        // Call parent callback
        if (onFeedbackSubmitted) {
          onFeedbackSubmitted(result.data);
        }

        // Auto-hide after success
        setTimeout(() => {
          setShowFeedbackModal(false);
          setSubmitStatus(null);
        }, 2000);
        
      } else {
        throw new Error(result.message || 'Failed to submit feedback');
      }
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      const { error: appError, recoveryMessage } = defaultErrorHandler(error, {
        context: 'VotingInterface.submitFeedback',
        activityId: activity?.id,
        feedback: feedbackData
      });
      
      setSubmitStatus({
        type: 'error',
        message: appError.message,
        recoveryMessage
      });
      
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle manual submit (when not using modal)
  const handleManualSubmit = () => {
    setShowFeedbackModal(true);
  };

  // Calculate response rate
  const getResponseRate = () => {
    if (participantCount === 0) return 0;
    return Math.round((respondedParticipants / participantCount) * 100);
  };

  // Get overall status message
  const getStatusMessage = () => {
    if (hasSubmitted) {
      return {
        type: 'submitted',
        message: '✅ Feedback submitted! Thank you for your response.',
        icon: '✅'
      };
    }
    
    const responseRate = getResponseRate();
    
    if (responseRate === 100) {
      return {
        type: 'complete',
        message: '🎉 All participants have responded! Awaiting next activity.',
        icon: '🎉'
      };
    } else if (responseRate > 0) {
      return {
        type: 'waiting',
        message: `⏳ ${respondedParticipants}/${participantCount} participants have responded (${responseRate}%)`,
        icon: '⏳'
      };
    } else {
      return {
        type: 'waiting',
        message: 'Waiting for responses... Be the first to share your feedback!',
        icon: '👋'
      };
    }
  };

  // Auto-submit functionality (optional)
  useEffect(() => {
    if (enableRealTimeUpdates && !hasSubmitted && respondedParticipants === participantCount - 1) {
      // Last person to respond - show completion message
      setSubmitStatus({
        type: 'info',
        message: '🎯 You\'re the last one! Your response will complete the feedback round.'
      });
    }
  }, [respondedParticipants, participantCount, hasSubmitted, enableRealTimeUpdates]);

  const statusMessage = getStatusMessage();

  if (!isVisible || !activity) {
    return null;
  }

  return (
    <div className="voting-interface">
      {/* Header */}
      <div className="voting-header">
        <div className="activity-info">
          <div className="activity-icon">{activity.icon || '📍'}</div>
          <div className="activity-details">
            <h3 className="activity-title">{activity.title || 'Current Activity'}</h3>
            <p className="activity-description">
              {activity.description || 'Share your feedback about this activity'}
            </p>
          </div>
        </div>
        
        <div className="response-status">
          <div className="response-percentage">
            {getResponseRate()}%
          </div>
          <div className="response-count">
            {respondedParticipants}/{participantCount}
          </div>
        </div>
      </div>

      {/* Status Message */}
      <div className={`status-message ${statusMessage.type}`}>
        <span className="status-icon">{statusMessage.icon}</span>
        <span className="status-text">{statusMessage.message}</span>
      </div>

      {/* Submit Status */}
      {submitStatus && (
        <div className={`submit-status ${submitStatus.type}`}>
          <span className="submit-message">{submitStatus.message}</span>
          {submitStatus.recoveryMessage && (
            <span className="recovery-message">
              💡 {submitStatus.recoveryMessage}
            </span>
          )}
        </div>
      )}

      {/* Quick Feedback Controls */}
      <div className="feedback-controls">
        <h4 className="controls-title">Quick Feedback</h4>
        <p className="controls-description">
          Adjust the sliders below to share how you're feeling about this activity
        </p>
        
        <div className="feedback-sliders">
          {feedbackCategories.map((category) => {
            const value = feedbackState[category.key];
            const preset = getQuickPreset(category.key, value);
            
            return (
              <div key={category.key} className="slider-group">
                <div className="slider-header">
                  <div className="slider-info">
                    <span className="slider-emoji">{category.icon}</span>
                    <label className="slider-label">{category.label}</label>
                  </div>
                  <div className="slider-value">
                    <span className="value-number" style={{ color: category.color }}>
                      {value}
                    </span>
                    <span className="value-label" style={{ color: preset.color }}>
                      {preset.label}
                    </span>
                  </div>
                </div>
                
                <div className="slider-container">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={value}
                    onChange={(e) => handleSliderChange(category.key, e.target.value)}
                    className="feedback-slider"
                    style={{
                      background: `linear-gradient(to right, ${category.color} 0%, ${category.color} ${(value-1)*11.11}%, #E5E7EB ${(value-1)*11.11}%, #E5E7EB 100%)`
                    }}
                    disabled={isSubmitting || hasSubmitted}
                  />
                  
                  <div className="slider-labels">
                    <span>1</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                </div>
                
                <div className="slider-description">
                  {category.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="voting-actions">
        {onCancel && (
          <button 
            className="btn-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
        
        {!hasSubmitted ? (
          <button 
            className="btn-primary"
            onClick={handleManualSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        ) : (
          <div className="submitted-indicator">
            <span className="submitted-icon">✅</span>
            <span className="submitted-text">Response Recorded</span>
          </div>
        )}
      </div>

      {/* Progress Visualization */}
      {participantCount > 0 && (
        <div className="progress-visualization">
          <div className="progress-header">
            <span>Response Progress</span>
            <span>{respondedParticipants} of {participantCount}</span>
          </div>
          <div className="progress-bar-container">
            <div 
              className="progress-bar"
              style={{ width: `${getResponseRate()}%` }}
            />
          </div>
        </div>
      )}

      {/* Activity Feedback Modal */}
      {showFeedbackModal && (
        <ActivityFeedback
          activityId={activity.id}
          onCancel={() => setShowFeedbackModal(false)}
          onSuccess={handleSubmitFeedback}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

export default VotingInterface;