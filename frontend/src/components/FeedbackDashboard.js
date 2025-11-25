import React, { useState, useEffect } from 'react';
import './FeedbackDashboard.css';

const FeedbackDashboard = ({ 
  tripId, 
  isHost = false, 
  refreshInterval = 30000 // 30 seconds default
}) => {
  const [feedbackData, setFeedbackData] = useState({
    activity_id: null,
    tired: { average: 5, count: 0, severity: 'MODERATE' },
    energetic: { average: 5, count: 0, severity: 'MODERATE' },
    sick: { average: 5, count: 0, severity: 'MODERATE' },
    hungry: { average: 5, count: 0, severity: 'MODERATE' },
    adventurous: { average: 5, count: 0, severity: 'MODERATE' },
    aiRecommendations: [],
    lastUpdated: null,
    totalParticipants: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  const feedbackCategories = [
    { 
      key: 'tired', 
      label: '😴 Tired', 
      color: '#6B73FF',
      emoji: '😴',
      warning: 'High tiredness may affect group morale'
    },
    { 
      key: 'energetic', 
      label: '⚡ Energetic', 
      color: '#10B981',
      emoji: '⚡',
      warning: 'Low energy may require rest activities'
    },
    { 
      key: 'sick', 
      label: '🤒 Sick', 
      color: '#F59E0B',
      emoji: '🤒',
      warning: 'Health concerns require immediate attention'
    },
    { 
      key: 'hungry', 
      label: '🍽️ Hungry', 
      color: '#EF4444',
      emoji: '🍽️',
      warning: 'Hunger levels affecting trip enjoyment'
    },
    { 
      key: 'adventurous', 
      label: '🗻 Adventurous', 
      color: '#8B5CF6',
      emoji: '🗻',
      warning: 'Low adventurousness may need activity changes'
    }
  ];

  const fetchFeedbackData = async () => {
    if (!tripId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch feedback data from backend
      const response = await fetch(`http://localhost:8000/api/v1/feedback/aggregate/${tripId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setFeedbackData({
        activity_id: data.activity_id,
        tired: data.tired || { average: 5, count: 0, severity: 'MODERATE' },
        energetic: data.energetic || { average: 5, count: 0, severity: 'MODERATE' },
        sick: data.sick || { average: 5, count: 0, severity: 'MODERATE' },
        hungry: data.hungry || { average: 5, count: 0, severity: 'MODERATE' },
        adventurous: data.adventurous || { average: 5, count: 0, severity: 'MODERATE' },
        aiRecommendations: data.ai_recommendations || [],
        lastUpdated: new Date(),
        totalParticipants: data.total_participants || 0
      });
      
    } catch (err) {
      console.error('Error fetching feedback data:', err);
      setError('Failed to load feedback data');
      // Set mock data for demo purposes
      setFeedbackData(prev => ({
        ...prev,
        lastUpdated: new Date(),
        aiRecommendations: ['Demo: Consider adding a rest break', 'Demo: Suggest dining options nearby']
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible && tripId) {
      fetchFeedbackData();
      const interval = setInterval(fetchFeedbackData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [tripId, isVisible, refreshInterval]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return { color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' };
      case 'HIGH': return { color: '#EA580C', bg: '#FED7AA', border: '#FB923C' };
      case 'MODERATE': return { color: '#D97706', bg: '#FEF3C7', border: '#FBBF24' };
      case 'LOW': return { color: '#059669', bg: '#D1FAE5', border: '#34D399' };
      case 'EXCELLENT': return { color: '#047857', bg: '#ECFDF5', border: '#10B981' };
      default: return { color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB' };
    }
  };

  const getOverallRiskLevel = () => {
    const severities = feedbackCategories.map(cat => feedbackData[cat.key].severity);
    const riskWeights = { CRITICAL: 5, HIGH: 4, MODERATE: 3, LOW: 2, EXCELLENT: 1 };
    const avgRisk = severities.reduce((sum, sev) => sum + (riskWeights[sev] || 3), 0) / severities.length;
    
    if (avgRisk >= 4.5) return { level: 'CRITICAL', color: '#DC2626' };
    if (avgRisk >= 3.5) return { level: 'HIGH', color: '#EA580C' };
    if (avgRisk >= 2.5) return { level: 'MODERATE', color: '#D97706' };
    if (avgRisk >= 1.5) return { level: 'LOW', color: '#059669' };
    return { level: 'EXCELLENT', color: '#047857' };
  };

  const overallRisk = getOverallRiskLevel();

  if (!isHost) {
    return null; // Only show to trip hosts
  }

  return (
    <div className={`feedback-dashboard ${isVisible ? 'visible' : ''}`}>
      <div className="dashboard-header">
        <button 
          className="toggle-dashboard"
          onClick={() => setIsVisible(!isVisible)}
        >
          <span className="toggle-icon">📊</span>
          <span>Live Feedback</span>
          {feedbackData.totalParticipants > 0 && (
            <span className="participant-count">{feedbackData.totalParticipants}</span>
          )}
          {overallRisk.level !== 'EXCELLENT' && (
            <span className={`risk-indicator ${overallRisk.level.toLowerCase()}`}>
              ⚠️
            </span>
          )}
        </button>
        
        {isVisible && (
          <div className="last-updated">
            Last updated: {feedbackData.lastUpdated?.toLocaleTimeString() || 'Never'}
          </div>
        )}
      </div>

      {isVisible && (
        <div className="dashboard-content">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <span>Loading feedback data...</span>
            </div>
          )}

          {error && (
            <div className="error-state">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
              <button onClick={fetchFeedbackData} className="retry-btn">
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Overall Risk Level */}
              <div className="overall-risk">
                <h4>🎯 Overall Group Status</h4>
                <div className={`risk-level ${overallRisk.level.toLowerCase()}`}>
                  <span className="risk-icon">
                    {overallRisk.level === 'CRITICAL' && '🚨'}
                    {overallRisk.level === 'HIGH' && '⚠️'}
                    {overallRisk.level === 'MODERATE' && '⚡'}
                    {overallRisk.level === 'LOW' && '✅'}
                    {overallRisk.level === 'EXCELLENT' && '🌟'}
                  </span>
                  <span className="risk-text">{overallRisk.level} RISK</span>
                </div>
              </div>

              {/* Feedback Categories */}
              <div className="feedback-categories">
                <h4>📊 Category Breakdown</h4>
                <div className="categories-grid">
                  {feedbackCategories.map((category) => {
                    const data = feedbackData[category.key];
                    const severityStyle = getSeverityColor(data.severity);
                    
                    return (
                      <div 
                        key={category.key} 
                        className={`category-card ${data.severity.toLowerCase()}`}
                        style={{ 
                          borderColor: severityStyle.border,
                          backgroundColor: severityStyle.bg 
                        }}
                      >
                        <div className="category-header">
                          <span className="category-emoji">{category.emoji}</span>
                          <span className="category-label">{category.label}</span>
                          <span 
                            className="severity-badge"
                            style={{ 
                              color: severityStyle.color,
                              borderColor: severityStyle.color 
                            }}
                          >
                            {data.severity}
                          </span>
                        </div>
                        
                        <div className="category-stats">
                          <div className="average-score">
                            <span className="score-value" style={{ color: category.color }}>
                              {data.average?.toFixed(1) || 'N/A'}
                            </span>
                            <span className="score-label">Average</span>
                          </div>
                          <div className="participant-count">
                            <span className="count-value">{data.count || 0}</span>
                            <span className="count-label">Responses</span>
                          </div>
                        </div>
                        
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ 
                              width: `${(data.average / 10) * 100}%`,
                              backgroundColor: category.color
                            }}
                          />
                        </div>
                        
                        {data.severity === 'CRITICAL' && (
                          <div className="warning-message">
                            <span className="warning-icon">⚠️</span>
                            <span>{category.warning}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Recommendations */}
              {feedbackData.aiRecommendations.length > 0 && (
                <div className="ai-recommendations">
                  <h4>🤖 AI Recommendations</h4>
                  <div className="recommendations-list">
                    {feedbackData.aiRecommendations.map((rec, index) => (
                      <div key={index} className="recommendation-item">
                        <span className="recommendation-icon">💡</span>
                        <span className="recommendation-text">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="quick-actions">
                <button 
                  onClick={fetchFeedbackData}
                  className="action-btn refresh"
                  disabled={loading}
                >
                  🔄 Refresh Data
                </button>
                <button 
                  className="action-btn optimize"
                  onClick={() => window.open(`http://localhost:8000/api/v1/ai/optimize/${tripId}`, '_blank')}
                >
                  🧠 Get AI Optimization
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FeedbackDashboard;