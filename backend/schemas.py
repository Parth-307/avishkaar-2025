from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# --- Authentication Schemas ---
class UserCreate(BaseModel):
    full_name: str
    username: str
    email: EmailStr
    password: str
    confirm_password: str

class UserLogin(BaseModel):
    identifier: str  # Email or username
    password: str

class UserResponse(BaseModel):
    id: int
    full_name: str
    username: str
    email: str
    is_admin: bool
    trip_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# --- Trip Schemas ---
class TripCreate(BaseModel):
    admin_username: str
    trip_name: str

class TripResponse(BaseModel):
    id: int
    name: str
    join_code: str
    current_mood_score: float
    created_at: datetime
    user_count: Optional[int] = 0
    
    class Config:
        from_attributes = True

class TripParticipantsResponse(BaseModel):
    trip_id: int
    participants: List[UserResponse]
    
# --- Activity Schemas ---
class ActivityBase(BaseModel):
    title: str
    type: str  # physical, relaxing, food, travel, etc.
    start_time: datetime
    end_time: datetime
    location_name: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    description: Optional[str] = None
    estimated_cost: Optional[float] = None
    capacity: Optional[int] = None

class ActivityCreate(ActivityBase):
    trip_id: int

class ActivityResponse(ActivityBase):
    id: int
    status: str
    is_ai_generated: bool
    trip_id: int
    created_by_user_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class ActivityStatusUpdate(BaseModel):
    status: str  # pending, completed, active, cancelled

# --- Legacy Voting (Single energy level) ---
class VoteCreate(BaseModel):
    user_id: int
    energy_level: int  # 1-10

class VoteResponse(BaseModel):
    average_mood: float
    action_required: str  # "CONTINUE", "ADMIN_DECISION", "AUTO_PIVOT"
    message: str

# --- NEW: 5-Category Feedback System ---
class FeedbackCreate(BaseModel):
    """Submit 5-category feedback for an activity"""
    user_id: int
    tired: int = 3  # 1=very tired, 5=very energetic
    energetic: int = 3  # 1=low energy, 5=very energetic
    sick: int = 3  # 1=feeling sick, 5=feeling healthy
    hungry: int = 3  # 1=very hungry, 5=not hungry
    adventurous: int = 3  # 1=not adventurous, 5=very adventurous
    overall_feeling: Optional[str] = None

class FeedbackResponse(BaseModel):
    """Response for individual feedback submission"""
    feedback_id: int
    average_scores: dict
    fatigue_analysis: dict
    recommendations: List[dict]

class ParticipantStatus(BaseModel):
    user_id: int
    username: str
    has_submitted: bool
    submission_time: Optional[str] = None

class FeedbackAggregateResponse(BaseModel):
    """Aggregated feedback for trip hosts"""
    activity_id: int
    total_participants: int
    feedbacks_submitted: int
    average_scores: dict
    fatigue_analysis: dict
    recommendations: List[str]
    participant_status: List[ParticipantStatus]  # Which participants have submitted feedback

# --- Enhanced Pivot System ---
class PivotRequest(BaseModel):
    admin_id: int
    user_lat: float
    user_lng: float
    decision: str  # "FORCE_CONTINUE" or "PIVOT_WITH_AI"
    reason: Optional[str] = None

class PivotResponse(BaseModel):
    message: str
    changes_made: int
    strategy_used: str
    ai_analysis: Optional[dict] = None

# --- Trip Joining ---
class JoinTripRequest(BaseModel):
    join_code: str
    username: str

class JoinTripResponse(BaseModel):
    success: bool
    message: str
    trip_id: Optional[int] = None
    user_role: Optional[str] = None  # "admin" or "participant"

# --- Activity Management ---
class CurrentActivityResponse(BaseModel):
    """Get current active activity for a trip"""
    activity_id: Optional[int] = None
    activity: Optional[ActivityResponse] = None
    status: str  # "no_active_activity", "activity_ongoing", "waiting_for_votes"
    participants_who_voted: List[int] = []
    total_participants: int = 0

# --- Trip Statistics ---
class TripStatisticsResponse(BaseModel):
    """Statistics for trip hosts"""
    trip_id: int
    total_activities: int
    completed_activities: int
    pending_activities: int
    total_participants: int
    active_participants: int
    average_mood_score: float
    recent_feedback_trend: List[dict]

# --- Real-time Updates ---
class FeedbackUpdate(BaseModel):
    """WebSocket message for real-time feedback updates"""
    type: str  # "feedback_submitted", "fatigue_alert", "pivot_suggested"
    activity_id: int
    user_id: int
    data: dict

# --- Error Responses ---
class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None