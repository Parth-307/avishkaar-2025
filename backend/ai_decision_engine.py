import os
import google.genai as genai
import googlemaps
import json
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any
import statistics

# Configure APIs
try:
    genai.configure(api_key=os.getenv("GEMINI_API_KEY", "your-gemini-key"))
    gmaps = googlemaps.Client(key=os.getenv("GOOGLE_MAPS_KEY", "your-google-maps-key"))
    AI_ENABLED = True
except:
    print("Warning: AI services not configured. Using enhanced fallback logic.")
    AI_ENABLED = False

class GeminiAIDecisionEngine:
    """Advanced AI-powered decision engine using Gemini API for all analysis"""
    
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp') if AI_ENABLED else None
        self.analysis_cache = {}  # Cache recent analyses
        
    def analyze_feedback_patterns(self, feedback_history: List[Dict]) -> Dict:
        """Use Gemini API to analyze complex patterns in feedback data"""
        
        if not feedback_history:
            return {
                "pattern_type": "no_data", 
                "confidence": 0.0, 
                "predictions": [],
                "recommendations": []
            }
        
        if AI_ENABLED and self.model:
            return self._gemini_pattern_analysis(feedback_history)
        else:
            return self._fallback_pattern_analysis(feedback_history)
    
    def _gemini_pattern_analysis(self, feedback_history: List[Dict]) -> Dict:
        """Advanced pattern analysis using Gemini API"""
        
        # Prepare context for Gemini analysis
        context = {
            "feedback_sequence": feedback_history[-10:],  # Last 10 feedbacks
            "analysis_timestamp": datetime.now().isoformat(),
            "total_data_points": len(feedback_history)
        }
        
        prompt = f"""
        You are an expert AI pattern recognition system for trip management.
        
        Analyze the feedback pattern and provide comprehensive insights:
        
        FEEDBACK HISTORY (most recent last):
        {json.dumps(context['feedback_sequence'], indent=2)}
        
        Analyze and respond with JSON containing:
        1. PATTERN IDENTIFICATION:
           - pattern_type: "improving", "declining", "stable", "volatile", "cyclical", "emergency"
           - confidence: 0.0-1.0 (your confidence in this pattern identification)
        
        2. PREDICTIONS (next 30-60 minutes):
           - Short-term predictions with probability and reasoning
           - Critical time estimates if risks are detected
        
        3. RECOMMENDATIONS:
           - Immediate actions needed
           - Threshold adjustments suggested
           - Activity modifications recommended
        
        JSON FORMAT:
        {{
            "pattern_type": "declining",
            "confidence": 0.85,
            "predictions": [
                {{
                    "timeframe": "30_minutes",
                    "prediction": "Fatigue levels will likely increase",
                    "probability": 0.7,
                    "reasoning": "Consistent negative trend in energy indicators"
                }},
                {{
                    "timeframe": "60_minutes", 
                    "prediction": "Critical intervention may be needed",
                    "probability": 0.6,
                    "reasoning": "Projected fatigue score approaching emergency threshold"
                }}
            ],
            "threshold_adjustments": {{
                "emergency_threshold": 65,
                "warning_threshold": 45,
                "reason": "Pattern indicates declining energy - lowering thresholds for early intervention"
            }},
            "recommendations": [
                {{
                    "type": "immediate_action",
                    "priority": "high",
                    "message": "Schedule proactive rest break within 20 minutes",
                    "reasoning": "Declining pattern detected with high confidence"
                }},
                {{
                    "type": "monitoring",
                    "priority": "medium", 
                    "message": "Increase monitoring frequency to every 10 minutes",
                    "reasoning": "Volatile pattern requires closer observation"
                }}
            ]
        }}
        """
        
        try:
            response = self.model.generate_content(prompt)
            clean_json = response.text.replace('```json', '').replace('```', '').strip()
            result = json.loads(clean_json)
            
            # Cache the analysis
            cache_key = f"pattern_{datetime.now().strftime('%Y%m%d_%H%M')}"
            self.analysis_cache[cache_key] = result
            
            return result
            
        except Exception as e:
            print(f"Gemini pattern analysis failed: {e}. Using fallback analysis.")
            return self._fallback_pattern_analysis(feedback_history)
    
    def _fallback_pattern_analysis(self, feedback_history: List[Dict]) -> Dict:
        """Fallback pattern analysis when Gemini API is not available"""
        
        if not feedback_history:
            return {
                "pattern_type": "no_data",
                "confidence": 0.0,
                "predictions": [],
                "threshold_adjustments": {"emergency_threshold": 75, "warning_threshold": 50},
                "recommendations": [{"type": "monitoring", "priority": "low", "message": "Collect more feedback data for better analysis"}]
            }
        
        # Simple trend analysis for fallback
        recent_feedback = feedback_history[-5:] if len(feedback_history) >= 5 else feedback_history
        
        # Calculate basic trends
        tired_scores = [f.get('tired', 3) for f in recent_feedback]
        energetic_scores = [f.get('energetic', 3) for f in recent_feedback]
        
        if len(tired_scores) >= 2:
            tired_trend = tired_scores[-1] - tired_scores[0]
            energetic_trend = energetic_scores[-1] - energetic_scores[0]
        else:
            tired_trend = 0
            energetic_trend = 0
        
        # Pattern identification
        if tired_trend > 1 and energetic_trend < -1:
            pattern_type = "declining"
            confidence = 0.7
        elif tired_trend < -1 and energetic_trend > 1:
            pattern_type = "improving"
            confidence = 0.7
        else:
            pattern_type = "stable"
            confidence = 0.5
        
        # Predictions
        predictions = []
        if pattern_type == "declining":
            predictions.append({
                "timeframe": "30_minutes",
                "prediction": "Fatigue levels likely to increase",
                "probability": 0.6,
                "reasoning": "Negative trend in recent feedback"
            })
        
        # Threshold adjustments
        if pattern_type == "declining":
            threshold_adjustments = {
                "emergency_threshold": 65,
                "warning_threshold": 45,
                "reason": "Lowered due to declining pattern"
            }
        else:
            threshold_adjustments = {
                "emergency_threshold": 75,
                "warning_threshold": 50,
                "reason": "Standard thresholds"
            }
        
        # Recommendations
        recommendations = []
        if pattern_type == "declining":
            recommendations.append({
                "type": "immediate_action",
                "priority": "high",
                "message": "Consider scheduling rest break",
                "reasoning": "Declining energy pattern detected"
            })
        
        return {
            "pattern_type": pattern_type,
            "confidence": confidence,
            "predictions": predictions,
            "threshold_adjustments": threshold_adjustments,
            "recommendations": recommendations
        }
    
    def predictive_fatigue_modeling(self, current_feedback: Dict, historical_context: List[Dict] = None) -> Dict:
        """Use Gemini API for advanced fatigue prediction"""
        
        if AI_ENABLED and self.model:
            return self._gemini_fatigue_prediction(current_feedback, historical_context)
        else:
            return self._fallback_fatigue_prediction(current_feedback, historical_context)
    
    def _gemini_fatigue_prediction(self, current_feedback: Dict, historical_context: List[Dict] = None) -> Dict:
        """Advanced fatigue prediction using Gemini API"""
        
        context_data = {
            "current_state": current_feedback,
            "recent_history": historical_context[-5:] if historical_context else [],
            "timestamp": datetime.now().isoformat(),
            "time_of_day": datetime.now().hour
        }
        
        prompt = f"""
        Predict future fatigue levels using AI analysis.
        
        CURRENT PARTICIPANT STATE:
        {json.dumps(context_data['current_state'], indent=2)}
        
        RECENT HISTORY (last 5 feedbacks):
        {json.dumps(context_data['recent_history'], indent=2)}
        
        CONTEXT:
        - Time of day: {context_data['time_of_day']}:00
        - Analysis timestamp: {context_data['timestamp']}
        
        Provide detailed predictions for:
        1. FATIGUE PROJECTIONS:
           - 15-minute prediction (0-100 scale)
           - 30-minute prediction (0-100 scale)
           - 1-hour prediction (0-100 scale)
        
        2. RISK ASSESSMENT:
           - Critical threshold breach probability
           - Time to critical fatigue (if applicable)
           - Risk factors identified
        
        3. RECOMMENDED INTERVENTIONS:
           - Proactive measures
           - Optimal timing for interventions
           - Type of interventions suggested
        
        JSON RESPONSE FORMAT:
        {{
            "fatigue_predictions": {{
                "15min_fatigue": 45,
                "30min_fatigue": 52,
                "1hour_fatigue": 68,
                "confidence": 0.8
            }},
            "risk_assessment": {{
                "critical_breach_probability": 0.3,
                "time_to_critical": "45_minutes",
                "primary_risks": ["increasing_tiredness", "energy_decline"]
            }},
            "recommended_interventions": [
                {{
                    "action": "schedule_rest_break",
                    "optimal_timing": "25_minutes",
                    "reasoning": "Preemptive rest before fatigue reaches warning level",
                    "priority": "medium"
                }},
                {{
                    "action": "monitor_closely",
                    "optimal_timing": "immediate",
                    "reasoning": "Early signs of declining energy detected",
                    "priority": "high"
                }}
            ]
        }}
        """
        
        try:
            response = self.model.generate_content(prompt)
            clean_json = response.text.replace('```json', '').replace('```', '').strip()
            return json.loads(clean_json)
        except Exception as e:
            print(f"Gemini fatigue prediction failed: {e}")
            return self._fallback_fatigue_prediction(current_feedback, historical_context)
    
    def _fallback_fatigue_prediction(self, current_feedback: Dict, historical_context: List[Dict] = None) -> Dict:
        """Fallback fatigue prediction"""
        
        from models import FeedbackAnalyzer
        current_fatigue = FeedbackAnalyzer.calculate_fatigue_score(current_feedback)
        
        # Simple projection based on current state
        if historical_context and len(historical_context) >= 2:
            recent_scores = [FeedbackAnalyzer.calculate_fatigue_score(fb) for fb in historical_context[-3:]]
            trend = recent_scores[-1] - recent_scores[0] if len(recent_scores) > 1 else 0
            
            # Project forward
            fatigue_15min = max(0, min(100, current_fatigue + trend * 0.5))
            fatigue_30min = max(0, min(100, current_fatigue + trend * 1))
            fatigue_1hour = max(0, min(100, current_fatigue + trend * 2))
        else:
            fatigue_15min = current_fatigue
            fatigue_30min = current_fatigue
            fatigue_1hour = current_fatigue
        
        # Risk assessment
        critical_probability = 0.1 if fatigue_1hour < 75 else 0.5
        time_to_critical = "not_expected" if fatigue_1hour < 75 else "60_minutes"
        
        # Interventions
        interventions = []
        if fatigue_30min > 60:
            interventions.append({
                "action": "schedule_rest_break",
                "optimal_timing": "20_minutes",
                "reasoning": "Projected fatigue approaching warning level",
                "priority": "medium"
            })
        
        return {
            "fatigue_predictions": {
                "15min_fatigue": round(fatigue_15min, 1),
                "30min_fatigue": round(fatigue_30min, 1),
                "1hour_fatigue": round(fatigue_1hour, 1),
                "confidence": 0.6 if historical_context else 0.3
            },
            "risk_assessment": {
                "critical_breach_probability": critical_probability,
                "time_to_critical": time_to_critical,
                "primary_risks": ["fatigue_increase"] if fatigue_30min > 50 else []
            },
            "recommended_interventions": interventions
        }
    
    def smart_threshold_analysis(self, feedback_data: Dict, context: Dict = None) -> Dict:
        """Use Gemini API for intelligent threshold analysis and adjustment"""
        
        if AI_ENABLED and self.model:
            return self._gemini_threshold_analysis(feedback_data, context)
        else:
            return self._fallback_threshold_analysis(feedback_data, context)
    
    def _gemini_threshold_analysis(self, feedback_data: Dict, context: Dict = None) -> Dict:
        """Smart threshold analysis using Gemini API"""
        
        context_info = context or {}
        current_time = datetime.now()
        
        analysis_context = {
            "current_feedback": feedback_data,
            "trip_context": {
                "time_of_day": current_time.hour,
                "activity_type": context_info.get('activity_type', 'general'),
                "group_size": context_info.get('group_size', 5),
                "trip_duration_hours": context_info.get('trip_duration_hours', 4),
                "location": context_info.get('location', 'unknown')
            },
            "timestamp": current_time.isoformat()
        }
        
        prompt = f"""
        Perform intelligent threshold analysis for trip management system.
        
        CURRENT PARTICIPANT STATE:
        {json.dumps(analysis_context['current_feedback'], indent=2)}
        
        TRIP CONTEXT:
        {json.dumps(analysis_context['trip_context'], indent=2)}
        
        Analyze and provide:
        1. ADAPTIVE THRESHOLDS:
           - Emergency threshold (0-100)
           - Warning threshold (0-100)
           - Rationale for adjustments
        
        2. CONTEXTUAL FACTORS:
           - How context affects threshold selection
           - Risk factors specific to current situation
           - Confidence in threshold recommendations
        
        3. RECOMMENDATIONS:
           - Immediate actions based on current state
           - Monitoring recommendations
           - Preventive measures
        
        JSON RESPONSE:
        {{
            "adaptive_thresholds": {{
                "emergency_threshold": 70,
                "warning_threshold": 50,
                "rationale": "Evening time with physical activity - adjusted for typical energy patterns"
            }},
            "contextual_analysis": {{
                "risk_factors": ["evening_fatigue", "physical_activity"],
                "mitigating_factors": ["good_group_energy"],
                "confidence": 0.8
            }},
            "current_assessment": {{
                "status": "normal|warning|critical",
                "immediate_action_required": false,
                "monitoring_level": "standard|enhanced|intensive"
            }},
            "recommendations": [
                {{
                    "type": "monitoring",
                    "priority": "medium",
                    "message": "Standard monitoring sufficient",
                    "reasoning": "Current state within normal parameters"
                }}
            ]
        }}
        """
        
        try:
            response = self.model.generate_content(prompt)
            clean_json = response.text.replace('```json', '').replace('```', '').strip()
            return json.loads(clean_json)
        except Exception as e:
            print(f"Gemini threshold analysis failed: {e}")
            return self._fallback_threshold_analysis(feedback_data, context)
    
    def _fallback_threshold_analysis(self, feedback_data: Dict, context: Dict = None) -> Dict:
        """Fallback threshold analysis"""
        
        from models import FeedbackAnalyzer
        current_fatigue = FeedbackAnalyzer.calculate_fatigue_score(feedback_data)
        
        # Base thresholds
        emergency_threshold = 75
        warning_threshold = 50
        
        # Context adjustments
        if context:
            time_of_day = datetime.now().hour
            activity_type = context.get('activity_type', 'general')
            
            if 14 <= time_of_day <= 18:  # Afternoon dip
                emergency_threshold -= 5
                warning_threshold -= 5
            elif activity_type == 'physical':
                emergency_threshold -= 10
                warning_threshold -= 5
        
        # Assessment
        if current_fatigue >= emergency_threshold:
            status = "critical"
            action_required = True
            monitoring_level = "intensive"
        elif current_fatigue >= warning_threshold:
            status = "warning"
            action_required = False
            monitoring_level = "enhanced"
        else:
            status = "normal"
            action_required = False
            monitoring_level = "standard"
        
        return {
            "adaptive_thresholds": {
                "emergency_threshold": emergency_threshold,
                "warning_threshold": warning_threshold,
                "rationale": "Context-adjusted thresholds based on activity and time"
            },
            "contextual_analysis": {
                "risk_factors": [],
                "mitigating_factors": [],
                "confidence": 0.6
            },
            "current_assessment": {
                "status": status,
                "immediate_action_required": action_required,
                "monitoring_level": monitoring_level
            },
            "recommendations": [
                {
                    "type": "monitoring",
                    "priority": "medium" if status == "warning" else "low",
                    "message": f"{status.capitalize()} status - {monitoring_level} monitoring recommended",
                    "reasoning": f"Fatigue score {current_fatigue:.1f} is {status}"
                }
            ]
        }
    
    def generate_ai_recommendations(self, analysis_results: Dict, activity_context: Dict = None) -> Dict:
        """Generate comprehensive AI recommendations using Gemini API"""
        
        if AI_ENABLED and self.model:
            return self._gemini_recommendations(analysis_results, activity_context)
        else:
            return self._fallback_recommendations(analysis_results, activity_context)
    
    def _gemini_recommendations(self, analysis_results: Dict, activity_context: Dict = None) -> Dict:
        """Generate AI recommendations using Gemini API"""
        
        context_info = activity_context or {}
        
        prompt = f"""
        Generate intelligent recommendations based on comprehensive analysis.
        
        ANALYSIS RESULTS:
        {json.dumps(analysis_results, indent=2)}
        
        ACTIVITY CONTEXT:
        {json.dumps(context_info, indent=2)}
        
        Current time: {datetime.now().isoformat()}
        
        Provide actionable recommendations:
        1. IMMEDIATE ACTIONS (next 15 minutes)
        2. SHORT-TERM ACTIONS (next hour)
        3. ACTIVITY MODIFICATIONS
        4. MONITORING STRATEGY
        
        JSON FORMAT:
        {{
            "immediate_actions": [
                {{
                    "action": "schedule_rest_break",
                    "urgency": "high|medium|low",
                    "description": "Specific action to take",
                    "reasoning": "Why this action is needed",
                    "expected_outcome": "What this will achieve"
                }}
            ],
            "short_term_actions": [
                {{
                    "action": "modify_activity_intensity",
                    "timeline": "30_minutes",
                    "description": "Adjust current or upcoming activities",
                    "reasoning": "Based on fatigue projections"
                }}
            ],
            "activity_modifications": [
                {{
                    "current_activity": "hiking",
                    "suggested_alternative": "scenic_walk",
                    "reasoning": "Reduce physical intensity while maintaining experience",
                    "location": "nearby_low_intensity_venue"
                }}
            ],
            "monitoring_strategy": {{
                "frequency": "every_10_minutes",
                "focus_areas": ["energy_levels", "fatigue_signs"],
                "alert_conditions": ["fatigue > 60", "energy < 2"]
            }},
            "overall_priority": "high|medium|low",
            "confidence": 0.85
        }}
        """
        
        try:
            response = self.model.generate_content(prompt)
            clean_json = response.text.replace('```json', '').replace('```', '').strip()
            return json.loads(clean_json)
        except Exception as e:
            print(f"Gemini recommendations failed: {e}")
            return self._fallback_recommendations(analysis_results, activity_context)
    
    def _fallback_recommendations(self, analysis_results: Dict, activity_context: Dict = None) -> Dict:
        """Fallback recommendations"""
        
        pattern_type = analysis_results.get('pattern_analysis', {}).get('pattern_type', 'stable')
        threshold_level = analysis_results.get('threshold_analysis', {}).get('current_assessment', {}).get('status', 'normal')
        
        immediate_actions = []
        short_term_actions = []
        
        if pattern_type == 'declining':
            immediate_actions.append({
                "action": "schedule_rest_break",
                "urgency": "high",
                "description": "Plan rest break within 20 minutes",
                "reasoning": "Declining energy pattern detected",
                "expected_outcome": "Prevent critical fatigue"
            })
        elif threshold_level == 'critical':
            immediate_actions.append({
                "action": "immediate_intervention",
                "urgency": "high",
                "description": "Consider ending current activity",
                "reasoning": "Critical fatigue threshold breached",
                "expected_outcome": "Ensure participant safety and comfort"
            })
        
        return {
            "immediate_actions": immediate_actions,
            "short_term_actions": short_term_actions,
            "activity_modifications": [],
            "monitoring_strategy": {
                "frequency": "every_15_minutes" if pattern_type == 'declining' else "every_30_minutes",
                "focus_areas": ["fatigue_indicators"],
                "alert_conditions": []
            },
            "overall_priority": "high" if pattern_type == 'declining' or threshold_level == 'critical' else "medium",
            "confidence": 0.6
        }

# Main integration function
def comprehensive_ai_analysis(feedback_data: Dict, historical_feedback: List[Dict] = None, context: Dict = None) -> Dict:
    """Main function for comprehensive AI analysis using Gemini API"""
    
    engine = GeminiAIDecisionEngine()
    
    # Perform all analyses
    pattern_analysis = engine.analyze_feedback_patterns(historical_feedback or [feedback_data])
    fatigue_predictions = engine.predictive_fatigue_modeling(feedback_data, historical_feedback)
    threshold_analysis = engine.smart_threshold_analysis(feedback_data, context)
    
    # Combine results
    combined_analysis = {
        'pattern_analysis': pattern_analysis,
        'fatigue_predictions': fatigue_predictions,
        'threshold_analysis': threshold_analysis,
        'analysis_timestamp': datetime.now().isoformat()
    }
    
    # Generate recommendations
    recommendations = engine.generate_ai_recommendations(combined_analysis, context)
    
    # Final assessment
    overall_priority = recommendations.get('overall_priority', 'medium')
    confidence = (pattern_analysis.get('confidence', 0.5) + 
                 fatigue_predictions.get('fatigue_predictions', {}).get('confidence', 0.5) + 
                 threshold_analysis.get('contextual_analysis', {}).get('confidence', 0.5)) / 3
    
    return {
        'comprehensive_analysis': combined_analysis,
        'ai_recommendations': recommendations,
        'overall_assessment': {
            'priority_level': overall_priority,
            'confidence_score': round(confidence, 2),
            'recommended_action': 'immediate_intervention' if overall_priority == 'high' else 
                                'proactive_planning' if overall_priority == 'medium' else 'continue_monitoring',
            'next_review_timestamp': (datetime.now() + timedelta(minutes=15 if overall_priority == 'high' else 30)).isoformat()
        },
        'analysis_metadata': {
            'ai_engine': 'gemini-2.0-flash-exp',
            'analysis_version': '2.0',
            'data_points_analyzed': len(historical_feedback) if historical_feedback else 1,
            'real_time_processing': True
        }
    }