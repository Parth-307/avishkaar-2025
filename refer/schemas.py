from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- Vote Schemas ---
class VoteCreate(BaseModel):
    user_id: int
    energy_level: int # 1-10

class VoteResponse(BaseModel):
    average_mood: float
    action_required: str # "CONTINUE", "ADMIN_DECISION", "AUTO_PIVOT"
    message: str

# --- Activity Schemas ---
class ActivityBase(BaseModel):
    title: str
    type: str
    start_time: datetime
    end_time: datetime
    location_name: str
    lat: float
    lng: float

class ActivityCreate(ActivityBase):
    pass

class ActivityResponse(ActivityBase):
    id: int
    status: str
    is_ai_generated: bool
    
    class Config:
        from_attributes = True

# --- Trip Schemas ---
class TripCreate(BaseModel):
    admin_username: str
    trip_name: str

class PivotRequest(BaseModel):
    admin_id: int
    user_lat: float
    user_lng: float
    decision: str # "FORCE_CONTINUE" or "PIVOT_WITH_AI"