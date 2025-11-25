// Feedback API Service - Handles all feedback-related API calls
const API_BASE_URL = 'http://localhost:8000/api/v1';

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: 'An unknown error occurred' 
    }));
    
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
};

// Helper function to handle request headers
const getHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Submit 5-category feedback for an activity
export const submitFeedback = async (feedbackData) => {
  try {
    console.log('Submitting feedback:', feedbackData);
    
    const response = await fetch(`${API_BASE_URL}/feedback/submit`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        activity_id: feedbackData.activityId || feedbackData.activity_id,
        tired: feedbackData.tired,
        energetic: feedbackData.energetic,
        sick: feedbackData.sick,
        hungry: feedbackData.hungry,
        adventurous: feedbackData.adventurous
      })
    });

    const result = await handleResponse(response);
    console.log('Feedback submitted successfully:', result);
    
    return {
      success: true,
      data: result,
      message: 'Feedback submitted successfully!'
    };
    
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to submit feedback. Please try again.'
    };
  }
};

// Get aggregated feedback for a trip
export const getAggregatedFeedback = async (tripId) => {
  try {
    console.log('Fetching aggregated feedback for trip:', tripId);
    
    const response = await fetch(`${API_BASE_URL}/feedback/aggregate/${tripId}`, {
      method: 'GET',
      headers: getHeaders()
    });

    const result = await handleResponse(response);
    console.log('Aggregated feedback received:', result);
    
    return {
      success: true,
      data: result
    };
    
  } catch (error) {
    console.error('Error fetching aggregated feedback:', error);
    return {
      success: false,
      error: error.message,
      // Return mock data for development/demo purposes
      data: {
        activity_id: null,
        tired: { average: 5, count: 0, severity: 'MODERATE' },
        energetic: { average: 5, count: 0, severity: 'MODERATE' },
        sick: { average: 5, count: 0, severity: 'MODERATE' },
        hungry: { average: 5, count: 0, severity: 'MODERATE' },
        adventurous: { average: 5, count: 0, severity: 'MODERATE' },
        ai_recommendations: [],
        total_participants: 0
      }
    };
  }
};

