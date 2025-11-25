// Feedback Utils - Data processing, calculations, and utilities for feedback system

// Feedback categories configuration
export const FEEDBACK_CATEGORIES = {
  tired: {
    key: 'tired',
    label: 'Tired',
    emoji: '😴',
    color: '#6B73FF',
    description: 'How tired do you feel?',
    inverseScale: false, // Higher values = more tired (bad)
    defaultThreshold: 7,
    warningMessage: 'High tiredness may affect group morale'
  },
  energetic: {
    key: 'energetic',
    label: 'Energetic',
    emoji: '⚡',
    color: '#10B981',
    description: 'How energetic do you feel?',
    inverseScale: true, // Lower values = less energetic (bad)
    defaultThreshold: 3,
    warningMessage: 'Low energy may require rest activities'
  },
  sick: {
    key: 'sick',
    label: 'Sick',
    emoji: '🤒',
    color: '#F59E0B',
    description: 'How unwell do you feel?',
    inverseScale: false, // Higher values = more sick (bad)
    defaultThreshold: 6,
    warningMessage: 'Health concerns require immediate attention'
  },
  hungry: {
    key: 'hungry',
    label: 'Hungry',
    emoji: '🍽️',
    color: '#EF4444',
    description: 'How hungry are you?',
    inverseScale: false, // Higher values = more hungry (bad)
    defaultThreshold: 7,
    warningMessage: 'Hunger levels affecting trip enjoyment'
  },
  adventurous: {
    key: 'adventurous',
    label: 'Adventurous',
    emoji: '🗻',
    color: '#8B5CF6',
    description: 'How adventurous are you feeling?',
    inverseScale: true, // Lower values = less adventurous (bad)
    defaultThreshold: 3,
    warningMessage: 'Low adventurousness may need activity changes'
  }
};

// Severity levels mapping
export const SEVERITY_LEVELS = {
  CRITICAL: {
    value: 5,
    color: '#DC2626',
    bgColor: '#FEE2E2',
    textColor: '#7F1D1D',
    description: 'Immediate action required'
  },
  HIGH: {
    value: 4,
    color: '#EA580C',
    bgColor: '#FED7AA',
    textColor: '#9A3412',
    description: 'Urgent attention needed'
  },
  MODERATE: {
    value: 3,
    color: '#D97706',
    bgColor: '#FEF3C7',
    textColor: '#92400E',
    description: 'Monitor closely'
  },
  LOW: {
    value: 2,
    color: '#059669',
    bgColor: '#D1FAE5',
    textColor: '#065F46',
    description: 'Generally okay'
  },
  EXCELLENT: {
    value: 1,
    color: '#047857',
    bgColor: '#ECFDF5',
    textColor: '#064E3B',
    description: 'Optimal condition'
  }
};

// Calculate severity based on value and category
export const calculateSeverity = (value, categoryKey) => {
  if (typeof value !== 'number' || value < 1 || value > 10) {
    return 'MODERATE';
  }
  
  const category = FEEDBACK_CATEGORIES[categoryKey];
  if (!category) return 'MODERATE';
  
  const threshold = category.defaultThreshold;
  const isInverse = category.inverseScale;
  
  let severity;
  
  if (isInverse) {
    // For inverse scales (energetic, adventurous): lower values are worse
    if (value <= 2) severity = 'CRITICAL';
    else if (value <= 3) severity = 'HIGH';
    else if (value <= 5) severity = 'MODERATE';
    else if (value <= 7) severity = 'LOW';
    else severity = 'EXCELLENT';
  } else {
    // For normal scales (tired, sick, hungry): higher values are worse
    if (value >= 9) severity = 'CRITICAL';
    else if (value >= 7) severity = 'HIGH';
    else if (value >= 5) severity = 'MODERATE';
    else if (value >= 3) severity = 'LOW';
    else severity = 'EXCELLENT';
  }
  
  return severity;
};

// Calculate weighted average considering category importance
export const calculateWeightedAverage = (feedbackData, weights = {}) => {
  const categories = Object.keys(FEEDBACK_CATEGORIES);
  let totalWeightedScore = 0;
  let totalWeight = 0;
  const individualScores = {};
  
  categories.forEach(categoryKey => {
    const data = feedbackData[categoryKey];
    if (data && typeof data.average === 'number') {
      const weight = weights[categoryKey] || 1;
      const adjustedValue = FEEDBACK_CATEGORIES[categoryKey].inverseScale 
        ? (11 - data.average) // Invert the scale
        : data.average;
      
      individualScores[categoryKey] = {
        raw: data.average,
        adjusted: adjustedValue,
        weighted: adjustedValue * weight,
        weight
      };
      
      totalWeightedScore += adjustedValue * weight;
      totalWeight += weight;
    }
  });
  
  const overallAverage = totalWeight > 0 ? totalWeightedScore / totalWeight : 5;
  
  return {
    overall: overallAverage,
    individual: individualScores,
    totalWeight,
    calculatedAt: Date.now()
  };
};

// Analyze feedback trends over time
export const analyzeFeedbackTrends = (feedbackHistory) => {
  if (!Array.isArray(feedbackHistory) || feedbackHistory.length < 2) {
    return {
      trends: {},
      overall: 'stable'
    };
  }
  
  const categories = Object.keys(FEEDBACK_CATEGORIES);
  const trends = {};
  let overallTrend = 0;
  
  // Sort by timestamp
  const sortedHistory = feedbackHistory
    .filter(item => item.submittedAt && typeof item.submittedAt === 'number')
    .sort((a, b) => a.submittedAt - b.submittedAt);
  
  categories.forEach(categoryKey => {
    const values = sortedHistory
      .map(item => item[categoryKey])
      .filter(value => typeof value === 'number');
    
    if (values.length >= 2) {
      // Calculate trend using simple linear regression
      const n = values.length;
      const x = Array.from({ length: n }, (_, i) => i);
      const y = values;
      
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
      const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      
      let trend = 'stable';
      if (Math.abs(slope) > 0.1) {
        trend = slope > 0 ? 'improving' : 'declining';
      }
      
      trends[categoryKey] = {
        trend,
        slope,
        current: values[values.length - 1],
        previous: values[values.length - 2],
        change: values[values.length - 1] - values[values.length - 2],
        dataPoints: values.length
      };
      
      overallTrend += slope;
    }
  });
  
  // Calculate overall trend
  let overallTrendDirection = 'stable';
  if (Math.abs(overallTrend) > 0.2) {
    overallTrendDirection = overallTrend > 0 ? 'improving' : 'declining';
  }
  
  return {
    trends,
    overall: overallTrendDirection,
    dataPoints: sortedHistory.length,
    timeRange: {
      start: sortedHistory[0]?.submittedAt,
      end: sortedHistory[sortedHistory.length - 1]?.submittedAt
    }
  };
};

// Generate AI recommendations based on feedback
export const generateRecommendations = (feedbackData, participantCount = 0) => {
  const recommendations = [];
  const issues = [];
  const categories = Object.keys(FEEDBACK_CATEGORIES);
  
  categories.forEach(categoryKey => {
    const data = feedbackData[categoryKey];
    const category = FEEDBACK_CATEGORIES[categoryKey];
    
    if (data && data.severity) {
      const severity = data.severity;
      
      // Critical issues
      if (severity === 'CRITICAL') {
        issues.push({
          category: categoryKey,
          severity,
          value: data.average,
          message: category.warningMessage,
          priority: 'critical'
        });
        
        // Generate specific recommendations
        switch (categoryKey) {
          case 'tired':
            recommendations.push({
              type: 'rest',
              priority: 'high',
              message: 'Consider scheduling a rest break or less strenuous activity',
              category: 'activity_modification'
            });
            break;
          case 'hungry':
            recommendations.push({
              type: 'food',
              priority: 'high',
              message: 'Find nearby dining options or plan a meal stop',
              category: 'logistics'
            });
            break;
          case 'sick':
            recommendations.push({
              type: 'medical',
              priority: 'critical',
              message: 'Consider medical assistance or comfortable rest area',
              category: 'health_safety'
            });
            break;
          case 'energetic':
          case 'adventurous':
            recommendations.push({
              type: 'activity',
              priority: 'medium',
              message: 'Consider more stimulating or physically engaging activities',
              category: 'activity_modification'
            });
            break;
        }
      }
      
      // High severity issues
      else if (severity === 'HIGH') {
        recommendations.push({
          type: 'monitoring',
          priority: 'medium',
          message: `Monitor ${category.label.toLowerCase()} levels closely`,
          category: 'monitoring'
        });
      }
    }
  });
  
  // Overall trip health recommendation
  if (participantCount > 0) {
    const criticalIssues = issues.filter(issue => issue.priority === 'critical').length;
    const highIssues = issues.filter(issue => issue.priority === 'high').length;
    
    if (criticalIssues > 0) {
      recommendations.unshift({
        type: 'emergency',
        priority: 'critical',
        message: `Address ${criticalIssues} critical issue${criticalIssues > 1 ? 's' : ''} immediately`,
        category: 'immediate_action'
      });
    } else if (highIssues > 0) {
      recommendations.unshift({
        type: 'intervention',
        priority: 'high',
        message: `Consider intervention for ${highIssues} high-priority issue${highIssues > 1 ? 's' : ''}`,
        category: 'preventive_action'
      });
    }
  }
  
  return {
    recommendations,
    issues,
    summary: {
      totalIssues: issues.length,
      criticalIssues: issues.filter(i => i.priority === 'critical').length,
      highIssues: issues.filter(i => i.priority === 'high').length,
      requiresAttention: issues.some(i => i.priority === 'critical' || i.priority === 'high')
    }
  };
};

// Calculate optimal activity duration based on feedback
export const calculateOptimalDuration = (feedbackData, baseDuration = 60) => {
  const categories = ['tired', 'energetic', 'hungry'];
  let adjustmentFactor = 0;
  let reason = [];
  
  categories.forEach(categoryKey => {
    const data = feedbackData[categoryKey];
    if (data && data.average) {
      const category = FEEDBACK_CATEGORIES[categoryKey];
      const value = data.average;
      
      if (categoryKey === 'tired' && value > 6) {
        adjustmentFactor -= 0.2; // Reduce duration by 20%
        reason.push('High fatigue levels detected');
      } else if (categoryKey === 'hungry' && value > 6) {
        adjustmentFactor -= 0.15; // Reduce duration by 15%
        reason.push('Hunger levels increasing');
      } else if (categoryKey === 'energetic' && value < 4) {
        adjustmentFactor -= 0.1; // Reduce duration by 10%
        reason.push('Low energy detected');
      }
    }
  });
  
  const optimalDuration = Math.max(
    Math.round(baseDuration * (1 + adjustmentFactor)),
    15 // Minimum 15 minutes
  );
  
  return {
    recommended: optimalDuration,
    original: baseDuration,
    adjustment: Math.round(optimalDuration - baseDuration),
    adjustmentFactor: Math.round(adjustmentFactor * 100),
    reason: reason.length > 0 ? reason : ['No adjustments needed'],
    confidence: Math.min(100, 70 + (Math.abs(adjustmentFactor) * 30))
  };
};

// Format feedback data for display
export const formatFeedbackForDisplay = (feedbackData) => {
  if (!feedbackData) return null;
  
  const categories = Object.keys(FEEDBACK_CATEGORIES);
  const formatted = {};
  
  categories.forEach(categoryKey => {
    const data = feedbackData[categoryKey];
    const category = FEEDBACK_CATEGORIES[categoryKey];
    
    if (data) {
      const severity = data.severity || calculateSeverity(data.average, categoryKey);
      const severityInfo = SEVERITY_LEVELS[severity];
      
      formatted[categoryKey] = {
        ...data,
        category,
        severity,
        severityInfo,
        displayValue: `${data.average?.toFixed(1) || 'N/A'}/10`,
        trend: data.trend || 'stable',
        lastUpdated: data.lastUpdated || Date.now(),
        isOutOfRange: data.average < 1 || data.average > 10,
        needsAttention: severity === 'CRITICAL' || severity === 'HIGH'
      };
    }
  });
  
  return formatted;
};

// Validate feedback data integrity
export const validateFeedbackData = (data) => {
  const errors = [];
  const warnings = [];
  
  if (!data) {
    errors.push('No feedback data provided');
    return { isValid: false, errors, warnings };
  }
  
  // Check required fields
  const categories = Object.keys(FEEDBACK_CATEGORIES);
  
  categories.forEach(categoryKey => {
    const value = data[categoryKey];
    
    if (value === undefined || value === null) {
      errors.push(`Missing value for ${categoryKey}`);
    } else if (typeof value !== 'number') {
      errors.push(`Invalid type for ${categoryKey}: expected number, got ${typeof value}`);
    } else if (value < 1 || value > 10) {
      warnings.push(`${categoryKey} value ${value} is outside expected range (1-10)`);
    }
  });
  
  // Check for suspicious patterns
  if (categories.every(cat => data[cat] === data[categories[0]])) {
    warnings.push('All feedback values are identical - possible form manipulation');
  }
  
  const suspicious = categories.filter(cat => {
    const value = data[cat];
    return value === 1 || value === 10; // Extreme values
  }).length;
  
  if (suspicious === categories.length) {
    warnings.push('All feedback values are extreme (1 or 10) - review accuracy');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: {
      completeness: (categories.length - errors.length) / categories.length * 100,
      consistency: warnings.length === 0 ? 100 : Math.max(0, 100 - (warnings.length * 25))
    }
  };
};

// Export feedback data for analysis
export const exportFeedbackData = (feedbackData, format = 'json') => {
  const timestamp = new Date().toISOString();
  const exportData = {
    metadata: {
      exportedAt: timestamp,
      version: '1.0',
      format,
      categories: Object.keys(FEEDBACK_CATEGORIES)
    },
    data: formatFeedbackForDisplay(feedbackData),
    summary: {
      totalParticipants: feedbackData.total_participants || 0,
      dataAge: feedbackData.lastUpdated ? Date.now() - feedbackData.lastUpdated : null,
      hasErrors: false
    }
  };
  
  switch (format.toLowerCase()) {
    case 'csv':
      return convertToCSV(exportData);
    case 'json':
    default:
      return JSON.stringify(exportData, null, 2);
  }
};

// Convert feedback data to CSV format
const convertToCSV = (data) => {
  const categories = Object.keys(FEEDBACK_CATEGORIES);
  const headers = ['Category', 'Average', 'Count', 'Severity', 'Trend'];
  const rows = [headers.join(',')];
  
  categories.forEach(categoryKey => {
    const categoryData = data.data[categoryKey];
    if (categoryData) {
      rows.push([
        categoryData.category.label,
        categoryData.average?.toFixed(2) || 'N/A',
        categoryData.count || 0,
        categoryData.severity,
        categoryData.trend
      ].join(','));
    }
  });
  
  return rows.join('\n');
};

// Real-time update utilities
export const createFeedbackUpdateMessage = (feedbackData, action = 'update') => {
  return {
    type: 'feedback_update',
    action,
    timestamp: Date.now(),
    data: {
      ...feedbackData,
      lastUpdated: Date.now()
    },
    metadata: {
      source: 'client',
      version: '1.0'
    }
  };
};

export const parseFeedbackUpdateMessage = (message) => {
  if (!message || message.type !== 'feedback_update') {
    return null;
  }
  
  return {
    action: message.action,
    timestamp: message.timestamp,
    data: message.data,
    metadata: message.metadata
  };
};

export default {
  FEEDBACK_CATEGORIES,
  SEVERITY_LEVELS,
  calculateSeverity,
  calculateWeightedAverage,
  analyzeFeedbackTrends,
  generateRecommendations,
  calculateOptimalDuration,
  formatFeedbackForDisplay,
  validateFeedbackData,
  exportFeedbackData,
  createFeedbackUpdateMessage,
  parseFeedbackUpdateMessage
};