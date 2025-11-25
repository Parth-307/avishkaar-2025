import os
import google.genai as genai
import googlemaps
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
import random

# Configure APIs
try:
    genai.configure(api_key=os.getenv("GEMINI_API_KEY", "your-gemini-key"))
    gmaps = googlemaps.Client(key=os.getenv("GOOGLE_MAPS_KEY", "your-google-maps-key"))
    AI_ENABLED = True
except:
    print("Warning: AI services not configured. Using enhanced fallback logic.")
    AI_ENABLED = False

class GeminiRecommendationEngine:
    """Advanced AI-powered recommendation engine using Gemini API"""
    
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp') if AI_ENABLED else None
        self.recommendation_cache = {}  # Cache recent recommendations
        self.preference_history = {}  # Track user/trip preferences
        self.optimization_strategies = {
            "conservative": "Minimize changes, focus on safety and comfort",
            "balanced": "Balance optimization with trip coherence",
            "aggressive": "Maximize optimization, willing to make significant changes",
            "contextual": "Adapt optimization style to current situation"
        }
        
    def generate_intelligent_recommendations(self, analysis_results: Dict, activity_context: Dict = None, optimization_style: str = "balanced") -> Dict:
        """Generate comprehensive AI-powered recommendations using Gemini API"""
        
        if AI_ENABLED and self.model:
            return self._gemini_recommendations(analysis_results, activity_context, optimization_style)
        else:
            return self._fallback_recommendations(analysis_results, activity_context, optimization_style)
    
    def _gemini_recommendations(self, analysis_results: Dict, activity_context: Dict = None, optimization_style: str = "balanced") -> Dict:
        """Generate AI recommendations using Gemini API"""
        
        context_info = activity_context or {}
        
        # Prepare comprehensive context for Gemini
        full_context = {
            "analysis_results": analysis_results,
            "activity_context": context_info,
            "optimization_style": optimization_style,
            "current_time": datetime.now().isoformat(),
            "recommendation_objective": "optimize_trip_experience_while_maintaining_coherence"
        }
        
        prompt = f"""
        Generate intelligent trip optimization recommendations using advanced AI analysis.
        
        COMPREHENSIVE ANALYSIS:
        {json.dumps(full_context['analysis_results'], indent=2)}
        
        ACTIVITY CONTEXT:
        {json.dumps(full_context['activity_context'], indent=2)}
        
        OPTIMIZATION STYLE: {full_context['optimization_style']}
        OBJECTIVE: {full_context['recommendation_objective']}
        
        Generate detailed recommendations:
        
        1. IMMEDIATE ACTIONS (next 15 minutes)
        2. SHORT-TERM MODIFICATIONS (next 1-2 hours)
        3. ACTIVITY OPTIMIZATIONS (specific activity changes)
        4. LONG-TERM STRATEGY (rest of trip)
        5. MONITORING & ADAPTATION PLAN
        
        For each recommendation, provide:
        - Specific action items
        - Reasoning based on AI analysis
        - Expected outcomes
        - Priority level (high/medium/low)
        - Implementation timeline
        - Success metrics
        
        JSON FORMAT:
        {{
            "immediate_actions": [
                {{
                    "action_type": "rest_break|activity_modification|monitoring|intervention",
                    "priority": "high|medium|low",
                    "description": "Specific action to take",
                    "timeline": "5_minutes|15_minutes|30_minutes",
                    "reasoning": "Why this action is needed based on AI analysis",
                    "expected_outcome": "What this will achieve",
                    "success_criteria": "How to measure success",
                    "resources_needed": ["list of required resources"],
                    "risk_assessment": "low|medium|high"
                }}
            ],
            "short_term_modifications": [
                {{
                    "modification_type": "schedule_change|activity_swap|intensity_adjustment",
                    "description": "Detailed modification plan",
                    "timeline": "1_hour|2_hours|end_of_day",
                    "impact_assessment": "How this affects the overall trip experience",
                    "alternative_options": ["backup_plan_1", "backup_plan_2"],
                    "implementation_steps": ["step1", "step2", "step3"]
                }}
            ],
            "activity_optimizations": [
                {{
                    "current_activity": "current_activity_name",
                    "optimization_suggestion": "detailed_suggestion",
                    "location_alternatives": [
                        {{
                            "name": "alternative_location",
                            "address": "full_address",
                            "lat": 0.0,
                            "lng": 0.0,
                            "reasoning": "Why this alternative is better"
                        }}
                    ],
                    "timing_adjustments": {{
                        "start_time_adjustment": "+30_minutes",
                        "duration_adjustment": "shorten_by_30_minutes",
                        "reasoning": "Why timing adjustment is recommended"
                    }},
                    "participant_considerations": ["specific_considerations_for_group"]
                }}
            ],
            "long_term_strategy": {{
                "remaining_trip_vision": "How the rest of the trip should unfold",
                "key_principles": ["principle1", "principle2"],
                "flexibility_boundaries": "What should remain flexible vs fixed",
                "energy_management": "How to manage group energy for remainder of trip",
                "contingency_plans": [
                    {{
                        "scenario": "weather_change",
                        "response": "indoor_alternatives"
                    }},
                    {{
                        "scenario": "fatigue_escalation",
                        "response": "rest_heavy_schedule"
                    }}
                ]
            }},
            "monitoring_plan": {{
                "key_metrics": ["energy_levels", "fatigue_signs", "group_satisfaction"],
                "check_in_frequency": "every_15_minutes|every_30_minutes",
                "alert_conditions": ["fatigue > 60", "energy < 2"],
                "escalation_triggers": ["condition1", "condition2"],
                "adaptation_protocols": ["protocol_for_increasing_fatigue", "protocol_for_optimal_energy"]
            }},
            "overall_assessment": {{
                "optimization_confidence": 0.85,
                "risk_level": "low|medium|high",
                "expected_improvement": "15% better group satisfaction",
                "key_success_factors": ["factor1", "factor2"],
                "monitoring_requirements": "What needs close monitoring"
            }}
        }}
        
        IMPORTANT: Provide specific, actionable recommendations that can be implemented immediately.
        Base all recommendations on the AI analysis results provided.
        Consider the optimization style when determining the aggressiveness of recommendations.
        """
        
        try:
            response = self.model.generate_content(prompt)
            clean_json = response.text.replace('```json', '').replace('```', '').strip()
            recommendations = json.loads(clean_json)
            
            # Cache the recommendations
            cache_key = f"recommendations_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            self.recommendation_cache[cache_key] = recommendations
            
            return recommendations
            
        except Exception as e:
            print(f"Gemini recommendations failed: {e}")
            return self._fallback_recommendations(analysis_results, activity_context, optimization_style)
    
    def _fallback_recommendations(self, analysis_results: Dict, activity_context: Dict = None, optimization_style: str = "balanced") -> Dict:
        """Fallback recommendations without AI"""
        
        pattern_type = analysis_results.get("pattern_analysis", {}).get("pattern_type", "stable")
        fatigue_predictions = analysis_results.get("fatigue_predictions", {})
        threshold_assessment = analysis_results.get("threshold_analysis", {}).get("current_assessment", {})
        
        # Base recommendations on analysis
        immediate_actions = []
        short_term_modifications = []
        activity_optimizations = []
        
        # Immediate actions based on analysis
        if pattern_type == "declining":
            immediate_actions.append({
                "action_type": "rest_break",
                "priority": "high",
                "description": "Schedule 20-minute rest break within next 15 minutes",
                "timeline": "15_minutes",
                "reasoning": "Declining energy pattern detected",
                "expected_outcome": "Prevent critical fatigue escalation",
                "success_criteria": "Energy levels stabilize or improve",
                "resources_needed": ["comfortable_seating", "water"],
                "risk_assessment": "low"
            })
        
        if threshold_assessment.get("status") == "critical":
            immediate_actions.append({
                "action_type": "intervention",
                "priority": "high",
                "description": "Consider ending current activity immediately",
                "timeline": "5_minutes",
                "reasoning": "Critical fatigue threshold breached",
                "expected_outcome": "Ensure participant safety and comfort",
                "resources_needed": ["alternative_venue"],
                "risk_assessment": "medium"
            })
        
        # Short-term modifications
        if fatigue_predictions.get("fatigue_predictions", {}).get("1hour_fatigue", 0) > 65:
            short_term_modifications.append({
                "modification_type": "schedule_change",
                "description": "Replace high-intensity activities with low-energy alternatives",
                "timeline": "2_hours",
                "impact_assessment": "Maintain trip experience while managing fatigue",
                "alternative_options": ["cafe_visit", "relaxed_sightseeing", "cultural_activity"],
                "implementation_steps": ["identify_alternatives", "assess_feasibility", "communicate_changes"]
            })
        
        # Activity optimizations
        current_activity = activity_context.get("current_activity", {}) if activity_context else {}
        if current_activity:
            if pattern_type == "declining" and current_activity.get("type") == "physical":
                activity_optimizations.append({
                    "current_activity": current_activity.get("title", "Current Activity"),
                    "optimization_suggestion": "Reduce intensity or switch to low-impact version",
                    "location_alternatives": [],
                    "timing_adjustments": {
                        "start_time_adjustment": "+15_minutes",
                        "duration_adjustment": "shorten_by_30_minutes",
                        "reasoning": "Account for declining energy"
                    },
                    "participant_considerations": ["Monitor for signs of exhaustion", "Allow frequent breaks"]
                })
        
        return {
            "immediate_actions": immediate_actions,
            "short_term_modifications": short_term_modifications,
            "activity_optimizations": activity_optimizations,
            "long_term_strategy": {
                "remaining_trip_vision": "Continue trip with managed energy levels",
                "key_principles": ["safety_first", "group_cohesion", "flexible_planning"],
                "flexibility_boundaries": "Core activities can be modified, transportation fixed",
                "energy_management": "Prioritize rest and comfort for remaining activities",
                "contingency_plans": [
                    {
                        "scenario": "energy_further_declines",
                        "response": "implement_rest_heavy_schedule"
                    },
                    {
                        "scenario": "energy_improves",
                        "response": "gradually_increase_intensity"
                    }
                ]
            },
            "monitoring_plan": {
                "key_metrics": ["energy_levels", "fatigue_signs", "group_mood"],
                "check_in_frequency": "every_15_minutes" if pattern_type == "declining" else "every_30_minutes",
                "alert_conditions": ["fatigue > 60", "energy < 2"],
                "escalation_triggers": ["critical_threshold_breach", "participant_discomfort"],
                "adaptation_protocols": ["increase_rest_frequency", "modify_activity_intensity"]
            },
            "overall_assessment": {
                "optimization_confidence": 0.7 if pattern_type != "stable" else 0.5,
                "risk_level": "medium" if pattern_type == "declining" else "low",
                "expected_improvement": "10-15% better group experience",
                "key_success_factors": ["timely_intervention", "clear_communication"],
                "monitoring_requirements": "Close monitoring of fatigue and energy indicators"
            }
        }
    
    def optimize_activity_suggestions(self, current_activities: List[Dict], feedback_analysis: Dict, location_context: Dict = None) -> Dict:
        """Generate AI-powered activity optimization suggestions"""
        
        if AI_ENABLED and self.model:
            return self._gemini_activity_optimization(current_activities, feedback_analysis, location_context)
        else:
            return self._fallback_activity_optimization(current_activities, feedback_analysis, location_context)
    
    def _gemini_activity_optimization(self, current_activities: List[Dict], feedback_analysis: Dict, location_context: Dict = None) -> Dict:
        """Use Gemini API for advanced activity optimization"""
        
        context = {
            "current_activities": current_activities,
            "feedback_analysis": feedback_analysis,
            "location_context": location_context or {},
            "optimization_goal": "maximize_group_satisfaction_while_maintaining_coherence"
        }
        
        prompt = f"""
        Optimize activity suggestions based on AI analysis and current itinerary.
        
        CURRENT ITINERARY:
        {json.dumps(context['current_activities'], indent=2)}
        
        FEEDBACK ANALYSIS:
        {json.dumps(context['feedback_analysis'], indent=2)}
        
        LOCATION CONTEXT:
        {json.dumps(context['location_context'], indent=2)}
        
        OPTIMIZATION GOAL: {context['optimization_goal']}
        
        Provide specific optimization recommendations:
        
        JSON FORMAT:
        {{
            "activity_optimizations": [
                {{
                    "activity_id": 123,
                    "current_title": "Hiking Tour",
                    "optimization_type": "replace|modify|timing|intensity",
                    "suggested_changes": {{
                        "new_title": "Scenic Walk",
                        "new_type": "relaxing",
                        "duration_adjustment": "-30_minutes",
                        "location_change": {{
                            "new_location": "Park Trail",
                            "address": "123 Park Ave",
                            "lat": 0.0,
                            "lng": 0.0
                        }},
                        "intensity_modification": "low_impact",
                        "reasoning": "Why this optimization is recommended"
                    }},
                    "impact_assessment": "How this affects the overall trip experience",
                    "implementation_difficulty": "easy|medium|hard"
                }}
            ],
            "new_activity_suggestions": [
                {{
                    "activity_type": "rest|food|cultural|entertainment",
                    "title": "Suggested Activity",
                    "description": "What this activity involves",
                    "optimal_timing": "after_current_activity|in_2_hours|evening",
                    "location_requirements": ["indoor", "seating_available"],
                    "duration": "45_minutes",
                    "reasoning": "Why this suggestion fits the current situation"
                }}
            ],
            "schedule_optimizations": [
                {{
                    "optimization_type": "spacing|timing|sequence",
                    "description": "How to optimize the schedule",
                    "specific_changes": [
                        {{
                            "from_activity": "Activity A",
                            "to_activity": "Activity B",
                            "current_gap": "30_minutes",
                            "suggested_gap": "60_minutes",
                            "reasoning": "Why this gap adjustment is needed"
                        }}
                    ]
                }}
            ],
            "overall_assessment": {{
                "optimization_confidence": 0.85,
                "expected_improvement": "specific_percentage_or_description",
                "coherence_maintained": true,
                "implementation_timeline": "2-4_hours"
            }}
        }}
        """
        
        try:
            response = self.model.generate_content(prompt)
            clean_json = response.text.replace('```json', '').replace('```', '').strip()
            return json.loads(clean_json)
        except Exception as e:
            print(f"Gemini activity optimization failed: {e}")
            return self._fallback_activity_optimization(current_activities, feedback_analysis, location_context)
    
    def _fallback_activity_optimization(self, current_activities: List[Dict], feedback_analysis: Dict, location_context: Dict = None) -> Dict:
        """Fallback activity optimization"""
        
        pattern_type = feedback_analysis.get("pattern_analysis", {}).get("pattern_type", "stable")
        
        activity_optimizations = []
        new_suggestions = []
        
        if pattern_type == "declining":
            # Suggest less intensive activities
            for activity in current_activities:
                if activity.get("type") in ["physical", "adventurous"]:
                    activity_optimizations.append({
                        "activity_id": activity.get("id"),
                        "current_title": activity.get("title", "Activity"),
                        "optimization_type": "replace",
                        "suggested_changes": {
                            "new_title": f"Relaxed {activity.get('title', 'Activity')}",
                            "new_type": "relaxing",
                            "duration_adjustment": "-30_minutes",
                            "intensity_modification": "low_impact",
                            "reasoning": "Reduce intensity due to declining energy pattern"
                        },
                        "impact_assessment": "Maintains experience while managing fatigue",
                        "implementation_difficulty": "medium"
                    })
            
            # Add rest suggestion
            new_suggestions.append({
                "activity_type": "rest",
                "title": "Comfort Break",
                "description": "Quiet rest with comfortable seating",
                "optimal_timing": "after_current_activity",
                "location_requirements": ["indoor", "comfortable_seating"],
                "duration": "30_minutes",
                "reasoning": "Address declining energy pattern"
            })
        
        return {
            "activity_optimizations": activity_optimizations,
            "new_activity_suggestions": new_suggestions,
            "schedule_optimizations": [],
            "overall_assessment": {
                "optimization_confidence": 0.7 if pattern_type != "stable" else 0.4,
                "expected_improvement": "Better energy management",
                "coherence_maintained": True,
                "implementation_timeline": "1-2_hours"
            }
        }
    
    def find_alternative_locations(self, current_location: Dict, search_criteria: Dict, lat: float = None, lng: float = None) -> List[Dict]:
        """Find alternative locations using Google Maps API and AI recommendations"""
        
        if not AI_ENABLED or not gmaps:
            return self._fallback_location_search(current_location, search_criteria, lat, lng)
        
        try:
            # Use Google Maps API for location search
            search_query = search_criteria.get("search_query", "alternative venue")
            radius = search_criteria.get("radius", 5000)  # 5km default
            
            places = gmaps.places_nearby(
                location=(lat, lng) if lat and lng else (0, 0),
                radius=radius,
                keyword=search_query,
                type=search_criteria.get("place_type", "point_of_interest")
            )
            
            alternatives = []
            for place in places.get('results', [])[:5]:  # Top 5 results
                alternatives.append({
                    "name": place.get('name', ''),
                    "address": place.get('vicinity', place.get('formatted_address', '')),
                    "lat": place['geometry']['location']['lat'],
                    "lng": place['geometry']['location']['lng'],
                    "rating": place.get('rating', 0),
                    "types": place.get('types', []),
                    "price_level": place.get('price_level', 0),
                    "opening_hours": place.get('opening_hours', {}),
                    "photo_reference": place.get('photos', [{}])[0].get('photo_reference', '') if place.get('photos') else ''
                })
            
            return alternatives
            
        except Exception as e:
            print(f"Google Maps search failed: {e}")
            return self._fallback_location_search(current_location, search_criteria, lat, lng)
    
    def _fallback_location_search(self, current_location: Dict, search_criteria: Dict, lat: float = None, lng: float = None) -> List[Dict]:
        """Fallback location search"""
        # Return basic fallback locations
        return [
            {
                "name": f"Alternative to {current_location.get('name', 'current venue')}",
                "address": "Nearby location",
                "lat": lat or 0,
                "lng": lng or 0,
                "rating": 4.0,
                "types": ["establishment"],
                "reasoning": "Alternative based on search criteria"
            }
        ]
    
    def learn_from_feedback(self, trip_id: int, recommendations_given: Dict, actual_outcomes: Dict) -> Dict:
        """Learn from the effectiveness of recommendations to improve future suggestions"""
        
        # Store feedback for learning
        learning_data = {
            "trip_id": trip_id,
            "recommendations": recommendations_given,
            "outcomes": actual_outcomes,
            "timestamp": datetime.now().isoformat(),
            "effectiveness_score": self._calculate_effectiveness_score(recommendations_given, actual_outcomes)
        }
        
        if trip_id not in self.preference_history:
            self.preference_history[trip_id] = []
        
        self.preference_history[trip_id].append(learning_data)
        
        # Generate learning insights
        return {
            "learning_recorded": True,
            "effectiveness_score": learning_data["effectiveness_score"],
            "key_insights": self._extract_learning_insights(learning_data),
            "improvement_suggestions": self._generate_improvement_suggestions(learning_data)
        }
    
    def _calculate_effectiveness_score(self, recommendations: Dict, outcomes: Dict) -> float:
        """Calculate how effective the recommendations were"""
        # Simple scoring based on outcome metrics
        score = 0.5  # Base score
        
        # Adjust based on achieved outcomes
        if outcomes.get("fatigue_improved", False):
            score += 0.2
        if outcomes.get("group_satisfaction_improved", False):
            score += 0.2
        if outcomes.get("activities_completed_as_planned", True):
            score += 0.1
        
        return min(1.0, score)
    
    def _extract_learning_insights(self, learning_data: Dict) -> List[str]:
        """Extract key insights from the learning data"""
        insights = []
        
        effectiveness = learning_data["effectiveness_score"]
        if effectiveness > 0.8:
            insights.append("Recommendations were highly effective - consider similar approaches")
        elif effectiveness < 0.4:
            insights.append("Recommendations need refinement - analyze what didn't work")
        
        # Add more specific insights based on outcomes
        if learning_data["outcomes"].get("fatigue_improved", False):
            insights.append("Fatigue management strategies were successful")
        
        return insights
    
    def _generate_improvement_suggestions(self, learning_data: Dict) -> List[str]:
        """Generate suggestions for improving future recommendations"""
        suggestions = []
        
        effectiveness = learning_data["effectiveness_score"]
        if effectiveness < 0.6:
            suggestions.append("Consider more conservative recommendations for similar situations")
            suggestions.append("Implement more frequent check-ins during recommendation execution")
        
        return suggestions
    
    def get_optimization_summary(self, recommendations: Dict) -> Dict:
        """Get a summary of optimization recommendations for easy consumption"""
        
        immediate_count = len(recommendations.get("immediate_actions", []))
        modification_count = len(recommendations.get("short_term_modifications", []))
        activity_opt_count = len(recommendations.get("activity_optimizations", []))
        
        high_priority_actions = [
            action for action in recommendations.get("immediate_actions", [])
            if action.get("priority") == "high"
        ]
        
        return {
            "total_recommendations": immediate_count + modification_count + activity_opt_count,
            "high_priority_actions": len(high_priority_actions),
            "implementation_timeline": self._determine_timeline(recommendations),
            "expected_outcomes": recommendations.get("overall_assessment", {}).get("expected_improvement", ""),
            "confidence_level": recommendations.get("overall_assessment", {}).get("optimization_confidence", 0.5),
            "risk_assessment": recommendations.get("overall_assessment", {}).get("risk_level", "medium"),
            "next_review_time": (datetime.now() + timedelta(minutes=30)).isoformat(),
            "key_actions": [action.get("description", "") for action in high_priority_actions[:3]]
        }
    
    def _determine_timeline(self, recommendations: Dict) -> str:
        """Determine overall implementation timeline from recommendations"""
        max_timeline = "immediate"
        
        for action in recommendations.get("immediate_actions", []):
            timeline = action.get("timeline", "immediate")
            if "2_hours" in timeline or "end_of_day" in timeline:
                max_timeline = "long_term"
            elif "1_hour" in timeline:
                max_timeline = "medium_term"
        
        return max_timeline

# Integration function for easy usage
def generate_comprehensive_recommendations(feedback_data: Dict, analysis_results: Dict, activity_context: Dict = None, optimization_style: str = "balanced") -> Dict:
    """Main function for generating comprehensive AI recommendations"""
    
    engine = GeminiRecommendationEngine()
    
    # Generate recommendations
    recommendations = engine.generate_intelligent_recommendations(analysis_results, activity_context, optimization_style)
    
    # Get summary for quick consumption
    summary = engine.get_optimization_summary(recommendations)
    
    return {
        "recommendations": recommendations,
        "summary": summary,
        "metadata": {
            "engine_version": "2.0",
            "optimization_style": optimization_style,
            "generation_timestamp": datetime.now().isoformat(),
            "ai_enabled": AI_ENABLED
        }
    }