// Get feedback history for a specific user
export const getUserFeedbackHistory = async (tripId, userId = null) => {
  try {
    const endpoint = userId 
      ? `${API_BASE_URL}/feedback/user/${userId}/trip/${tripId}`
      : `${API_BASE_URL}/feedback/trip/${tripId}/user-history`;
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: getHeaders()
    });

    const result = await handleResponse(response);
    
    return {
      success: true,
      data: result
    };
    
  } catch (error) {
    console.error('Error fetching user feedback history:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

// Get feedback for a specific activity
export const getActivityFeedback = async (activityId) => {
  try {
    console.log('Fetching feedback for activity:', activityId);
    
    const response = await fetch(`${API_BASE_URL}/feedback/activity/${activityId}`, {
      method: 'GET',
      headers: getHeaders()
    });

    const result = await handleResponse(response);
    
    return {
      success: true,
      data: result
    };
    
  } catch (error) {
    console.error('Error fetching activity feedback:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

// Get feedback for all activities in a trip
export const getTripFeedback = async (tripId) => {
  try {
    console.log('Fetching all feedback for trip:', tripId);
    
    const response = await fetch(`${API_BASE_URL}/feedback/trip/${tripId}`, {
      method: 'GET',
      headers: getHeaders()
    });

    const result = await handleResponse(response);
    
    return {
      success: true,
      data: result
    };
    
  } catch (error) {
    console.error('Error fetching trip feedback:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

// Request AI optimization based on current feedback
export const requestAIOptimization = async (tripId) => {
  try {
    console.log('Requesting AI optimization for trip:', tripId);
    
    const response = await fetch(`${API_BASE_URL}/ai/optimize/${tripId}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        include_recommendations: true,
        analyze_thresholds: true
      })
    });

    const result = await handleResponse(response);
    console.log('AI optimization response:', result);
    
    return {
      success: true,
      data: result
    };
    
  } catch (error) {
    console.error('Error requesting AI optimization:', error);
    return {
      success: false,
      error: error.message,
      data: {
        recommendations: ['Demo: Consider adding a rest break', 'Demo: Suggest dining options nearby'],
        thresholds: {
          critical_issues: [],
          recommendations: []
        }
      }
    };
  }
};

// Update feedback thresholds (for trip hosts only)
export const updateFeedbackThresholds = async (tripId, thresholds) => {
  try {
    console.log('Updating feedback thresholds:', thresholds);
    
    const response = await fetch(`${API_BASE_URL}/feedback/thresholds/${tripId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(thresholds)
    });

    const result = await handleResponse(response);
    
    return {
      success: true,
      data: result,
      message: 'Thresholds updated successfully!'
    };
    
  } catch (error) {
    console.error('Error updating thresholds:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to update thresholds. Please try again.'
    };
  }
};

// Get current feedback thresholds for a trip
export const getFeedbackThresholds = async (tripId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/feedback/thresholds/${tripId}`, {
      method: 'GET',
      headers: getHeaders()
    });

    const result = await handleResponse(response);
    
    return {
      success: true,
      data: result
    };
    
  } catch (error) {
    console.error('Error fetching thresholds:', error);
    return {
      success: false,
      error: error.message,
      data: {
        tired: { critical: 8, high: 6, moderate: 4 },
        energetic: { critical: 2, high: 3, moderate: 4 },
        sick: { critical: 7, high: 5, moderate: 3 },
        hungry: { critical: 8, high: 6, moderate: 4 },
        adventurous: { critical: 2, high: 3, moderate: 4 }
      }
    };
  }
};

// Validate feedback data before submission
export const validateFeedbackData = (feedbackData) => {
  const errors = [];
  const categories = ['tired', 'energetic', 'sick', 'hungry', 'adventurous'];
  
  // Check if activity ID is provided
  if (!feedbackData.activityId && !feedbackData.activity_id) {
    errors.push('Activity ID is required');
  }
  
  // Validate each category is within range 1-10
  categories.forEach(category => {
    const value = feedbackData[category];
    if (typeof value !== 'number' || value < 1 || value > 10) {
      errors.push(`${category.charAt(0).toUpperCase() + category.slice(1)} must be between 1 and 10`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Export all feedback-related utilities
export default {
  submitFeedback,
  getAggregatedFeedback,
  getUserFeedbackHistory,
  getActivityFeedback,
  getTripFeedback,
  requestAIOptimization,
  updateFeedbackThresholds,
  getFeedbackThresholds,
  validateFeedbackData,
  
  // Utility constants
  API_BASE_URL,
  
  // Category configurations
  FEEDBACK_CATEGORIES: {
    tired: { 
      label: 'Tired', 
      emoji: '😴', 
      color: '#6B73FF',
      warning: 'High tiredness may affect group morale'
    },
    energetic: { 
      label: 'Energetic', 
      emoji: '⚡', 
      color: '#10B981',
      warning: 'Low energy may require rest activities'
    },
    sick: { 
      label: 'Sick', 
      emoji: '🤒', 
      color: '#F59E0B',
      warning: 'Health concerns require immediate attention'
    },
    hungry: { 
      label: 'Hungry', 
      emoji: '🍽️', 
      color: '#EF4444',
      warning: 'Hunger levels affecting trip enjoyment'
    },
    adventurous: { 
      label: 'Adventurous', 
      emoji: '🗻', 
      color: '#8B5CF6',
      warning: 'Low adventurousness may need activity changes'
    }
  },
  
  // Severity levels
  SEVERITY_LEVELS: {
    CRITICAL: { value: 5, color: '#DC2626', bgColor: '#FEE2E2' },
    HIGH: { value: 4, color: '#EA580C', bgColor: '#FED7AA' },
    MODERATE: { value: 3, color: '#D97706', bgColor: '#FEF3C7' },
    LOW: { value: 2, color: '#059669', bgColor: '#D1FAE5' },
    EXCELLENT: { value: 1, color: '#047857', bgColor: '#ECFDF5' }
  }
};