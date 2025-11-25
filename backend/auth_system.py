import os
from passlib.context import CryptContext
from database import SessionLocal, get_db, Base
from models import User
from sqlalchemy.orm import Session

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# AuthSystem Class - Enhanced for unified trip management system
class AuthSystem:
    def __init__(self):
        self.db = SessionLocal()
    
    def get_db(self) -> Session:
        """Get database session"""
        return self.db
    
    def hash_password(self, password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def register_user(self, full_name: str, username: str, email: str, password: str) -> User:
        """
        Register a new user
        
        Args:
            full_name: User's full name
            username: Unique username
            email: Unique email address
            password: Plain text password (will be hashed)
            
        Returns:
            User object
            
        Raises:
            ValueError: If username or email already exists
        """
        from datetime import datetime
        
        # Check if user already exists
        if self.get_user_by_username(username):
            raise ValueError("Username already exists")
        
        if self.get_user_by_email(email):
            raise ValueError("Email already exists")
        
        # Create new user (without trip_id initially)
        password_hash = self.hash_password(password)
        user = User(
            full_name=full_name,
            username=username,
            email=email,
            password_hash=password_hash,
            is_active=True,
            is_admin=False,
            trip_id=None
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def authenticate_user(self, identifier: str, password: str):
        """
        Authenticate user by email or username
        
        Args:
            identifier: Email address or username
            password: Plain text password
            
        Returns:
            User object if authenticated, None otherwise
        """
        user = self.get_user_by_identifier(identifier)
        
        if not user:
            return None
        
        if not user.is_active:
            return None
        
        if not self.verify_password(password, user.password_hash):
            return None
        
        return user
    
    def get_user_by_id(self, user_id: int) -> User:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def get_user_by_username(self, username: str) -> User:
        """Get user by username"""
        return self.db.query(User).filter(User.username == username).first()
    
    def get_user_by_email(self, email: str) -> User:
        """Get user by email"""
        return self.db.query(User).filter(User.email == email).first()
    
    def get_user_by_identifier(self, identifier: str) -> User:
        """Get user by email or username"""
        user = self.get_user_by_email(identifier)
        if not user:
            user = self.get_user_by_username(identifier)
        return user
    
    def update_user(self, user_id: int, **kwargs) -> User:
        """Update user information"""
        from datetime import datetime
        
        user = self.get_user_by_id(user_id)
        
        if not user:
            return None
        
        for key, value in kwargs.items():
            if hasattr(user, key) and key not in ['id', 'password_hash', 'created_at']:
                setattr(user, key, value)
        
        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def change_password(self, user_id: int, old_password: str, new_password: str) -> bool:
        """Change user password"""
        from datetime import datetime
        
        user = self.get_user_by_id(user_id)
        
        if not user or not self.verify_password(old_password, user.password_hash):
            return False
        
        user.password_hash = self.hash_password(new_password)
        user.updated_at = datetime.utcnow()
        self.db.commit()
        
        return True
    
    def deactivate_user(self, user_id: int) -> bool:
        """Deactivate user account"""
        from datetime import datetime
        
        user = self.get_user_by_id(user_id)
        
        if not user:
            return False
        
        user.is_active = False
        user.updated_at = datetime.utcnow()
        self.db.commit()
        
        return True
    
    def get_all_users(self) -> list:
        """Get all active users"""
        return self.db.query(User).filter(User.is_active == True).all()
    
    # NEW: Trip-related authentication methods
    
    def authenticate_trip_user(self, identifier: str, password: str, trip_id: int):
        """
        Authenticate user and verify they belong to specific trip
        
        Args:
            identifier: Email address or username
            password: Plain text password
            trip_id: Expected trip ID
            
        Returns:
            User object if authenticated and belongs to trip, None otherwise
        """
        user = self.authenticate_user(identifier, password)
        
        if not user:
            return None
        
        if user.trip_id != trip_id:
            return None
        
        return user
    
    def create_trip_admin(self, username: str, password: str, trip_name: str):
        """
        Create a new trip with admin user
        Args:
            username: Admin username (existing user will be promoted to admin)
            password: Admin password (only used if creating new user)
            trip_name: Name of the trip
            
        Returns:
            tuple: (trip, admin_user)
        """
        from models import Trip
        import uuid
        from datetime import datetime
        
        # Create trip first
        join_code = str(uuid.uuid4())[:6].upper()
        
        trip = Trip(
            name=trip_name,
            join_code=join_code,
            current_mood_score=10.0
        )
        
        self.db.add(trip)
        self.db.commit()
        self.db.refresh(trip)
        
        # Check if user already exists
        existing_user = self.get_user_by_username(username)
        
        if existing_user:
            # User exists - promote to admin and assign to trip
            existing_user.is_admin = True
            existing_user.trip_id = trip.id
            # Update full name to indicate admin status
            if not existing_user.full_name.endswith("(Admin)"):
                existing_user.full_name = f"{existing_user.full_name} (Admin)"
            
            self.db.commit()
            self.db.refresh(existing_user)
            admin_user = existing_user
        else:
            # User doesn't exist - create new admin user
            admin_user = User(
                full_name=f"{username} (Admin)",
                username=username,
                email=f"{username}@tripadmin.local",  # Placeholder email
                password_hash=self.hash_password(password),
                is_active=True,
                is_admin=True,
                trip_id=trip.id
            )
            
            self.db.add(admin_user)
            self.db.commit()
            self.db.refresh(admin_user)
        
        return trip, admin_user
    
    def join_trip(self, user_id: int, join_code: str):
        """
        Add user to existing trip
        
        Args:
            user_id: User ID to add to trip
            join_code: Trip join code
            
        Returns:
            bool: True if successful, False otherwise
        """
        from models import Trip
        
        trip = self.db.query(Trip).filter(Trip.join_code == join_code).first()
        if not trip:
            return False
        
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        
        user.trip_id = trip.id
        self.db.commit()
        
        return True
    
    def get_user_trip(self, user_id: int):
        """
        Get trip information for user
        
        Args:
            user_id: User ID
            
        Returns:
            Trip object if user has trip, None otherwise
        """
        user = self.get_user_by_id(user_id)
        if not user or not user.trip_id:
            return None
        
        from models import Trip
        return self.db.query(Trip).filter(Trip.id == user.trip_id).first()
    
    def is_trip_admin(self, user_id: int, trip_id: int) -> bool:
        """
        Check if user is admin for specific trip
        
        Args:
            user_id: User ID
            trip_id: Trip ID
            
        Returns:
            bool: True if user is admin of trip
        """
        user = self.get_user_by_id(user_id)
        return user and user.trip_id == trip_id and user.is_admin
    
    def close(self):
        """Close database connection"""
        self.db.close()
    
    def __del__(self):
        """Cleanup when object is destroyed"""
        try:
            self.close()
        except:
            pass