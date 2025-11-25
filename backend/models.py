from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, JSON, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    
    is_admin = Column(Boolean, default=False)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    trip = relationship("Trip", back_populates="users")
    activities = relationship("Activity", back_populates="created_by_user")
    votes = relationship("Vote", back_populates="user")
    activity_feedback = relationship("ActivityFeedback", back_populates="user")

class Trip(Base):
    __tablename__ = "trips"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    join_code = Column(String, unique=True, index=True, nullable=True)
    
    current_mood_score = Column(Float, default=10.0)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    users = relationship("User", back_populates="trip")
    activities = relationship("Activity", back_populates="trip", order_by="Activity.start_time")

class Activity(Base):
    __tablename__ = "activities"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    title = Column(String, nullable=False)
    type = Column(String)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    location_name = Column(String)
    address = Column(Text)
    lat = Column(Float)
    lng = Column(Float)
    
    status = Column(String, default="pending")
    is_ai_generated = Column(Boolean, default=False)
    
    description = Column(Text)
    estimated_cost = Column(Float)
    capacity = Column(Integer)
    
    trip = relationship("Trip", back_populates="activities")
    created_by_user = relationship("User", back_populates="activities")
    votes = relationship("Vote", back_populates="activity")
    activity_feedback = relationship("ActivityFeedback", back_populates="activity")

class Vote(Base):
    __tablename__ = "votes"
    
    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    energy_level = Column(Integer)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    activity = relationship("Activity", back_populates="votes")
    user = relationship("User", back_populates="votes")

class ActivityFeedback(Base):
    __tablename__ = "activity_feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    tired = Column(Integer, default=3)
    energetic = Column(Integer, default=3)
    sick = Column(Integer, default=3)
    hungry = Column(Integer, default=3)
    adventurous = Column(Integer, default=3)
    
    overall_feeling = Column(Text)
    
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    activity = relationship("Activity", back_populates="activity_feedback")
    user = relationship("User", back_populates="activity_feedback")
    
    __table_args__ = (UniqueConstraint('activity_id', 'user_id', name='activity_user_feedback'),)

class FeedbackAnalyzer:
    @staticmethod
    def calculate_fatigue_score(feedback_data):
        tired_factor = (feedback_data.get('tired', 3) - 1) / 4
        energetic_factor = 1 - ((feedback_data.get('energetic', 3) - 1) / 4)
        sick_factor = (feedback_data.get('sick', 3) - 1) / 4
        hungry_factor = (feedback_data.get('hungry', 3) - 1) / 4
        adventurous_factor = 1 - ((feedback_data.get('adventurous', 3) - 1) / 4)
        
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
        
        return fatigue_score * 100
    
    @staticmethod
    def get_fatigue_level(score):
        if score >= 75:
            return "CRITICAL"
        elif score >= 60:
            return "HIGH"
        elif score >= 40:
            return "MODERATE"
        elif score >= 25:
            return "LOW"
        else:
            return "EXCELLENT"
    
    @staticmethod
    def generate_recommendations(feedback_data, fatigue_score):
        recommendations = []
        
        if feedback_data.get('tired', 3) > 4:
            recommendations.append({
                'type': 'suggest',
                'message': 'Consider a rest break or low-energy activity',
                'action': 'schedule_break'
            })
        
        if feedback_data.get('hungry', 3) > 4:
            recommendations.append({
                'type': 'suggest',
                'message': 'Plan a food/meal break',
                'action': 'food_break'
            })
        
        if feedback_data.get('sick', 3) < 3:
            recommendations.append({
                'type': 'urgent',
                'message': 'Health concern - consider ending current activity',
                'action': 'medical_check'
            })
        
        if fatigue_score > 70:
            recommendations.append({
                'type': 'pivot',
                'message': 'High fatigue detected - consider AI optimization',
                'action': 'ai_pivot'
            })
        
        return recommendations