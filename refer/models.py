from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, JSON
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    is_admin = Column(Boolean, default=False)
    trip_id = Column(Integer, ForeignKey("trips.id"))
    
    trip = relationship("Trip", back_populates="users")

class Trip(Base):
    __tablename__ = "trips"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    join_code = Column(String, unique=True, index=True) # e.g., "TRIP-1234"
    current_mood_score = Column(Float, default=10.0) # Average energy 1-10
    
    users = relationship("User", back_populates="trip")
    activities = relationship("Activity", back_populates="trip", order_by="Activity.start_time")

class Activity(Base):
    __tablename__ = "activities"
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"))
    
    title = Column(String)
    type = Column(String) # physical, relaxing, food, travel
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    location_name = Column(String)
    address = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    
    # Status tracking for the "Partial Update" logic
    status = Column(String, default="pending") # pending, completed, active, cancelled
    is_ai_generated = Column(Boolean, default=False)
    
    trip = relationship("Trip", back_populates="activities")
    votes = relationship("Vote", back_populates="activity")

class Vote(Base):
    __tablename__ = "votes"
    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    energy_level = Column(Integer) # 1 (Exhausted) to 10 (Hyper)
    
    activity = relationship("Activity", back_populates="votes")