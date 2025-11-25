import os
import google.generativeai as genai
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
import random

# Configure APIs
try:
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key and gemini_key != "your-gemini-key":
        genai.configure(api_key=gemini_key)
        AI_ENABLED = True
        print("✅ Gemini AI configured successfully in recommendation_engine!")
    else:
        raise ValueError("Gemini API key not found or invalid")
    
    # Google Maps - optional, handle gracefully
    try:
        import googlemaps
        maps_key = os.getenv("GOOGLE_MAPS_KEY")
        if maps_key and maps_key != "your-google-maps-key" and maps_key != "not-configured":
            gmaps = googlemaps.Client(key=maps_key)
            print("✅ Google Maps API configured successfully!")
        else:
            print("📍 Google Maps API not configured - using intelligent fallback location suggestions")
            gmaps = None
    except ImportError:
        print("📍 Google Maps package not installed - using intelligent fallback location suggestions")
        gmaps = None
        
except Exception as e:
    print(f"Warning: AI services not configured. Using enhanced fallback logic. Error: {e}")
    AI_ENABLED = False
    gmaps = None