import React, { useState } from 'react';
import { submitFeedback, validateFeedbackData } from '../services/feedbackApi';
import { defaultErrorHandler, handleValidationError } from '../utils/errorHandling';
import './ActivityFeedback.css';

const ActivityFeedback = ({ 
  activityId, 
  onCancel,
  onSuccess,
  tripId,
  isSubmitting: propIsSubmitting = false,
  existingFeedback = null 
}) => {
  const [feedback, setFeedback] = useState({
    tired: existingFeedback?.tired || 5,
    energetic: existingFeedback?.energetic || 5,
    sick: existingFeedback?.sick || 5,
    hungry: existingFeedback?.hungry || 5,
    adventurous: existingFeedback?.adventurous || 5
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);

  const feedbackCategories = [
    { 
      key: 'tired', 
      label: '😴 Tired', 
      color: '#6B73FF',
      description: 'How tired do you feel?',
      emoji: '😴'
    },
    { 
      key: 'energetic', 
      label: '⚡ Energetic', 
      color: '#10B981',
      description: 'How energetic do you feel?',
      emoji: '⚡'
    },
    { 
      key: 'sick', 
      label: '🤒 Sick', 
      color: '#F59E0B',
      description: 'How unwell do you feel?',
      emoji: '🤒'
    },
    { 
      key: 'hungry', 
      label: '🍽️ Hungry', 
      color: '#EF4444',
      description: 'How hungry are you?',
      emoji: '🍽️'
    },
    { 
      key: 'adventurous', 
      label: '🗻 Adventurous', 
      color: '#8B5CF6',
      description: 'How adventurous are you feeling?',
      emoji: '🗻'
    }
  ];

  const handleSliderChange = (category, value) => {
    const numValue = parseInt(value);
    setFeedback(prev => ({
      ...prev,
      [category]: numValue
    }));

    // Clear error when user starts adjusting
    if (errors[category]) {
      setErrors(prev => ({
        ...prev,
        [category]: null
      }));
    }
  };

  const getSeverityLevel = (value) => {
    if (value <= 2) return { level: 'Low', color: '#10B981', bgColor: '#D1FAE5' };
    if (value <= 4) return { level: 'Moderate', color: '#F59E0B', bgColor: '#FEF3C7' };
    if (value <= 6) return { level: 'Medium', color: '#F59E0B', bgColor: '#FEF3C7' };
    if (value <= 8) return { level: 'High', color: '#EF4444', bgColor: '#FEE2E2' };
    return { level: 'Critical', color: '#DC2626', bgColor: '#FECACA' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setSubmitMessage(null);
    
    // Validate feedback data
    const validationData = {
      activityId: activityId || `activity-${Date.now()}`,
      ...feedback
    };
    
    const validation = validateFeedbackData(validationData);
    
    if (!validation.isValid) {
      const fieldErrors = handleValidationError(validation.errors);
      setErrors(fieldErrors);
      setSubmitMessage({
        type: 'error',
        text: 'Please fix the errors below and try again.'
      });
      return;
    }

    // Start submission process
    setIsSubmitting(true);
    
    try {
      const feedbackData = {
        activityId: activityId,
        ...feedback
      };
      
      console.log('Submitting feedback:', feedbackData);
      
      const result = await submitFeedback(feedbackData);
      
      if (result.success) {
        setSubmitMessage({
          type: 'success',
          text: result.message || 'Feedback submitted successfully!'
        });
        
        // Reset form data
        setFeedback({
          tired: 5,
          energetic: 5,
          sick: 5,
          hungry: 5,
          adventurous: 5
        });
        
        // Call success callback if provided
        if (onSuccess) {
          onSuccess(result.data);
        }
        
        // Auto-close modal after success
        setTimeout(() => {
          if (onCancel) {
            onCancel();
          }
        }, 2000);
        
      } else {
        throw new Error(result.message || 'Failed to submit feedback');
      }
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      const { error: appError, recoveryMessage } = defaultErrorHandler(error, { 
        context: 'ActivityFeedback.submit',
        activityId,
        feedback 
      });
      
      setSubmitMessage({
        type: 'error',
        text: appError.message,
        recoveryMessage: recoveryMessage
      });
      
      // Set API errors if available
      if (appError.details?.data) {
        const apiErrors = handleValidationError(appError.details.data);
        setErrors(apiErrors);
      }
      
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting) return; // Prevent cancellation during submission
    
    // Reset form
    setFeedback({
      tired: existingFeedback?.tired || 5,
      energetic: existingFeedback?.energetic || 5,
      sick: existingFeedback?.sick || 5,
      hungry: existingFeedback?.hungry || 5,
      adventurous: existingFeedback?.adventurous || 5
    });
    setErrors({});
    setSubmitMessage(null);
    
    if (onCancel) {
      onCancel();
    }
  };

  const getSubmitButtonText = () => {
    if (isSubmitting || propIsSubmitting) return 'Submitting...';
    return 'Submit Feedback';
  };

  return (
    <div className="activity-feedback-container">
      <div className="feedback-modal">
        <div className="feedback-header">
          <h3>🏃‍♂️ Activity Feedback</h3>
          <p>Help us understand how you're feeling after this activity</p>
        </div>

        <form onSubmit={handleSubmit} className="feedback-form">
          {/* Submit status message */}
          {submitMessage && (
            <div className={`submit-message ${submitMessage.type}`}>
              <span className="message-icon">
                {submitMessage.type === 'success' ? '✅' : '⚠️'}
              </span>
              <span className="message-text">{submitMessage.text}</span>
              {submitMessage.recoveryMessage && (
                <div className="recovery-message">
                  💡 {submitMessage.recoveryMessage}
                </div>
              )}
            </div>
          )}

          {/* General errors */}
          {errors.submit && (
            <div className="error-message submit-error">
              {errors.submit}
            </div>
          )}

          <div className="feedback-categories">
            {feedbackCategories.map((category) => {
              const value = feedback[category.key];
              const severity = getSeverityLevel(value);
              
              return (
                <div key={category.key} className={`feedback-category ${errors[category.key] ? 'error' : ''}`}>
                  <div className="category-header">
                    <label className="category-label">
                      {category.emoji} {category.label}
                    </label>
                    <div className="severity-indicator" style={{ 
                      backgroundColor: severity.bgColor, 
                      color: severity.color 
                    }}>
                      {severity.level}
                    </div>
                  </div>
                  
                  <p className="category-description">{category.description}</p>
                  
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
                      disabled={isSubmitting || propIsSubmitting}
                    />
                    <div className="slider-labels">
                      <span>1</span>
                      <span>10</span>
                    </div>
                  </div>
                  
                  <div className="value-display">
                    <span className="value-number" style={{ color: category.color }}>
                      {value}
                    </span>
                    <div className="value-bar">
                      <div 
                        className="value-fill" 
                        style={{ 
                          width: `${value * 10}%`,
                          backgroundColor: category.color
                        }}
                      />
                    </div>
                  </div>
                  
                  {errors[category.key] && (
                    <div className="error-message">
                      {errors[category.key]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="feedback-summary">
            <h4>📊 Quick Summary</h4>
            <div className="summary-grid">
              {feedbackCategories.map((category) => {
                const value = feedback[category.key];
                const severity = getSeverityLevel(value);
                return (
                  <div key={category.key} className="summary-item">
                    <span className="summary-emoji">{category.emoji}</span>
                    <span className="summary-value" style={{ color: category.color }}>
                      {value}/10
                    </span>
                    <span className="summary-level" style={{ color: severity.color }}>
                      {severity.level}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="feedback-actions">
            <button 
              type="button" 
              onClick={handleCancel}
              className="btn-secondary"
              disabled={isSubmitting || propIsSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isSubmitting || propIsSubmitting}
            >
              {getSubmitButtonText()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActivityFeedback;