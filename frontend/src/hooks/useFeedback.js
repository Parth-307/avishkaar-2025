// useFeedback Hook - Manages feedback data, real-time updates, and historical tracking
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  submitFeedback, 
  getAggregatedFeedback, 
  getTripFeedback,
  getActivityFeedback 
} from '../services/feedbackApi';
import { defaultErrorHandler } from '../utils/errorHandling';

// Local storage keys
const STORAGE_KEYS = {
  FEEDBACK_HISTORY: 'tripplanner_feedback_history',
  FEEDBACK_CACHE: 'tripplanner_feedback_cache',
  USER_PREFERENCES: 'tripplanner_user_preferences'
};

// Cache expiration time (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

export const useFeedback = (tripId, options = {}) => {
  const {
    activityId,
    enableRealTime = false,
    refreshInterval = 30000, // 30 seconds
    enableCache = true,
    maxHistoryItems = 100
  } = options;

  // State management
  const [feedbackData, setFeedbackData] = useState(null);
  const [userFeedback, setUserFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Refs for cleanup and optimization
  const refreshIntervalRef = useRef(null);
  const cacheRef = useRef(new Map());

  // Load cached data
  const loadFromCache = useCallback((key) => {
    if (!enableCache) return null;
    
    try {
      const cached = cacheRef.current.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
        return cached.data;
      }
      return null;
    } catch (error) {
      console.warn('Error loading from cache:', error);
      return null;
    }
  }, [enableCache]);

  // Save data to cache
  const saveToCache = useCallback((key, data) => {
    if (!enableCache) return;
    
    try {
      cacheRef.current.set(key, {
        data,
        timestamp: Date.now()
      });
      
      // Clean up old cache entries
      if (cacheRef.current.size > 50) {
        const entries = Array.from(cacheRef.current.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        // Keep only the 25 most recent entries
        const toRemove = entries.slice(0, entries.length - 25);
        toRemove.forEach(([key]) => cacheRef.current.delete(key));
      }
    } catch (error) {
      console.warn('Error saving to cache:', error);
    }
  }, [enableCache]);

  // Fetch aggregated feedback data
  const fetchFeedbackData = useCallback(async (forceRefresh = false) => {
    if (!tripId) return;
    
    const cacheKey = `aggregated_${tripId}_${activityId || 'all'}`;
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cachedData = loadFromCache(cacheKey);
      if (cachedData) {
        setFeedbackData(cachedData);
        setLastUpdated(new Date(cachedData.lastUpdated || Date.now()));
        return;
      }
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching feedback data for trip:', tripId);
      
      let result;
      if (activityId) {
        result = await getActivityFeedback(activityId);
      } else {
        result = await getAggregatedFeedback(tripId);
      }
      
      if (result.success) {
        const data = {
          ...result.data,
          lastUpdated: Date.now(),
          tripId,
          activityId
        };
        
        setFeedbackData(data);
        setLastUpdated(new Date());
        saveToCache(cacheKey, data);
        
        // Update user feedback if available
        if (result.data.user_feedback) {
          setUserFeedback(result.data.user_feedback);
        }
        
      } else {
        throw new Error(result.message || 'Failed to fetch feedback data');
      }
      
    } catch (err) {
      console.error('Error fetching feedback data:', err);
      const { error: appError } = defaultErrorHandler(err, { 
        context: 'useFeedback.fetchFeedbackData',
        tripId,
        activityId 
      });
      setError(appError);
    } finally {
      setIsLoading(false);
    }
  }, [tripId, activityId, loadFromCache, saveToCache]);

  // Submit feedback
  const submitFeedbackData = useCallback(async (feedback) => {
    if (!tripId || !activityId) {
      throw new Error('Trip ID and Activity ID are required to submit feedback');
    }
    
    try {
      console.log('Submitting feedback:', feedback);
      
      const result = await submitFeedback({
        activityId,
        ...feedback
      });
      
      if (result.success) {
        // Update user feedback state
        setUserFeedback({
          activityId,
          ...feedback,
          submittedAt: Date.now(),
          id: result.data.id
        });
        
        // Refresh aggregated data
        await fetchFeedbackData(true);
        
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to submit feedback');
      }
      
    } catch (err) {
      const { error: appError } = defaultErrorHandler(err, {
        context: 'useFeedback.submitFeedbackData',
        tripId,
        activityId,
        feedback
      });
      throw appError;
    }
  }, [tripId, activityId, fetchFeedbackData]);

  // Refresh data
  const refresh = useCallback(() => {
    fetchFeedbackData(true);
  }, [fetchFeedbackData]);

  // Connect to real-time updates
  const connectRealTime = useCallback(() => {
    if (!enableRealTime || !tripId) return;
    
    console.log('Connecting to real-time feedback updates...');
    setIsConnected(true);
    
    // Set up polling for real-time updates
    refreshIntervalRef.current = setInterval(() => {
      fetchFeedbackData();
    }, refreshInterval);
    
  }, [enableRealTime, tripId, refreshInterval, fetchFeedbackData]);

  // Disconnect from real-time updates
  const disconnectRealTime = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Get feedback history
  const getFeedbackHistory = useCallback((filters = {}) => {
    try {
      const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.FEEDBACK_HISTORY) || '[]');
      
      return history.filter(item => {
        // Filter by trip ID
        if (filters.tripId && item.tripId !== filters.tripId) return false;
        
        // Filter by date range
        if (filters.startDate && item.submittedAt < filters.startDate) return false;
        if (filters.endDate && item.submittedAt > filters.endDate) return false;
        
        // Filter by activity type
        if (filters.activityType && item.activityType !== filters.activityType) return false;
        
        return true;
      }).slice(0, maxHistoryItems);
    } catch (error) {
      console.warn('Error loading feedback history:', error);
      return [];
    }
  }, [maxHistoryItems]);

  // Save feedback to history
  const saveToHistory = useCallback((feedback) => {
    try {
      const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.FEEDBACK_HISTORY) || '[]');
      
      const historyItem = {
        id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...feedback,
        submittedAt: Date.now(),
        tripId,
        activityId
      };
      
      // Add to beginning of array
      history.unshift(historyItem);
      
      // Trim to max history items
      if (history.length > maxHistoryItems) {
        history.splice(maxHistoryItems);
      }
      
      localStorage.setItem(STORAGE_KEYS.FEEDBACK_HISTORY, JSON.stringify(history));
      
      return historyItem;
    } catch (error) {
      console.warn('Error saving to feedback history:', error);
      return null;
    }
  }, [tripId, activityId, maxHistoryItems]);

  // Get user preferences for feedback
  const getUserPreferences = useCallback(() => {
    try {
      const preferences = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES) || '{}');
      return preferences;
    } catch (error) {
      console.warn('Error loading user preferences:', error);
      return {};
    }
  }, []);

  // Update user preferences
  const updateUserPreferences = useCallback((preferences) => {
    try {
      const current = getUserPreferences();
      const updated = {
        ...current,
        ...preferences,
        lastUpdated: Date.now()
      };
      
      localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.warn('Error saving user preferences:', error);
      return null;
    }
  }, [getUserPreferences]);

  // Get current feedback statistics
  const getFeedbackStats = useCallback(() => {
    if (!feedbackData) return null;
    
    const categories = ['tired', 'energetic', 'sick', 'hungry', 'adventurous'];
    const stats = {};
    
    categories.forEach(category => {
      const data = feedbackData[category];
      if (data) {
        stats[category] = {
          average: data.average,
          count: data.count,
          severity: data.severity,
          trend: data.trend || 'stable', // This would be calculated from historical data
          lastUpdated: data.lastUpdated
        };
      }
    });
    
    return {
      ...stats,
      overall: {
        totalParticipants: feedbackData.total_participants || 0,
        lastUpdated: feedbackData.lastUpdated,
        activeIssues: categories.filter(cat => {
          const data = feedbackData[cat];
          return data && (data.severity === 'CRITICAL' || data.severity === 'HIGH');
        }).length
      }
    };
  }, [feedbackData]);

  // Calculate overall risk level
  const getOverallRiskLevel = useCallback(() => {
    if (!feedbackData) return 'UNKNOWN';
    
    const severities = ['tired', 'energetic', 'sick', 'hungry', 'adventurous']
      .map(cat => feedbackData[cat]?.severity)
      .filter(Boolean);
    
    if (severities.length === 0) return 'UNKNOWN';
    
    const riskWeights = { CRITICAL: 5, HIGH: 4, MODERATE: 3, LOW: 2, EXCELLENT: 1 };
    const avgRisk = severities.reduce((sum, sev) => sum + (riskWeights[sev] || 3), 0) / severities.length;
    
    if (avgRisk >= 4.5) return 'CRITICAL';
    if (avgRisk >= 3.5) return 'HIGH';
    if (avgRisk >= 2.5) return 'MODERATE';
    if (avgRisk >= 1.5) return 'LOW';
    return 'EXCELLENT';
  }, [feedbackData]);

  // Cleanup function
  const cleanup = useCallback(() => {
    disconnectRealTime();
    cacheRef.current.clear();
  }, [disconnectRealTime]);

  // Auto-connect for real-time updates
  useEffect(() => {
    if (enableRealTime) {
      connectRealTime();
    }
    
    return cleanup;
  }, [enableRealTime, connectRealTime, cleanup]);

  // Auto-refresh data
  useEffect(() => {
    if (tripId) {
      fetchFeedbackData();
    }
  }, [tripId, activityId, fetchFeedbackData]);

  // Return comprehensive feedback state and methods
  return {
    // State
    feedbackData,
    userFeedback,
    isLoading,
    error,
    lastUpdated,
    isConnected,
    
    // Actions
    submitFeedback: submitFeedbackData,
    refresh,
    connectRealTime,
    disconnectRealTime,
    
    // Data utilities
    getFeedbackStats,
    getOverallRiskLevel,
    getFeedbackHistory,
    getUserPreferences,
    updateUserPreferences,
    
    // Cache management
    clearCache: () => cacheRef.current.clear(),
    cacheSize: cacheRef.current.size,
    
    // Utility
    isDataStale: () => {
      if (!lastUpdated) return true;
      return Date.now() - lastUpdated.getTime() > CACHE_EXPIRY;
    }
  };
};

// Export hook for easy access
export default useFeedback;