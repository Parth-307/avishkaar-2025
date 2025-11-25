from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from datetime import datetime
import os

# Database Configuration
DATABASE_URL = "sqlite:///./users.db"

# Create engine
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False}
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# User Model
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# AuthSystem Class
class AuthSystem:
    def __init__(self):
        self.db = SessionLocal()
        self.init_db()
    
    def init_db(self):
        """Initialize database tables"""
        Base.metadata.create_all(bind=engine)
    
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
        # Check if user already exists
        if self.get_user_by_username(username):
            raise ValueError("Username already exists")
        
        if self.get_user_by_email(email):
            raise ValueError("Email already exists")
        
        # Create new user
        password_hash = self.hash_password(password)
        user = User(
            full_name=full_name,
            username=username,
            email=email,
            password_hash=password_hash
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
        user = self.get_user_by_id(user_id)
        
        if not user:
            return None
        
        for key, value in kwargs.items():
            if hasattr(user, key) and key != 'id' and key != 'password_hash':
                setattr(user, key, value)
        
        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def change_password(self, user_id: int, old_password: str, new_password: str) -> bool:
        """Change user password"""
        user = self.get_user_by_id(user_id)
        
        if not user or not self.verify_password(old_password, user.password_hash):
            return False
        
        user.password_hash = self.hash_password(new_password)
        user.updated_at = datetime.utcnow()
        self.db.commit()
        
        return True
    
    def deactivate_user(self, user_id: int) -> bool:
        """Deactivate user account"""
        user = self.get_user_by_id(user_id)
        
        if not user:
            return False
        
        user.is_active = False
        user.updated_at = datetime.utcnow()
        self.db.commit()
        
        return True
    
    def get_all_users(self) -> list:
        """Get all users"""
        return self.db.query(User).filter(User.is_active == True).all()
    
    def close(self):
        """Close database connection"""
        self.db.close()
    
    def __del__(self):
        """Cleanup when object is destroyed"""
        try:
            self.close()
        except:
            pass