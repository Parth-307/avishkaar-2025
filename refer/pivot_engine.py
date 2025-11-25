import os
import google.genai as genai
import googlemaps
import json
from datetime import datetime

# Configure APIs
genai.configure(api_key=os.getenv("AIzaSyAXLSUlIHqCsgLnBpPJCGEQz9zEXK4PEY8"))
gmaps = googlemaps.Client(key=os.getenv("GOOGLE_MAPS_KEY"))

def optimize_itinerary(current_activities, user_mood_score, lat, lng):
    """
    Partial Update Logic:
    1. Look at the remaining list of activities.
    2. If Mood < 4 (Tired): Remove 'physical' activities in next 3 hours. Keep dinner.
    3. If Mood > 8 (Hyper): Add an extra activity or upgrade a chill one.
    """
    
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    # Context: Determine strategy based on score
    strategy = "maintain"
    if user_mood_score < 4:
        strategy = "relax"
    elif user_mood_score > 8:
        strategy = "intensify"
        
    print(f" AI Strategy: {strategy} based on score {user_mood_score}")

    # Serialize activities for AI
    # We only send PENDING activities
    future_plan = [
        {
            "id": a.id,
            "title": a.title,
            "type": a.type,
            "time": a.start_time.strftime("%I:%M %p"),
            "original_location": a.location_name
        } for a in current_activities
    ]

    prompt = f"""
    You are an intelligent travel optimizer.
    Current Context:
    - User Location: {lat}, {lng}
    - Current Time: {datetime.now().strftime("%I:%M %p")}
    - Group Energy Score: {user_mood_score}/10 (Strategy: {strategy})
    
    Remaining Itinerary:
    {json.dumps(future_plan)}
    
    INSTRUCTIONS:
    1. Do NOT delete the entire itinerary. Only modify activities that conflict with the energy level.
    2. If Strategy is 'relax': Replace the NEXT immediate physical activity with a Spa, Cafe, or Lounge. KEEP the evening dinner if it is hours away.
    3. If Strategy is 'intensify': Suggest a detour or a more active replacement.
    4. If an activity is replaced, mark 'action': 'replace'. If kept, mark 'action': 'keep'.
    
    OUTPUT JSON FORMAT ONLY:
    [
        {{
            "original_id": 123, 
            "action": "replace", 
            "new_title": "Relaxing Cafe", 
            "search_query": "best quiet cafe nearby",
            "new_type": "relaxing"
        }},
        {{
            "original_id": 124,
            "action": "keep"
        }}
    ]
    """

    response = model.generate_content(prompt)
    try:
        clean_json = response.text.replace('```json', '').replace('```', '').strip()
        modifications = json.loads(clean_json)
    except:
        return [] # Fail safe

    # Process Modifications with Google Maps
    updated_plan = []
    
    for mod in modifications:
        if mod['action'] == 'keep':
            continue # Do nothing, keep original in DB
            
        if mod['action'] == 'replace':
            # Find real place for the replacement
            places = gmaps.places_nearby(
                location=(lat, lng),
                radius=5000,
                keyword=mod['search_query'],
                type="point_of_interest"
            )
            
            if places.get('results'):
                place = places['results'][0] # Top result
                updated_plan.append({
                    "original_id": mod['original_id'],
                    "new_data": {
                        "title": place['name'],
                        "location_name": place['name'],
                        "address": place.get('vicinity'),
                        "lat": place['geometry']['location']['lat'],
                        "lng": place['geometry']['location']['lng'],
                        "type": mod.get('new_type', 'relaxing'),
                        "is_ai_generated": True
                    }
                })
                
    return updated_plan