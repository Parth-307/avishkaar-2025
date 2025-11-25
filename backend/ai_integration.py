"""
AI Integration Layer for Trip Management System
Unifies Gemini AI Decision Engine, Threshold Management, and Recommendation Engine
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import json

# Import all AI components
from ai_decision_engine import GeminiAIDecisionEngine, comprehensive_ai_analysis
from threshold_manager import SmartThresholdManager, create_threshold_manager
from recommendation_engine import GeminiRecommendationEngine, generate_comprehensive_recommendations
from pivot_engine import PivotEngine

class UnifiedAIIntegration:
    """Unified AI system that integrates all AI components for comprehensive trip optimization"""
    
    def __init__(self):
        self.decision_engine = GeminiAIDecisionEngine()
        self.threshold_manager = create_threshold_manager()
        self.recommendation_engine = GeminiRecommendationEngine()
        
        # Connect components
        self.threshold_manager.set_ai_engine(self.decision_engine)
        
        self.analysis_cache = {}  # Cache recent analyses
        self.recommendation_cache = {}  # Cache recent recommendations
        
    def process_feedback_comprehensive(self, feedback_data: Dict, trip_id: int, context: Dict = None) -> Dict:
        """
        Process feedback through the complete AI pipeline:
        1. Pattern analysis
        2. Fatigue prediction
        3. Threshold monitoring
        4. Recommendation generation
        5. Integration with existing pivot engine
        """
        
        # Get historical feedback (placeholder - integrate with database)
        historical_feedback = self._get_historical_feedback(trip_id)
        
        # Step 1: Comprehensive AI Analysis
        analysis_results = comprehensive_ai_analysis(
            feedback_data, 
            historical_feedback, 
            {"trip_id": trip_id, **(context or {})}
        )
        
        # Step 2: Smart Threshold Analysis
        threshold_recommendations = self.threshold_manager.get_threshold_recommendations(trip_id, feedback_data)
        
        # Step 3: Intelligent Adaptation (if needed)
        adaptation_results = None
        if analysis_results.get("overall_assessment", {}).get("priority_level") in ["high", "medium"]:
            adaptation_results = self.threshold_manager.adapt_thresholds_intelligently(trip_id, analysis_results)
        
        # Step 4: Generate Recommendations
        recommendations = self.recommendation_engine.generate_intelligent_recommendations(
            analysis_results, 
            context,
            optimization_style=self._determine_optimization_style(analysis_results)
        )
        
        # Step 5: Integration with existing pivot engine
        pivot_integration = self._integrate_with_pivot_engine(trip_id, feedback_data, analysis_results, recommendations)
        
        # Combine all results
        comprehensive_response = {
            "trip_id": trip_id,
            "analysis_results": analysis_results,
            "threshold_analysis": threshold_recommendations,
            "threshold_adaptation": adaptation_results,
            "recommendations": recommendations,
            "pivot_integration": pivot_integration,
            "unified_assessment": self._generate_unified_assessment(analysis_results, threshold_recommendations, recommendations),
            "execution_plan": self._create_execution_plan(recommendations, threshold_recommendations),
            "timestamp": datetime.now().isoformat(),
            "processing_metadata": {
                "ai_components_used": ["gemini_decision_engine", "smart_threshold_manager", "recommendation_engine"],
                "analysis_version": "2.0",
                "confidence_score": analysis_results.get("overall_assessment", {}).get("confidence_score", 0.5)
            }
        }
        
        # Cache results for performance
        cache_key = f"comprehensive_{trip_id}_{datetime.now().strftime('%Y%m%d_%H%M')}"
        self.analysis_cache[cache_key] = comprehensive_response
        
        return comprehensive_response
    
    def _get_historical_feedback(self, trip_id: int, limit: int = 20) -> List[Dict]:
        """
        Get historical feedback for the trip (placeholder - integrate with database)
        In a real implementation, this would query the database for recent feedback
        """
        # Placeholder implementation
        return []
    
    def _determine_optimization_style(self, analysis_results: Dict) -> str:
        """Determine appropriate optimization style based on analysis"""
        
        pattern_type = analysis_results.get("pattern_analysis", {}).get("pattern_type", "stable")
        priority_level = analysis_results.get("overall_assessment", {}).get("priority_level", "medium")
        
        if priority_level == "high":
            return "aggressive"  # Need significant changes
        elif pattern_type in ["declining", "volatile"]:
            return "conservative"  # Minimize disruption
        else:
            return "balanced"  # Standard optimization
    
    def _integrate_with_pivot_engine(self, trip_id: int, feedback_data: Dict, analysis_results: Dict, recommendations: Dict) -> Dict:
        """Integrate AI analysis with existing pivot engine functionality"""
        
        # Get pending activities (placeholder - integrate with database)
        pending_activities = self._get_pending_activities(trip_id)
        
        if not pending_activities:
            return {"status": "no_activities_to_pivot", "message": "No pending activities found"}
        
        # Use AI insights to enhance pivot decisions
        pattern_type = analysis_results.get("pattern_analysis", {}).get("pattern_type", "stable")
        
        # Enhanced strategy determination based on AI analysis
        if pattern_type == "declining":
            strategy = "emergency_rest"
        elif pattern_type == "improving":
            strategy = "intensify"
        else:
            strategy = "maintain"
        
        # Call existing pivot engine with AI-enhanced context
        try:
            pivot_result = PivotEngine.optimize_itinerary_5_category(
                pending_activities, 
                feedback_data, 
                lat=0,  # Would be actual coordinates
                lng=0   # Would be actual coordinates
            )
            
            # Enhance pivot result with AI recommendations
            enhanced_pivot = {
                "original_pivot_result": pivot_result,
                "ai_enhancement": {
                    "strategy_rationale": f"AI determined {strategy} strategy based on {pattern_type} pattern",
                    "confidence": analysis_results.get("overall_assessment", {}).get("confidence_score", 0.5),
                    "ai_recommendations_incorporated": recommendations.get("immediate_actions", []),
                    "expected_improvement": recommendations.get("overall_assessment", {}).get("expected_improvement", "")
                },
                "unified_strategy": strategy
            }
            
            return {
                "status": "success",
                "enhanced_pivot": enhanced_pivot,
                "integration_confidence": 0.85
            }
            
        except Exception as e:
            return {
                "status": "pivot_failed",
                "error": str(e),
                "fallback_strategy": "manual_intervention_required"
            }
    
    def _get_pending_activities(self, trip_id: int) -> List[Dict]:
        """Get pending activities for the trip (placeholder - integrate with database)"""
        # Placeholder implementation
        return []
    
    def _generate_unified_assessment(self, analysis_results: Dict, threshold_recommendations: Dict, recommendations: Dict) -> Dict:
        """Generate a unified assessment across all AI components"""
        
        # Priority assessment
        analysis_priority = analysis_results.get("overall_assessment", {}).get("priority_level", "medium")
        threshold_priority = threshold_recommendations.get("current_assessment", {}).get("status", "normal")
        recommendation_priority = recommendations.get("overall_assessment", {}).get("risk_level", "medium")
        
        # Determine overall priority
        if analysis_priority == "high" or threshold_priority == "critical":
            overall_priority = "urgent"
        elif analysis_priority == "medium" or threshold_priority == "warning":
            overall_priority = "elevated"
        else:
            overall_priority = "normal"
        
        # Confidence assessment
        confidence_scores = [
            analysis_results.get("overall_assessment", {}).get("confidence_score", 0.5),
            threshold_recommendations.get("confidence", 0.5),
            recommendations.get("overall_assessment", {}).get("optimization_confidence", 0.5)
        ]
        overall_confidence = sum(confidence_scores) / len(confidence_scores)
        
        # Risk assessment
        risk_factors = []
        if threshold_priority == "critical":
            risk_factors.append("Critical fatigue threshold breached")
        if analysis_priority == "high":
            risk_factors.append("Declining energy pattern detected")
        if recommendation_priority == "high":
            risk_factors.append("High-risk optimization recommended")
        
        return {
            "overall_priority": overall_priority,
            "confidence_score": round(overall_confidence, 2),
            "risk_factors": risk_factors,
            "immediate_action_required": overall_priority == "urgent",
            "recommended_monitoring_frequency": self._determine_monitoring_frequency(overall_priority),
            "expected_outcome": recommendations.get("overall_assessment", {}).get("expected_improvement", "Improved group experience"),
            "next_review_timestamp": (datetime.now() + timedelta(minutes=self._determine_monitoring_frequency(overall_priority))).isoformat()
        }
    
    def _determine_monitoring_frequency(self, priority: str) -> int:
        """Determine monitoring frequency based on priority"""
        frequency_map = {
            "urgent": 5,      # 5 minutes
            "elevated": 15,   # 15 minutes
            "normal": 30      # 30 minutes
        }
        return frequency_map.get(priority, 30)
    
    def _create_execution_plan(self, recommendations: Dict, threshold_recommendations: Dict) -> Dict:
        """Create a prioritized execution plan from all recommendations"""
        
        execution_plan = {
            "immediate_phase": [],      # 0-15 minutes
            "short_term_phase": [],     # 15 minutes - 2 hours
            "monitoring_phase": [],     # Ongoing
            "contingency_plan": []      # If things go wrong
        }
        
        # Process immediate actions
        for action in recommendations.get("immediate_actions", []):
            timeline = action.get("timeline", "15_minutes")
            if "5_minutes" in timeline:
                execution_plan["immediate_phase"].append(action)
            else:
                execution_plan["short_term_phase"].append(action)
        
        # Add threshold-based monitoring
        monitoring_level = threshold_recommendations.get("current_assessment", {}).get("monitoring_level", "standard")
        execution_plan["monitoring_phase"].append({
            "action": "enhanced_monitoring",
            "description": f"Implement {monitoring_level} monitoring protocol",
            "frequency": threshold_recommendations.get("monitoring_strategy", {}).get("frequency", "every_30_minutes"),
            "priority": "high" if monitoring_level == "intensive" else "medium"
        })
        
        # Add contingency plans
        if recommendations.get("overall_assessment", {}).get("risk_level") == "high":
            execution_plan["contingency_plan"].append({
                "trigger": "recommendations_fail",
                "action": "Manual intervention with trip host",
                "priority": "high"
            })
        
        return execution_plan
    
    def get_ai_status_report(self, trip_id: int) -> Dict:
        """Get comprehensive AI system status report"""
        
        return {
            "trip_id": trip_id,
            "ai_components_status": {
                "gemini_decision_engine": "active",
                "smart_threshold_manager": "active", 
                "recommendation_engine": "active",
                "pivot_engine_integration": "active"
            },
            "recent_analyses": len([k for k in self.analysis_cache.keys() if f"comprehensive_{trip_id}" in k]),
            "cache_status": {
                "analysis_cache_size": len(self.analysis_cache),
                "recommendation_cache_size": len(self.recommendation_cache)
            },
            "system_health": "healthy",
            "last_update": datetime.now().isoformat()
        }
    
    def export_ai_insights(self, trip_id: int, time_range_hours: int = 24) -> Dict:
        """Export AI insights for analysis or reporting"""
        
        # Get relevant cached analyses
        relevant_analyses = [
            analysis for key, analysis in self.analysis_cache.items() 
            if f"comprehensive_{trip_id}" in key
        ]
        
        # Generate insights summary
        insights = {
            "trip_id": trip_id,
            "export_timestamp": datetime.now().isoformat(),
            "time_range_hours": time_range_hours,
            "total_analyses": len(relevant_analyses),
            "pattern_insights": self._extract_pattern_insights(relevant_analyses),
            "threshold_insights": self._extract_threshold_insights(relevant_analyses),
            "recommendation_effectiveness": self._analyze_recommendation_effectiveness(relevant_analyses),
            "ai_performance_metrics": {
                "average_confidence": self._calculate_average_confidence(relevant_analyses),
                "response_time_avg": "2.3_seconds",  # Placeholder
                "recommendation_acceptance_rate": "0.75"  # Placeholder
            }
        }
        
        return insights
    
    def _extract_pattern_insights(self, analyses: List[Dict]) -> Dict:
        """Extract pattern insights from analyses"""
        if not analyses:
            return {"pattern_distribution": {}, "most_common_pattern": "unknown"}
        
        patterns = [analysis.get("analysis_results", {}).get("pattern_analysis", {}).get("pattern_type", "unknown") 
                   for analysis in analyses]
        
        pattern_counts = {}
        for pattern in patterns:
            pattern_counts[pattern] = pattern_counts.get(pattern, 0) + 1
        
        most_common = max(pattern_counts, key=pattern_counts.get) if pattern_counts else "unknown"
        
        return {
            "pattern_distribution": pattern_counts,
            "most_common_pattern": most_common,
            "pattern_stability": "high" if len(set(patterns[:5])) <= 2 else "variable"
        }
    
    def _extract_threshold_insights(self, analyses: List[Dict]) -> Dict:
        """Extract threshold insights from analyses"""
        if not analyses:
            return {"threshold_breaches": 0, "adaptation_frequency": "unknown"}
        
        critical_breaches = 0
        adaptations_made = 0
        
        for analysis in analyses:
            threshold_status = analysis.get("threshold_analysis", {}).get("current_assessment", {}).get("status", "normal")
            if threshold_status == "critical":
                critical_breaches += 1
            
            if analysis.get("threshold_adaptation"):
                adaptations_made += 1
        
        return {
            "critical_threshold_breaches": critical_breaches,
            "adaptations_made": adaptations_made,
            "adaptation_frequency": "high" if adaptations_made > len(analyses) * 0.3 else "moderate",
            "system_sensitivity": "appropriate"
        }
    
    def _analyze_recommendation_effectiveness(self, analyses: List[Dict]) -> Dict:
        """Analyze recommendation effectiveness"""
        if not analyses:
            return {"acceptance_rate": 0.0, "average_priority": "unknown"}
        
        priorities = [analysis.get("recommendations", {}).get("overall_assessment", {}).get("risk_level", "medium") 
                     for analysis in analyses]
        
        priority_counts = {}
        for priority in priorities:
            priority_counts[priority] = priority_counts.get(priority, 0) + 1
        
        most_common_priority = max(priority_counts, key=priority_counts.get) if priority_counts else "medium"
        
        return {
            "recommendation_volume": len(analyses),
            "average_priority": most_common_priority,
            "priority_distribution": priority_counts,
            "effectiveness_indicators": "analysis_complete"
        }
    
    def _calculate_average_confidence(self, analyses: List[Dict]) -> float:
        """Calculate average confidence across analyses"""
        if not analyses:
            return 0.0
        
        confidence_scores = [analysis.get("processing_metadata", {}).get("confidence_score", 0.5) 
                           for analysis in analyses]
        
        return round(sum(confidence_scores) / len(confidence_scores), 2)

# Convenience function for easy integration
def create_unified_ai_system() -> UnifiedAIIntegration:
    """Factory function to create the unified AI system"""
    return UnifiedAIIntegration()

def process_trip_feedback(feedback_data: Dict, trip_id: int, context: Dict = None) -> Dict:
    """Main entry point for processing trip feedback through the AI system"""
    
    ai_system = create_unified_ai_system()
    return ai_system.process_feedback_comprehensive(feedback_data, trip_id, context)