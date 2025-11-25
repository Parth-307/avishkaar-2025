from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Database Configuration
# Use existing users.db for backward compatibility, but this can be changed
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./users.db")

# Create engine with appropriate settings for development
if "sqlite" in DATABASE_URL:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},  # Needed for SQLite
        echo=False  # Set to True for SQL logging
    )
else:
    engine = create_engine(DATABASE_URL)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class (import all models before calling create_all)
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create all tables
def create_tables():
    """Create all database tables"""
    import models  # Import models to ensure they're registered
    
    # Drop existing tables and recreate with new schema
    # This is for development - in production, use migrations
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

# Initialize database with sample data (for development)
def init_db_with_sample_data():
    """Initialize database with sample data for testing"""
    import models
    from sqlalchemy.orm import Session
    from datetime import datetime, timedelta
    import random
    
    db = SessionLocal()
    
    try:
        # Check if we already have data
        if db.query(models.Trip).count() > 0:
            print("Database already contains data, skipping sample data creation")
            return
        
        # Create sample trip
        sample_trip = models.Trip(
            name="Weekend Adventure Trip",
            join_code="TRIP123"
        )
        db.add(sample_trip)
        db.commit()
        db.refresh(sample_trip)
        
        # Create admin user for the trip
        admin_user = models.User(
            full_name="Trip Admin",
            username="admin",
            email="admin@example.com",
            password_hash="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewlM8lB9YJwF.LkS",  # hashed "password"
            is_admin=True,
            trip_id=sample_trip.id
        )
        db.add(admin_user)
        
        # Create sample activities
        activities = [
            models.Activity(
                trip_id=sample_trip.id,
                title="Morning Hiking",
                type="physical",
                start_time=datetime.now() + timedelta(hours=2),
                end_time=datetime.now() + timedelta(hours=4),
                location_name="Local Park",
                address="123 Park Street",
                lat=40.7128,
                lng=-74.0060,
                status="pending"
            ),
            models.Activity(
                trip_id=sample_trip.id,
                title="Lunch at Cafe",
                type="food",
                start_time=datetime.now() + timedelta(hours=5),
                end_time=datetime.now() + timedelta(hours=6),
                location_name="Downtown Cafe",
                address="456 Main Street",
                lat=40.7130,
                lng=-74.0058,
                status="pending"
            ),
            models.Activity(
                trip_id=sample_trip.id,
                title="Museum Visit",
                type="relaxing",
                start_time=datetime.now() + timedelta(hours=7),
                end_time=datetime.now() + timedelta(hours=9),
                location_name="City Museum",
                address="789 Culture Ave",
                lat=40.7135,
                lng=-74.0055,
                status="pending"
            )
        ]
        
        for activity in activities:
            db.add(activity)
        
        db.commit()
        print("Sample data initialized successfully!")
        
    except Exception as e:
        print(f"Error initializing sample data: {e}")
        db.rollback()
    finally:
        db.close()