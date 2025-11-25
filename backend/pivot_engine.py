import os
import google.generativeai as genai
import googlemaps
import json
from datetime import datetime
from models import FeedbackAnalyzer

# Configure APIs - Add your keys to environment variables
try:
    genai.configure(api_key=os.getenv("GEMINI_API_KEY", "your-gemini-key"))
    gmaps = googlemaps.Client(key=os.getenv("GOOGLE_MAPS_KEY", "your-google-maps-key"))
    AI_ENABLED = True
except:
    print("Warning: AI services not configured. Using fallback logic.")
    AI_ENABLED = False

class PivotEngine:
    """Enhanced AI-powered trip optimization engine for 5-category feedback"""
    
    @staticmethod
    def optimize_itinerary_5_category(current_activities, feedback_data, lat=0, lng=0):
        """
        Optimize itinerary using 5-category feedback analysis
        Args:
            current_activities: List of Activity objects (pending activities)
            feedback_data: Dict with 5-category feedback scores
            lat, lng: User location coordinates
        
        Returns:
            List of optimization updates
        """
        
        # Calculate fatigue score using the new analyzer
        fatigue_score = FeedbackAnalyzer.calculate_fatigue_score(feedback_data)
        fatigue_level = FeedbackAnalyzer.get_fatigue_level(fatigue_score)
        
        print(f"AI Analysis: Fatigue Score = {fatigue_score:.1f}, Level = {fatigue_level}")
        
        # Generate recommendations based on feedback
        recommendations = FeedbackAnalyzer.generate_recommendations(feedback_data, fatigue_score)
        
        # Determine optimization strategy
        strategy = PivotEngine._determine_strategy(fatigue_score, feedback_data, recommendations)
        
        if AI_ENABLED:
            return PivotEngine._ai_optimize(current_activities, strategy, feedback_data, lat, lng, fatigue_score)
        else:
            return PivotEngine._fallback_optimize(current_activities, strategy, feedback_data)
    
    @staticmethod
    def _determine_strategy(fatigue_score, feedback_data, recommendations):
        """Determine optimization strategy based on feedback"""
        
        # Critical fatigue scenarios
        if fatigue_score >= 75 or feedback_data.get('sick', 3) < 2:
            return "emergency_rest"
        
        # High fatigue scenarios
        if fatigue_score >= 60 or feedback_data.get('tired', 3) > 4:
            return "reduce_intensity"
        
        # Physical discomfort
        if feedback_data.get('hungry', 3) > 4:
            return "food_priority"
        
        # Low adventurousness with good energy
        if feedback_data.get('adventurous', 3) < 2 and feedback_data.get('energetic', 3) > 3:
            return "increase_engagement"
        
        # High energy scenarios
        if feedback_data.get('energetic', 3) > 4 and fatigue_score < 25:
            return "intensify"
        
        # Default: maintain current plan
        return "maintain"
    
    @staticmethod
    def _ai_optimize(activities, strategy, feedback_data, lat, lng, fatigue_score):
        """Use AI to optimize itinerary based on strategy"""
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Serialize activities for AI analysis
        future_plan = [
            {
                "id": a.id,
                "title": a.title,
                "type": a.type,
                "time": a.start_time.strftime("%I:%M %p"),
                "location": a.location_name,
                "status": a.status
            } for a in activities
        ]
        
        # Create context-aware prompt
        prompt = f"""
        You are an intelligent travel optimization AI.
        
        CURRENT SITUATION:
        - Strategy: {strategy}
        - Fatigue Score: {fatigue_score:.1f}/100
        - 5-Category Feedback: {json.dumps(feedback_data, indent=2)}
        - User Location: {lat}, {lng}
        - Current Time: {datetime.now().strftime("%I:%M %p")}
        
        REMAINING ITINERARY:
        {json.dumps(future_plan, indent=2)}
        
        OPTIMIZATION GUIDELINES:
        
        1. EMERGENCY_REST Strategy:
           - Replace ALL upcoming activities with rest venues (spa, cafe, hotel)
           - Prioritize health and comfort over activities
           - Mark activities as "cancelled"
        
        2. REDUCE_INTENSITY Strategy:
           - Replace "physical" and "adventurous" activities with "relaxing" alternatives
           - Keep essential activities (meals, transportation)
           - Focus on low-energy venues
        
        3. FOOD_PRIORITY Strategy:
           - Insert meal/snack breaks every 2 hours
           - Replace non-essential activities with nearby restaurants
           - Prioritize food establishments
        
        4. INCREASE_ENGAGEMENT Strategy:
           - Add interactive activities (games, workshops, tours)
           - Replace passive activities with engaging alternatives
           - Boost adventurousness factor
        
        5. INTENSIFY Strategy:
           - Add high-energy activities
           - Replace low-intensity activities with more active ones
           - Consider after-hours entertainment
        
        6. MAINTAIN Strategy:
           - Keep all activities but suggest minor timing adjustments
           - Focus on optimization, not replacement
        
        OUTPUT FORMAT (JSON ONLY):
        {{
            "strategy": "{strategy}",
            "analysis": "Brief explanation of changes",
            "activities": [
                {{
                    "original_id": 123,
                    "action": "keep|replace|cancel",
                    "reason": "Why this action was taken",
                    "new_title": "If replaced",
                    "new_location": "If replaced",
                    "new_type": "If replaced",
                    "search_query": "For finding replacement"
                }}
            ],
            "recommendations": [
                {{
                    "type": "urgent|normal|tip",
                    "message": "Specific recommendation",
                    "action": "take_action|suggest_only"
                }}
            ]
        }}
        
        IMPORTANT: 
        - Only replace activities that conflict with the strategy
        - Provide realistic location searches using nearby search
        - Consider timing and logistics
        - Be specific about replacement venues
        """
        
        try:
            response = model.generate_content(prompt)
            clean_json = response.text.replace('```json', '').replace('```', '').strip()
            result = json.loads(clean_json)
            
            # Process AI recommendations into actionable updates
            updates = []
            for activity_update in result.get("activities", []):
                if activity_update.get("action") == "replace":
                    # Find actual location using Google Maps
                    if "search_query" in activity_update:
                        places = PivotEngine._find_places(
                            lat, lng, activity_update["search_query"]
                        )
                        
                        if places:
                            place = places[0]
                            updates.append({
                                "original_id": activity_update["original_id"],
                                "new_data": {
                                    "title": place['name'],
                                    "location_name": place['name'],
                                    "address": place.get('vicinity', place.get('formatted_address')),
                                    "lat": place['geometry']['location']['lat'],
                                    "lng": place['geometry']['location']['lng'],
                                    "type": activity_update.get('new_type', 'relaxing'),
                                    "is_ai_generated": True
                                },
                                "reason": activity_update.get("reason", ""),
                                "action": "replace"
                            })
                elif activity_update.get("action") == "cancel":
                    updates.append({
                        "original_id": activity_update["original_id"],
                        "new_data": {"status": "cancelled"},
                        "reason": activity_update.get("reason", ""),
                        "action": "cancel"
                    })
                else:  # keep
                    updates.append({
                        "original_id": activity_update["original_id"],
                        "action": "keep",
                        "reason": activity_update.get("reason", "Maintaining original plan")
                    })
            
            # Add AI-generated recommendations
            ai_recommendations = result.get("recommendations", [])
            
            return {
                "updates": updates,
                "ai_analysis": {
                    "strategy": strategy,
                    "fatigue_score": fatigue_score,
                    "analysis": result.get("analysis", ""),
                    "recommendations": ai_recommendations
                }
            }
            
        except Exception as e:
            print(f"AI Optimization failed: {e}. Using fallback logic.")
            return PivotEngine._fallback_optimize(activities, strategy, feedback_data)
    
    @staticmethod
    def _fallback_optimize(activities, strategy, feedback_data):
        """Fallback optimization without AI"""
        
        updates = []
        
        for activity in activities:
            if strategy == "emergency_rest":
                # Replace with rest venues
                updates.append({
                    "original_id": activity.id,
                    "new_data": {
                        "title": "Rest Break",
                        "location_name": "Local Spa/Cafe",
                        "type": "relaxing",
                        "is_ai_generated": True
                    },
                    "reason": "Emergency rest - fatigue critical",
                    "action": "replace"
                })
            elif strategy == "reduce_intensity" and activity.type in ["physical", "adventurous"]:
                # Replace intense activities
                updates.append({
                    "original_id": activity.id,
                    "new_data": {
                        "title": "Chill Activity",
                        "location_name": "Coffee Shop",
                        "type": "relaxing",
                        "is_ai_generated": True
                    },
                    "reason": "Reducing intensity due to fatigue",
                    "action": "replace"
                })
            elif strategy == "food_priority" and activity.type not in ["food"]:
                # Add food breaks
                updates.append({
                    "original_id": activity.id,
                    "new_data": {
                        "title": "Meal Break",
                        "location_name": "Restaurant",
                        "type": "food",
                        "is_ai_generated": True
                    },
                    "reason": "Food priority - inserting meal break",
                    "action": "replace"
                })
            else:
                # Keep the activity
                updates.append({
                    "original_id": activity.id,
                    "action": "keep",
                    "reason": "No optimization needed"
                })
        
        return {
            "updates": updates,
            "ai_analysis": {
                "strategy": strategy,
                "fatigue_score": FeedbackAnalyzer.calculate_fatigue_score(feedback_data),
                "analysis": f"Fallback optimization applied: {strategy}",
                "recommendations": [{"type": "tip", "message": "Consider enabling AI for better recommendations", "action": "suggest_only"}]
            }
        }
    
    @staticmethod
    def _find_places(lat, lng, search_query):
        """Find places using Google Maps API"""
        if not AI_ENABLED:
            return []
        
        try:
            places = gmaps.places_nearby(
                location=(lat, lng),
                radius=5000,  # 5km radius
                keyword=search_query,
                type="point_of_interest"
            )
            return places.get('results', [])
        except Exception as e:
            print(f"Google Maps search failed: {e}")
            return []

# Legacy function for backward compatibility
def optimize_itinerary(current_activities, user_mood_score, lat, lng):
    """
    Legacy function - converts old single-score feedback to 5-category
    """
    # Convert single energy level (1-10) to 5-category feedback
    feedback_data = {
        "energetic": user_mood_score,
        "tired": 11 - user_mood_score,  # Invert energy to tired
        "sick": 5,  # Neutral default
        "hungry": 3,  # Neutral default
        "adventurous": user_mood_score  # Assume adventurousness matches energy
    }
    
    result = PivotEngine.optimize_itinerary_5_category(current_activities, feedback_data, lat, lng)
    
    # Return legacy format
    return result.get("updates", [])