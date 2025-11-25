import React, { useState, useEffect } from 'react';
import './ActivityOptimization.css';

const ActivityOptimization = ({ user, tripData, onNavigate }) => {
  const [activities, setActivities] = useState([]);
  const [pendingActivities, setPendingActivities] = useState([]);
  const [currentFeedback, setCurrentFeedback] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationHistory, setOptimizationHistory] = useState([]);
  const [userLocation, setUserLocation] = useState({ lat: 0, lng: 0 });

  // Load location and data on component mount
  useEffect(() => {
    if (user && user.trip_id) {
      loadUserLocation();
      fetchActivities();
      fetchOptimizationHistory();
    }
  }, [user]);

  const loadUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          // Use default location
          setUserLocation({ lat: 40.7128, lng: -74.0060 }); // NYC default
        }
      );
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch(`/api/trips/${user.trip_id}/activities`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
        
        // Filter pending activities for optimization
        const pending = data.filter(activity => activity.status === 'pending');
        setPendingActivities(pending);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    }
  };

  const fetchCurrentFeedback = async () => {
    try {
      // Get the most recent activity with feedback
      const recentActivity = activities.find(activity => 
        activity.status === 'completed' || activity.status === 'active'
      );
      
      if (recentActivity) {
        const response = await fetch(`/api/activities/${recentActivity.id}/feedback`);
        if (response.ok) {
          const data = await response.json();
          setCurrentFeedback(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch current feedback:', error);
    }
  };

  const fetchOptimizationHistory = async () => {
    // For now, we'll use local storage to store optimization history
    // In a real implementation, this would fetch from the backend
    const history = JSON.parse(localStorage.getItem(`optimization_history_${user.trip_id}`) || '[]');
    setOptimizationHistory(history);
  };

  const saveOptimizationToHistory = (result) => {
    const historyItem = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      changes_made: result.changes_made,
      strategy_used: result.strategy_used,
      ai_analysis: result.ai_analysis,
      trip_id: user.trip_id
    };
    
    const updatedHistory = [historyItem, ...optimizationHistory.slice(0, 9)]; // Keep last 10
    setOptimizationHistory(updatedHistory);
    
    // Save to localStorage
    localStorage.setItem(`optimization_history_${user.trip_id}`, JSON.stringify(updatedHistory));
  };

  const triggerAIPivot = async () => {
    if (!currentFeedback || !userLocation.lat) {
      return;
    }

    setIsOptimizing(true);
    
    try {
      const response = await fetch(`/api/trips/${user.trip_id}/pivot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: user.id,
          user_lat: userLocation.lat,
          user_lng: userLocation.lng,
          decision: 'PIVOT_WITH_AI',
          reason: 'Manual AI optimization trigger from dashboard'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setOptimizationResults(result);
        saveOptimizationToHistory(result);
        await fetchActivities(); // Refresh activities to see changes
        
        // Show success message
        showNotification('AI Optimization completed successfully!', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.detail || 'AI Optimization failed', 'error');
      }
    } catch (error) {
      showNotification('Failed to connect to AI service', 'error');
    } finally {
      setIsOptimizing(false);
    }
  };

  const showNotification = (message, type) => {
    // Simple notification system - in a real app you'd use a toast library
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Create temporary notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 2rem;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      z-index: 1000;
      ${type === 'success' ? 'background: #22c55e;' : 'background: #ef4444;'}
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  };

  const generateAIPreview = async () => {
    if (!currentFeedback || pendingActivities.length === 0) {
      return;
    }

    // Simulate AI analysis preview
    const feedbackData = {
      tired: currentFeedback.average_scores?.tired || 3,
      energetic: currentFeedback.average_scores?.energetic || 3,
      sick: currentFeedback.average_scores?.sick || 3,
      hungry: currentFeedback.average_scores?.hungry || 3,
      adventurous: currentFeedback.average_scores?.adventurous || 3
    };

    // Call the backend AI pivot engine
    try {
      const response = await fetch(`/api/trips/${user.trip_id}/pivot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: user.id,
          user_lat: userLocation.lat,
          user_lng: userLocation.lng,
          decision: 'PREVIEW_PIVOT', // Special preview mode
          reason: 'Preview AI recommendations'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setAiAnalysis(result);
      }
    } catch (error) {
      // Fallback to local analysis
      generateLocalAIPreview(feedbackData);
    }
  };

  const generateLocalAIPreview = (feedbackData) => {
    // Local AI-like analysis as fallback
    const analysis = {
      ai_analysis: {
        recommendations: [
          {
            activity: pendingActivities[0]?.title || 'Next Activity',
            change: 'modify',
            reason: 'Group is tired, suggest less intensive activity',
            new_data: {
              type: 'relaxing',
              duration: 60,
              description: 'Modified based on group energy levels'
            }
          }
        ],
        confidence: 85,
        reasoning: 'Based on current group mood and location'
      },
      strategy_used: 'Local Analysis Preview'
    };
    
    setAiAnalysis(analysis);
  };

  const handleActivitySelection = (activityId, selected) => {
    if (selected) {
      setSelectedActivities(prev => [...prev, activityId]);
    } else {
      setSelectedActivities(prev => prev.filter(id => id !== activityId));
    }
  };

  const getOptimizationInsights = () => {
    if (!currentFeedback) return null;
    
    const { average_scores, fatigue_analysis } = currentFeedback;
    
    const insights = [];
    
    if (fatigue_analysis.overall_score > 70) {
      insights.push({
        type: 'warning',
        message: 'High group fatigue detected',
        action: 'Consider lower intensity activities'
      });
    }
    
    if (average_scores.energetic < 3) {
      insights.push({
        type: 'info',
        message: 'Low group energy levels',
        action: 'Schedule energizing activities'
      });
    }
    
    if (average_scores.hungry > 4) {
      insights.push({
        type: 'suggestion',
        message: 'Group is hungry',
        action: 'Plan food-related activities'
      });
    }
    
    if (average_scores.adventurous < 3) {
      insights.push({
        type: 'info',
        message: 'Group prefers safer activities',
        action: 'Avoid high-risk adventure activities'
      });
    }
    
    return insights;
  };

  const getFatigueColor = (score) => {
    if (score >= 75) return '#ef4444';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#3b82f6';
    if (score >= 25) return '#22c55e';
    return '#10b981';
  };

  return (
    <div className="activity-optimization">
      {/* Header */}
      <div className="optimization-header">
        <div className="header-left">
          <h1>🤖 AI Activity Optimization</h1>
          <p className="header-subtitle">
            Optimize your trip activities using AI-powered recommendations
          </p>
        </div>
        
        <div className="header-right">
          <div className="location-info">
            📍 Location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
          </div>
          <button 
            className="optimize-btn primary"
            onClick={triggerAIPivot}
            disabled={isOptimizing || !currentFeedback}
          >
            {isOptimizing ? '⏳ Optimizing...' : '🚀 Run AI Optimization'}
          </button>
        </div>
      </div>

      {/* Current Analysis */}
      {currentFeedback && (
        <div className="current-analysis">
          <h2>📊 Current Group Analysis</h2>
          
          <div className="analysis-grid">
            {/* Fatigue Analysis */}
            <div className="analysis-card">
              <h3>Fatigue Level</h3>
              <div className="fatigue-gauge">
                <div 
                  className="gauge-fill"
                  style={{ 
                    width: `${currentFeedback.fatigue_analysis.overall_score}%`,
                    backgroundColor: getFatigueColor(currentFeedback.fatigue_analysis.overall_score)
                  }}
                ></div>
              </div>
              <div className="fatigue-info">
                <span className="fatigue-score">
                  {currentFeedback.fatigue_analysis.overall_score.toFixed(1)}%
                </span>
                <span className="fatigue-level">
                  {currentFeedback.fatigue_analysis.level}
                </span>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="analysis-card">
              <h3>Group Mood Categories</h3>
              <div className="category-scores">
                {currentFeedback.average_scores && Object.entries(currentFeedback.average_scores).map(([category, score]) => (
                  <div key={category} className="category-score">
                    <div className="category-label">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </div>
                    <div className="score-visualization">
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
            </div>

            {/* AI Insights */}
            <div className="analysis-card">
              <h3>💡 AI Insights</h3>
              {getOptimizationInsights()?.map((insight, index) => (
                <div key={index} className={`insight ${insight.type}`}>
                  <div className="insight-message">{insight.message}</div>
                  <div className="insight-action">{insight.action}</div>
                </div>
              ))}
              
              {!getOptimizationInsights() && (
                <div className="no-insights">
                  Group mood is balanced. Current activities are optimal!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pending Activities */}
      {pendingActivities.length > 0 && (
        <div className="pending-activities">
          <div className="section-header">
            <h2>📅 Pending Activities for Optimization</h2>
            <div className="selection-info">
              Selected: {selectedActivities.length}/{pendingActivities.length}
            </div>
          </div>
          
          <div className="activities-list">
            {pendingActivities.map((activity) => (
              <div key={activity.id} className="activity-optimization-card">
                <div className="activity-selection">
                  <input
                    type="checkbox"
                    id={`activity-${activity.id}`}
                    checked={selectedActivities.includes(activity.id)}
                    onChange={(e) => handleActivitySelection(activity.id, e.target.checked)}
                  />
                  <label htmlFor={`activity-${activity.id}`}></label>
                </div>
                
                <div className="activity-info">
                  <h3 className="activity-title">{activity.title}</h3>
                  <div className="activity-meta">
                    <span className="activity-type">{activity.type}</span>
                    <span className="activity-time">
                      {new Date(activity.start_time).toLocaleString()}
                    </span>
                    {activity.location_name && (
                      <span className="activity-location">
                        📍 {activity.location_name}
                      </span>
                    )}
                  </div>
                  {activity.description && (
                    <p className="activity-description">{activity.description}</p>
                  )}
                </div>

                <div className="activity-ai-badge">
                  {activity.is_ai_generated && (
                    <span className="ai-generated">🤖 AI Generated</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Preview */}
      <div className="ai-preview">
        <div className="section-header">
          <h2>🔮 AI Optimization Preview</h2>
          <button 
            className="preview-btn"
            onClick={generateAIPreview}
            disabled={!currentFeedback || pendingActivities.length === 0}
          >
            Generate Preview
          </button>
        </div>

        {aiAnalysis ? (
          <div className="preview-content">
            <div className="preview-strategy">
              <h3>Strategy: {aiAnalysis.strategy_used}</h3>
              <p className="strategy-description">
                AI analysis completed with {aiAnalysis.ai_analysis?.confidence || 85}% confidence
              </p>
            </div>

            {aiAnalysis.ai_analysis?.recommendations && (
              <div className="recommendations-list">
                <h4>Recommendations</h4>
                {aiAnalysis.ai_analysis.recommendations.map((rec, index) => (
                  <div key={index} className="recommendation-item">
                    <div className="recommendation-header">
                      <span className="recommendation-activity">{rec.activity}</span>
                      <span className="recommendation-change">{rec.change}</span>
                    </div>
                    <div className="recommendation-reason">{rec.reason}</div>
                    {rec.new_data && (
                      <div className="recommendation-changes">
                        <strong>Suggested Changes:</strong>
                        <ul>
                          {Object.entries(rec.new_data).map(([key, value]) => (
                            <li key={key}>
                              {key}: {value}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="no-preview">
            <div className="preview-placeholder">
              <div className="placeholder-icon">🔮</div>
              <p>Click "Generate Preview" to see AI recommendations based on current group feedback</p>
            </div>
          </div>
        )}
      </div>

      {/* Optimization Results */}
      {optimizationResults && (
        <div className="optimization-results">
          <h2>✅ Optimization Complete</h2>
          
          <div className="results-summary">
            <div className="result-stat">
              <span className="stat-number">{optimizationResults.changes_made}</span>
              <span className="stat-label">Activities Modified</span>
            </div>
            
            <div className="result-stat">
              <span className="stat-label">Strategy Used</span>
              <span className="stat-value">{optimizationResults.strategy_used}</span>
            </div>
          </div>
          
          <div className="results-message">
            {optimizationResults.message}
          </div>

          {optimizationResults.ai_analysis && (
            <div className="results-analysis">
              <h4>AI Analysis Details</h4>
              <div className="analysis-content">
                {JSON.stringify(optimizationResults.ai_analysis, null, 2)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Optimization History */}
      {optimizationHistory.length > 0 && (
        <div className="optimization-history">
          <h2>📈 Optimization History</h2>
          
          <div className="history-list">
            {optimizationHistory.map((historyItem) => (
              <div key={historyItem.id} className="history-item">
                <div className="history-header">
                  <span className="history-date">
                    {new Date(historyItem.timestamp).toLocaleString()}
                  </span>
                  <span className="history-changes">
                    {historyItem.changes_made} changes made
                  </span>
                </div>
                
                <div className="history-strategy">
                  Strategy: {historyItem.strategy_used}
                </div>
                
                {historyItem.ai_analysis && (
                  <div className="history-analysis">
                    <details>
                      <summary>View AI Analysis</summary>
                      <pre>{JSON.stringify(historyItem.ai_analysis, null, 2)}</pre>
                    </details>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!currentFeedback && pendingActivities.length === 0 && (
        <div className="optimization-empty">
          <div className="empty-state">
            <div className="empty-icon">🤖</div>
            <h3>No Data for Optimization</h3>
            <p>
              Complete some activities and collect feedback to enable AI optimization
            </p>
            <button 
              className="start-btn"
              onClick={() => onNavigate('activities')}
            >
              Go to Activities
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityOptimization;