import os
from passlib.context import CryptContext
from database import SessionLocal, get_db, Base
from models import User
from sqlalchemy.orm import Session

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthSystem:
    def __init__(self):
        self.db = SessionLocal()
    
    def get_db(self) -> Session:
        return self.db
    
    def hash_password(self, password: str) -> str:
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)
    
    def register_user(self, full_name: str, username: str, email: str, password: str) -> User:
        from datetime import datetime
        
        if self.get_user_by_username(username):
            raise ValueError("Username already exists")
        
        if self.get_user_by_email(email):
            raise ValueError("Email already exists")
        
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
        user = self.get_user_by_identifier(identifier)
        
        if not user:
            return None
        
        if not user.is_active:
            return None
        
        if not self.verify_password(password, user.password_hash):
            return None
        
        return user
    
    def get_user_by_id(self, user_id: int) -> User:
        return self.db.query(User).filter(User.id == user_id).first()
    
    def get_user_by_username(self, username: str) -> User:
        return self.db.query(User).filter(User.username == username).first()
    
    def get_user_by_email(self, email: str) -> User:
        return self.db.query(User).filter(User.email == email).first()
    
    def get_user_by_identifier(self, identifier: str) -> User:
        user = self.get_user_by_email(identifier)
        if not user:
            user = self.get_user_by_username(identifier)
        return user
    
    def update_user(self, user_id: int, **kwargs) -> User:
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
        from datetime import datetime
        
        user = self.get_user_by_id(user_id)
        
        if not user or not self.verify_password(old_password, user.password_hash):
            return False
        
        user.password_hash = self.hash_password(new_password)
        user.updated_at = datetime.utcnow()
        self.db.commit()
        
        return True
    
    def deactivate_user(self, user_id: int) -> bool:
        from datetime import datetime
        
        user = self.get_user_by_id(user_id)
        
        if not user:
            return False
        
        user.is_active = False
        user.updated_at = datetime.utcnow()
        self.db.commit()
        
        return True
    
    def get_all_users(self) -> list:
        return self.db.query(User).filter(User.is_active == True).all()
    
    def authenticate_trip_user(self, identifier: str, password: str, trip_id: int):
        user = self.authenticate_user(identifier, password)
        
        if not user:
            return None
        
        if user.trip_id != trip_id:
            return None
        
        return user
    
    def create_trip_admin(self, username: str, password: str, trip_name: str):
        from models import Trip
        import uuid
        from datetime import datetime
        
        join_code = str(uuid.uuid4())[:6].upper()
        
        trip = Trip(
            name=trip_name,
            join_code=join_code,
            current_mood_score=10.0
        )
        
        self.db.add(trip)
        self.db.commit()
        self.db.refresh(trip)
        
        existing_user = self.get_user_by_username(username)
        
        if existing_user:
            existing_user.is_admin = True
            existing_user.trip_id = trip.id
            if not existing_user.full_name.endswith("(Admin)"):
                existing_user.full_name = f"{existing_user.full_name} (Admin)"
            
            self.db.commit()
            self.db.refresh(existing_user)
            admin_user = existing_user
        else:
            admin_user = User(
                full_name=f"{username} (Admin)",
                username=username,
                email=f"{username}@tripadmin.local",
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
        user = self.get_user_by_id(user_id)
        if not user or not user.trip_id:
            return None
        
        from models import Trip
        return self.db.query(Trip).filter(Trip.id == user.trip_id).first()
    
    def is_trip_admin(self, user_id: int, trip_id: int) -> bool:
        user = self.get_user_by_id(user_id)
        return user and user.trip_id == trip_id and user.is_admin
    
    def close(self):
        self.db.close()
    
    def __del__(self):
        try:
            self.close()
        except:
            pass