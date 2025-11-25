import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from collections import defaultdict, deque

class SmartThresholdManager:
    """Intelligent threshold management system with Gemini AI integration"""
    
    def __init__(self):
        self.threshold_configs = {}  # Store threshold configurations per trip
        self.threshold_history = defaultdict(lambda: deque(maxlen=100))  # Track threshold changes
        self.adaptation_cache = {}  # Cache recent adaptations
        self.ai_engine = None  # Will be set when integrated
        
    def set_ai_engine(self, ai_engine):
        """Set the AI engine for intelligent threshold management"""
        self.ai_engine = ai_engine
    
    def initialize_default_thresholds(self, trip_id: int) -> Dict:
        """Initialize default threshold configuration for a trip"""
        
        default_config = {
            "trip_id": trip_id,
            "base_thresholds": {
                "emergency": 75,
                "warning": 50,
                "monitor": 25
            },
            "category_weights": {
                "tired": 0.3,
                "energetic": 0.25,
                "sick": 0.25,
                "hungry": 0.1,
                "adventurous": 0.1
            },
            "adaptive_settings": {
                "enabled": True,
                "learning_rate": 0.1,
                "min_adjustment": -15,
                "max_adjustment": 15,
                "adaptation_frequency": "activity_boundary"  # per_activity, per_hour, activity_boundary
            },
            "context_factors": {
                "time_of_day_adjustments": {
                    "morning": {"emergency": 5, "warning": 5},     # 6-10 AM
                    "afternoon": {"emergency": -5, "warning": -5}, # 2-6 PM (post-lunch dip)
                    "evening": {"emergency": -10, "warning": -5},  # 8-11 PM
                    "night": {"emergency": -15, "warning": -10}    # 11 PM-6 AM
                },
                "activity_type_adjustments": {
                    "physical": {"emergency": -10, "warning": -5},
                    "relaxing": {"emergency": 5, "warning": 5},
                    "cultural": {"emergency": 0, "warning": 0},
                    "food": {"emergency": -5, "warning": -5},
                    "transportation": {"emergency": -5, "warning": 0}
                },
                "group_size_adjustments": {
                    "small": {"emergency": 5, "warning": 5},        # 2-4 people
                    "medium": {"emergency": 0, "warning": 0},      # 5-8 people  
                    "large": {"emergency": -5, "warning": -5}      # 9+ people
                }
            },
            "ai_configuration": {
                "gemini_enabled": True,
                "analysis_frequency": "real_time",
                "confidence_threshold": 0.7,
                "auto_adjustment": True
            },
            "created_at": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat(),
            "version": "2.0"
        }
        
        self.threshold_configs[trip_id] = default_config
        return default_config
    
    def get_current_thresholds(self, trip_id: int, context: Dict = None) -> Dict:
        """Get current threshold values with context-aware adjustments"""
        
        if trip_id not in self.threshold_configs:
            self.initialize_default_thresholds(trip_id)
        
        base_config = self.threshold_configs[trip_id]
        current_time = datetime.now()
        
        # Start with base thresholds
        thresholds = base_config["base_thresholds"].copy()
        
        # Apply context-aware adjustments if context provided
        if context:
            thresholds = self._apply_context_adjustments(thresholds, context, current_time)
        
        # Apply AI-driven adjustments if available
        if self.ai_engine and base_config.get("ai_configuration", {}).get("auto_adjustment", False):
            thresholds = self._apply_ai_adjustments(trip_id, thresholds, context)
        
        return {
            "thresholds": thresholds,
            "config_version": base_config["version"],
            "last_updated": base_config["last_updated"],
            "adjustments_applied": self._get_adjustment_log(trip_id, current_time)
        }
    
    def _apply_context_adjustments(self, thresholds: Dict, context: Dict, current_time: datetime) -> Dict:
        """Apply context-aware adjustments to thresholds"""
        
        adjusted_thresholds = thresholds.copy()
        
        # Time of day adjustments
        hour = current_time.hour
        time_period = "morning" if 6 <= hour <= 10 else \
                     "afternoon" if 14 <= hour <= 18 else \
                     "evening" if 20 <= hour <= 23 else \
                     "night"
        
        time_adjustments = self.threshold_configs.get(list(self.threshold_configs.keys())[0], {}).get(
            "context_factors", {}).get("time_of_day_adjustments", {}).get(time_period, {})
        
        for threshold_type in adjusted_thresholds:
            if threshold_type in time_adjustments:
                adjusted_thresholds[threshold_type] += time_adjustments[threshold_type]
        
        # Activity type adjustments
        activity_type = context.get("activity_type", "general")
        activity_adjustments = self.threshold_configs.get(list(self.threshold_configs.keys())[0], {}).get(
            "context_factors", {}).get("activity_type_adjustments", {}).get(activity_type, {})
        
        for threshold_type in adjusted_thresholds:
            if threshold_type in activity_adjustments:
                adjusted_thresholds[threshold_type] += activity_adjustments[threshold_type]
        
        # Group size adjustments
        group_size = context.get("group_size", 5)
        if group_size <= 4:
            size_category = "small"
        elif group_size <= 8:
            size_category = "medium"
        else:
            size_category = "large"
        
        size_adjustments = self.threshold_configs.get(list(self.threshold_configs.keys())[0], {}).get(
            "context_factors", {}).get("group_size_adjustments", {}).get(size_category, {})
        
        for threshold_type in adjusted_thresholds:
            if threshold_type in size_adjustments:
                adjusted_thresholds[threshold_type] += size_adjustments[threshold_type]
        
        # Ensure thresholds stay within reasonable bounds
        for threshold_type in adjusted_thresholds:
            adjusted_thresholds[threshold_type] = max(
                20, min(95, adjusted_thresholds[threshold_type])
            )
        
        return adjusted_thresholds
    
    def _apply_ai_adjustments(self, trip_id: int, thresholds: Dict, context: Dict = None) -> Dict:
        """Apply AI-driven adjustments using Gemini API"""
        
        if not self.ai_engine:
            return thresholds
        
        try:
            # Create analysis context for AI
            analysis_context = {
                "current_thresholds": thresholds,
                "trip_context": context or {},
                "recent_feedback_history": self._get_recent_feedback(trip_id),
                "threshold_history": list(self.threshold_history[trip_id])[-10:],
                "analysis_timestamp": datetime.now().isoformat()
            }
            
            # Use AI engine for intelligent threshold adjustment
            ai_analysis = self.ai_engine.smart_threshold_analysis({}, analysis_context)
            
            # Apply AI-recommended adjustments
            ai_thresholds = ai_analysis.get("adaptive_thresholds", {})
            if ai_thresholds:
                thresholds = {
                    k: ai_thresholds.get(f"{k}_threshold", v) 
                    for k, v in thresholds.items()
                }
                
                # Log AI adjustment
                self._log_threshold_adjustment(trip_id, "ai_adjustment", thresholds, 
                                             ai_analysis.get("contextual_analysis", {}).get("confidence", 0.5))
            
            return thresholds
            
        except Exception as e:
            print(f"AI threshold adjustment failed: {e}")
            return thresholds
    
    def adapt_thresholds_intelligently(self, trip_id: int, feedback_analysis: Dict) -> Dict:
        """Intelligently adapt thresholds based on feedback analysis and AI insights"""
        
        if trip_id not in self.threshold_configs:
            self.initialize_default_thresholds(trip_id)
        
        config = self.threshold_configs[trip_id]
        current_time = datetime.now()
        
        # Get current thresholds
        current_thresholds = self.get_current_thresholds(trip_id)["thresholds"]
        
        # Initialize adaptation results
        adaptation_result = {
            "trip_id": trip_id,
            "adaptation_timestamp": current_time.isoformat(),
            "changes_made": [],
            "reasoning": [],
            "confidence": 0.0,
            "next_review": (current_time + timedelta(hours=2)).isoformat()
        }
        
        # Analyze feedback patterns for adaptation insights
        pattern_analysis = feedback_analysis.get("pattern_analysis", {})
        predictions = feedback_analysis.get("fatigue_predictions", {})
        threshold_analysis = feedback_analysis.get("threshold_analysis", {})
        
        # AI-driven adaptation using Gemini insights
        if self.ai_engine and config.get("ai_configuration", {}).get("gemini_enabled", False):
            adaptation_result = self._gemini_driven_adaptation(trip_id, feedback_analysis, adaptation_result)
        
        # Pattern-based adaptations
        pattern_type = pattern_analysis.get("pattern_type", "stable")
        pattern_confidence = pattern_analysis.get("confidence", 0.5)
        
        if pattern_type == "declining" and pattern_confidence > 0.7:
            # Lower thresholds for early intervention
            for threshold_type in current_thresholds:
                old_value = current_thresholds[threshold_type]
                new_value = max(30, old_value - 10)  # Lower by 10, min 30
                if new_value != old_value:
                    current_thresholds[threshold_type] = new_value
                    adaptation_result["changes_made"].append({
                        "threshold": threshold_type,
                        "old_value": old_value,
                        "new_value": new_value,
                        "reason": "declining_pattern_detected"
                    })
                    adaptation_result["reasoning"].append(f"Lowered {threshold_type} threshold due to declining energy pattern")
        
        elif pattern_type == "improving" and pattern_confidence > 0.7:
            # Raise thresholds for efficient resource use
            for threshold_type in current_thresholds:
                old_value = current_thresholds[threshold_type]
                new_value = min(90, old_value + 5)  # Raise by 5, max 90
                if new_value != old_value:
                    current_thresholds[threshold_type] = new_value
                    adaptation_result["changes_made"].append({
                        "threshold": threshold_type,
                        "old_value": old_value,
                        "new_value": new_value,
                        "reason": "improving_pattern_detected"
                    })
                    adaptation_result["reasoning"].append(f"Raised {threshold_type} threshold due to improving energy pattern")
        
        # Fatigue prediction-based adaptations
        fatigue_1hour = predictions.get("fatigue_predictions", {}).get("1hour_fatigue", 50)
        if fatigue_1hour > 70:
            # Lower thresholds if high fatigue predicted
            for threshold_type in current_thresholds:
                old_value = current_thresholds[threshold_type]
                new_value = max(25, old_value - 8)  # Proactive lowering
                if new_value != old_value:
                    current_thresholds[threshold_type] = new_value
                    adaptation_result["changes_made"].append({
                        "threshold": threshold_type,
                        "old_value": old_value,
                        "new_value": new_value,
                        "reason": "high_fatigue_predicted"
                    })
                    adaptation_result["reasoning"].append(f"Lowered {threshold_type} threshold due to high fatigue prediction")
        
        # Update configuration
        config["base_thresholds"] = current_thresholds
        config["last_updated"] = current_time.isoformat()
        
        # Calculate overall confidence
        adaptation_result["confidence"] = min(pattern_confidence, 
                                            predictions.get("fatigue_predictions", {}).get("confidence", 0.5),
                                            0.8)  # Max 0.8 for manual adaptations
        
        # Store adaptation in history
        self.threshold_history[trip_id].append({
            "timestamp": current_time.isoformat(),
            "changes": adaptation_result["changes_made"],
            "confidence": adaptation_result["confidence"],
            "reasoning": adaptation_result["reasoning"]
        })
        
        # Cache recent adaptation
        cache_key = f"adaptation_{trip_id}_{current_time.strftime('%Y%m%d_%H%M')}"
        self.adaptation_cache[cache_key] = adaptation_result
        
        return adaptation_result
    
    def _gemini_driven_adaptation(self, trip_id: int, feedback_analysis: Dict, adaptation_result: Dict) -> Dict:
        """Use Gemini API for intelligent threshold adaptation"""
        
        if not self.ai_engine:
            return adaptation_result
        
        try:
            # Prepare comprehensive context for Gemini
            context = {
                "feedback_analysis": feedback_analysis,
                "current_config": self.threshold_configs.get(trip_id, {}),
                "threshold_history": list(self.threshold_history[trip_id])[-5:],
                "adaptation_objective": "optimize_threshold_sensitivity_for_group_wellbeing"
            }
            
            # Generate AI recommendations for threshold adaptation
            ai_recommendations = self.ai_engine.generate_ai_recommendations(feedback_analysis, context)
            
            # Apply AI-suggested immediate actions
            immediate_actions = ai_recommendations.get("immediate_actions", [])
            for action in immediate_actions:
                if action.get("urgency") == "high" and "threshold" in action.get("description", "").lower():
                    # Extract threshold adjustments from AI recommendations
                    adaptation_result["reasoning"].append(f"AI recommendation: {action.get('description')}")
                    adaptation_result["confidence"] = max(adaptation_result["confidence"], 0.85)
            
            # Add AI confidence to overall adaptation confidence
            ai_confidence = ai_recommendations.get("confidence", 0.5)
            adaptation_result["confidence"] = max(adaptation_result["confidence"], ai_confidence)
            
            return adaptation_result
            
        except Exception as e:
            print(f"Gemini-driven adaptation failed: {e}")
            return adaptation_result
    
    def get_threshold_recommendations(self, trip_id: int, current_feedback: Dict) -> Dict:
        """Get AI-powered threshold recommendations based on current state"""
        
        if not self.ai_engine:
            return self._fallback_threshold_recommendations(trip_id, current_feedback)
        
        try:
            # Use AI engine for comprehensive analysis
            comprehensive_analysis = self.ai_engine.comprehensive_ai_analysis(
                current_feedback, 
                context={"trip_id": trip_id, "analysis_type": "threshold_recommendation"}
            )
            
            # Extract threshold-specific recommendations
            threshold_analysis = comprehensive_analysis.get("threshold_analysis", {})
            recommendations = comprehensive_analysis.get("ai_recommendations", {})
            
            return {
                "current_assessment": threshold_analysis.get("current_assessment", {}),
                "adaptive_thresholds": threshold_analysis.get("adaptive_thresholds", {}),
                "immediate_actions": recommendations.get("immediate_actions", []),
                "monitoring_strategy": recommendations.get("monitoring_strategy", {}),
                "confidence": comprehensive_analysis.get("overall_assessment", {}).get("confidence_score", 0.5),
                "next_review": comprehensive_analysis.get("overall_assessment", {}).get("next_review_timestamp"),
                "ai_reasoning": threshold_analysis.get("contextual_analysis", {})
            }
            
        except Exception as e:
            print(f"AI threshold recommendations failed: {e}")
            return self._fallback_threshold_recommendations(trip_id, current_feedback)
    
    def _fallback_threshold_recommendations(self, trip_id: int, current_feedback: Dict) -> Dict:
        """Fallback threshold recommendations without AI"""
        
        from models import FeedbackAnalyzer
        current_fatigue = FeedbackAnalyzer.calculate_fatigue_score(current_feedback)
        
        current_thresholds = self.get_current_thresholds(trip_id)["thresholds"]
        
        # Simple recommendation logic
        if current_fatigue >= current_thresholds["emergency"]:
            status = "critical"
            immediate_action = True
            monitoring_level = "intensive"
        elif current_fatigue >= current_thresholds["warning"]:
            status = "warning" 
            immediate_action = False
            monitoring_level = "enhanced"
        else:
            status = "normal"
            immediate_action = False
            monitoring_level = "standard"
        
        return {
            "current_assessment": {
                "status": status,
                "immediate_action_required": immediate_action,
                "monitoring_level": monitoring_level,
                "current_fatigue": current_fatigue
            },
            "adaptive_thresholds": {
                "emergency_threshold": current_thresholds["emergency"],
                "warning_threshold": current_thresholds["warning"],
                "rationale": "Standard configuration"
            },
            "immediate_actions": [
                {
                    "type": "monitoring" if not immediate_action else "intervention",
                    "priority": "high" if immediate_action else "medium",
                    "message": f"{status.capitalize()} status - {monitoring_level} monitoring recommended"
                }
            ],
            "monitoring_strategy": {
                "frequency": "every_10_minutes" if status == "critical" else 
                           "every_15_minutes" if status == "warning" else "every_30_minutes",
                "focus_areas": ["fatigue_indicators"],
                "alert_conditions": [f"fatigue > {current_thresholds['warning']}"]
            },
            "confidence": 0.6,
            "next_review": (datetime.now() + timedelta(minutes=15 if status == "critical" else 30)).isoformat(),
            "ai_reasoning": {"confidence": 0.6, "method": "fallback_analysis"}
        }
    
    def _get_recent_feedback(self, trip_id: int, limit: int = 10) -> List[Dict]:
        """Get recent feedback history for analysis (placeholder - integrate with database)"""
        # This would integrate with your database to get real feedback history
        # For now, return empty list as placeholder
        return []
    
    def _log_threshold_adjustment(self, trip_id: int, adjustment_type: str, new_thresholds: Dict, confidence: float):
        """Log threshold adjustment for learning and history"""
        self.threshold_history[trip_id].append({
            "timestamp": datetime.now().isoformat(),
            "adjustment_type": adjustment_type,
            "new_thresholds": new_thresholds,
            "confidence": confidence
        })
    
    def _get_adjustment_log(self, trip_id: int, current_time: datetime) -> List[str]:
        """Get recent adjustment log for transparency"""
        recent_adjustments = list(self.threshold_history[trip_id])[-5:]
        return [f"{adj['timestamp']}: {adj.get('adjustment_type', 'unknown')} (confidence: {adj.get('confidence', 0.0)})" 
                for adj in recent_adjustments]
    
    def export_threshold_configuration(self, trip_id: int) -> Dict:
        """Export complete threshold configuration for backup/sharing"""
        
        if trip_id not in self.threshold_configs:
            self.initialize_default_thresholds(trip_id)
        
        config = self.threshold_configs[trip_id].copy()
        config["threshold_history"] = list(self.threshold_history[trip_id])
        config["export_timestamp"] = datetime.now().isoformat()
        
        return config
    
    def import_threshold_configuration(self, trip_id: int, config_data: Dict) -> Dict:
        """Import threshold configuration from backup/other trip"""
        
        # Validate configuration structure
        required_sections = ["base_thresholds", "category_weights", "adaptive_settings"]
        for section in required_sections:
            if section not in config_data:
                raise ValueError(f"Invalid configuration: missing {section}")
        
        # Import with validation
        imported_config = {
            "trip_id": trip_id,
            "base_thresholds": config_data["base_thresholds"],
            "category_weights": config_data.get("category_weights", {}),
            "adaptive_settings": config_data.get("adaptive_settings", {}),
            "context_factors": config_data.get("context_factors", {}),
            "ai_configuration": config_data.get("ai_configuration", {}),
            "imported_at": datetime.now().isoformat(),
            "original_export": config_data.get("export_timestamp"),
            "version": config_data.get("version", "2.0")
        }
        
        self.threshold_configs[trip_id] = imported_config
        
        return {
            "import_status": "success",
            "config_version": imported_config["version"],
            "import_timestamp": imported_config["imported_at"]
        }

# Utility functions
def create_threshold_manager() -> SmartThresholdManager:
    """Factory function to create and configure threshold manager"""
    manager = SmartThresholdManager()
    return manager

def get_default_threshold_config() -> Dict:
    """Get default threshold configuration template"""
    return {
        "base_thresholds": {"emergency": 75, "warning": 50, "monitor": 25},
        "category_weights": {"tired": 0.3, "energetic": 0.25, "sick": 0.25, "hungry": 0.1, "adventurous": 0.1},
        "adaptive_settings": {"enabled": True, "learning_rate": 0.1, "min_adjustment": -15, "max_adjustment": 15},
        "ai_configuration": {"gemini_enabled": True, "analysis_frequency": "real_time", "confidence_threshold": 0.7}
    }