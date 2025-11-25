from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, JSON, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from database import Base
import datetime

# Extend existing User model for trip functionality
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Trip-related fields
    is_admin = Column(Boolean, default=False)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Relationships
    trip = relationship("Trip", back_populates="users")
    activities = relationship("Activity", back_populates="created_by_user")
    votes = relationship("Vote", back_populates="user")
    activity_feedback = relationship("ActivityFeedback", back_populates="user")

class Trip(Base):
    __tablename__ = "trips"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    join_code = Column(String, unique=True, index=True, nullable=True) # e.g., "TRIP-1234"
    
    # Mood/energy tracking
    current_mood_score = Column(Float, default=10.0) # Average energy 1-10
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    users = relationship("User", back_populates="trip")
    activities = relationship("Activity", back_populates="trip", order_by="Activity.start_time")

class Activity(Base):
    __tablename__ = "activities"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Activity details
    title = Column(String, nullable=False)
    type = Column(String) # physical, relaxing, food, travel, etc.
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    location_name = Column(String)
    address = Column(Text)
    lat = Column(Float)
    lng = Column(Float)
    
    # Status tracking
    status = Column(String, default="pending") # pending, completed, active, cancelled
    is_ai_generated = Column(Boolean, default=False)
    
    # Additional metadata
    description = Column(Text)
    estimated_cost = Column(Float)
    capacity = Column(Integer)
    
    # Relationships
    trip = relationship("Trip", back_populates="activities")
    created_by_user = relationship("User", back_populates="activities")
    votes = relationship("Vote", back_populates="activity")
    activity_feedback = relationship("ActivityFeedback", back_populates="activity")

class Vote(Base):
    __tablename__ = "votes"
    
    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    energy_level = Column(Integer) # 1 (Exhausted) to 10 (Hyper)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    activity = relationship("Activity", back_populates="votes")
    user = relationship("User", back_populates="votes")

# NEW: 5-Category Feedback System
class ActivityFeedback(Base):
    __tablename__ = "activity_feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # 5-Category feedback scores (1-5 scale)
    tired = Column(Integer, default=3) # 1=very tired, 5=very energetic
    energetic = Column(Integer, default=3) # 1=low energy, 5=very energetic
    sick = Column(Integer, default=3) # 1=feeling sick, 5=feeling healthy
    hungry = Column(Integer, default=3) # 1=very hungry, 5=not hungry
    adventurous = Column(Integer, default=3) # 1=not adventurous, 5=very adventurous
    
    # Overall mood/feeling (optional text feedback)
    overall_feeling = Column(Text) # Optional text description
    
    # Timestamp
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    activity = relationship("Activity", back_populates="activity_feedback")
    user = relationship("User", back_populates="activity_feedback")
    
    # Ensure one feedback per user per activity
    __table_args__ = (UniqueConstraint('activity_id', 'user_id', name='activity_user_feedback'),)

# Utility functions for feedback analysis
class FeedbackAnalyzer:
    """Helper class for analyzing 5-category feedback patterns"""
    
    @staticmethod
    def calculate_fatigue_score(feedback_data):
        """
        Calculate overall fatigue score from 5-category feedback
        Returns score from 0-100 (0=not fatigued, 100=very fatigued)
        """
        # High tired + low energetic = fatigued
        # High sick = fatigued
        # High hungry = might indicate fatigue
        # Low adventurous might indicate fatigue
        
        tired_factor = (feedback_data.get('tired', 3) - 1) / 4  # 0-1 scale
        energetic_factor = 1 - ((feedback_data.get('energetic', 3) - 1) / 4)  # invert
        sick_factor = (feedback_data.get('sick', 3) - 1) / 4
        hungry_factor = (feedback_data.get('hungry', 3) - 1) / 4
        adventurous_factor = 1 - ((feedback_data.get('adventurous', 3) - 1) / 4)
        
        # Weighted average
        weights = {
            'tired': 0.3,
            'energetic': 0.25,
            'sick': 0.25,
            'hungry': 0.1,
            'adventurous': 0.1
        }
        
        fatigue_score = (
            tired_factor * weights['tired'] +
            energetic_factor * weights['energetic'] +
            sick_factor * weights['sick'] +
            hungry_factor * weights['hungry'] +
            adventurous_factor * weights['adventurous']
        )
        
        return fatigue_score * 100  # Convert to 0-100 scale
    
    @staticmethod
    def get_fatigue_level(score):
        """Convert fatigue score to human-readable level"""
        if score >= 75:
            return "CRITICAL"  # Immediate intervention needed
        elif score >= 60:
            return "HIGH"      # Consider pivot soon
        elif score >= 40:
            return "MODERATE"  # Monitor closely
        elif score >= 25:
            return "LOW"       # Good energy levels
        else:
            return "EXCELLENT" # Very high energy
    
    @staticmethod
    def generate_recommendations(feedback_data, fatigue_score):
        """Generate activity recommendations based on feedback"""
        recommendations = []
        
        if feedback_data.get('tired', 3) > 4:  # Very tired
            recommendations.append({
                'type': 'suggest',
                'message': 'Consider a rest break or low-energy activity',
                'action': 'schedule_break'
            })
        
        if feedback_data.get('hungry', 3) > 4:  # Very hungry
            recommendations.append({
                'type': 'suggest',
                'message': 'Plan a food/meal break',
                'action': 'food_break'
            })
        
        if feedback_data.get('sick', 3) < 3:  # Feeling sick
            recommendations.append({
                'type': 'urgent',
                'message': 'Health concern - consider ending current activity',
                'action': 'medical_check'
            })
        
        if fatigue_score > 70:  # High fatigue
            recommendations.append({
                'type': 'pivot',
                'message': 'High fatigue detected - consider AI optimization',
                'action': 'ai_pivot'
            })
        
        return recommendations