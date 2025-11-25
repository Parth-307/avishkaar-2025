#!/usr/bin/env python3
"""
Test script to verify database setup and basic functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_database_setup():
    """Test database setup and basic operations"""
    print("Testing database setup...")
    
    try:
        # Import our modules
        from database import create_tables
        from auth_system import AuthSystem
        from models import User, Trip, Activity
        
        print("✓ All imports successful")
        
        # Create tables
        create_tables()
        print("✓ Database tables created successfully")
        
        # Test auth system
        auth = AuthSystem()
        print("✓ AuthSystem initialized")
        
        # Test user registration
        user = auth.register_user(
            full_name="Test User",
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        print(f"✓ User created: {user.username} (ID: {user.id})")
        
        # Test authentication
        auth_user = auth.authenticate_user("testuser", "testpass123")
        if auth_user:
            print("✓ User authentication successful")
        else:
            print("✗ User authentication failed")
            return False
        
        # Test trip creation
        trip, admin_user = auth.create_trip_admin(
            username="adminuser",
            password="adminpass123",
            trip_name="Test Trip"
        )
        print(f"✓ Trip created: {trip.name} (ID: {trip.id}, Join Code: {trip.join_code})")
        print(f"✓ Admin user created: {admin_user.username}")
        
        # Test feedback analyzer
        from models import FeedbackAnalyzer
        
        feedback_data = {
            "tired": 4,  # High tiredness
            "energetic": 2,  # Low energy
            "sick": 3,  # Neutral
            "hungry": 2,  # Somewhat hungry
            "adventurous": 2  # Not very adventurous
        }
        
        fatigue_score = FeedbackAnalyzer.calculate_fatigue_score(feedback_data)
        fatigue_level = FeedbackAnalyzer.get_fatigue_level(fatigue_score)
        recommendations = FeedbackAnalyzer.generate_recommendations(feedback_data, fatigue_score)
        
        print(f"✓ Fatigue analysis: Score={fatigue_score:.1f}, Level={fatigue_level}")
        print(f"✓ Generated {len(recommendations)} recommendations")
        
        # Clean up
        auth.close()
        print("✓ Database connection closed")
        
        print("\n🎉 All tests passed! Phase 1 backend integration is complete.")
        return True
        
    except Exception as e:
        print(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_database_setup()
    if success:
        print("\n✅ Phase 1: Backend Integration & Database Setup - COMPLETED")
    else:
        print("\n❌ Phase 1: Backend Integration & Database Setup - FAILED")
        sys.exit(1)