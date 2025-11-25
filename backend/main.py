from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import uuid
import asyncio
import json
from datetime import datetime, timedelta
import logging

# Import database and models
from database import SessionLocal, get_db, create_tables
import models, schemas
from auth_system import AuthSystem
import pivot_engine
from websocket_manager import connection_manager

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize database
create_tables()
auth_system = AuthSystem()

app = FastAPI(title="AI Trip Management API", version="1.0.0")

# CORS Configuration
origins = [
    "http://localhost:3000",  # React Default
    "http://localhost:5173",  # Vite React Default
    "http://localhost:8000",  # FastAPI default
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# =============================================================================
# AUTHENTICATION ENDPOINTS
# =============================================================================

@app.get("/")
def read_root():
    return {"message": "AI-Powered Trip Management API is Running!", "version": "1.0.0"}

@app.post("/api/signup", response_model=schemas.UserResponse)
async def signup(data: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    if data.password != data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Passwords do not match"
        )

    try:
        user = auth_system.register_user(
            data.full_name, 
            data.username, 
            data.email, 
            data.password
        )
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )

@app.post("/api/login", response_model=schemas.UserResponse)
async def login(data: schemas.UserLogin, db: Session = Depends(get_db)):
    """Authenticate user login"""
    user = auth_system.authenticate_user(data.identifier, data.password)
    
    if user:
        return user
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid Credentials"
        )

# =============================================================================
# TRIP MANAGEMENT ENDPOINTS
# =============================================================================

@app.post("/trips/", response_model=schemas.TripResponse)
async def create_trip(trip_data: schemas.TripCreate, db: Session = Depends(get_db)):
    """Create a new trip with admin user"""
    
    try:
        trip, admin_user = auth_system.create_trip_admin(
            trip_data.admin_username,
            "default_password",  # You might want to handle this differently
            trip_data.trip_name
        )
        
        return schemas.TripResponse(
            id=trip.id,
            name=trip.name,
            join_code=trip.join_code,
            current_mood_score=trip.current_mood_score,
            created_at=trip.created_at,
            user_count=1
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create trip: {str(e)}"
        )

@app.post("/trips/join", response_model=schemas.JoinTripResponse)
async def join_trip(request: schemas.JoinTripRequest, db: Session = Depends(get_db)):
    """Join existing trip using join code"""
    
    # First authenticate the user
    user = auth_system.authenticate_user(request.identifier, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Join the trip
    success = auth_system.join_trip(user.id, request.join_code)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found or invalid join code"
        )
    
    # Get updated user info
    updated_user = auth_system.get_user_by_id(user.id)
    
    return schemas.JoinTripResponse(
        success=True,
        message="Successfully joined trip",
        trip_id=updated_user.trip_id,
        user_role="admin" if updated_user.is_admin else "participant"
    )

@app.get("/trips/{trip_id}/participants", response_model=schemas.TripParticipantsResponse)
async def get_trip_participants(trip_id: int, db: Session = Depends(get_db)):
    """Get all participants of a trip"""
    
    participants = db.query(models.User).filter(
        models.User.trip_id == trip_id,
        models.User.is_active == True
    ).all()
    
    return schemas.TripParticipantsResponse(
        trip_id=trip_id,
        participants=participants
    )

# =============================================================================
# ACTIVITY MANAGEMENT ENDPOINTS
# =============================================================================

@app.post("/activities/", response_model=schemas.ActivityResponse)
async def create_activity(activity_data: schemas.ActivityCreate, db: Session = Depends(get_db)):
    """Create a new activity for a trip"""
    
    # Verify user has access to this trip
    user = auth_system.get_user_by_id(activity_data.trip_id)  # This is wrong, fix it
    
    new_activity = models.Activity(
        trip_id=activity_data.trip_id,
        title=activity_data.title,
        type=activity_data.type,
        start_time=activity_data.start_time,
        end_time=activity_data.end_time,
        location_name=activity_data.location_name,
        address=activity_data.address,
        lat=activity_data.lat,
        lng=activity_data.lng,
        description=activity_data.description,
        estimated_cost=activity_data.estimated_cost,
        capacity=activity_data.capacity
    )
    
    db.add(new_activity)
    db.commit()
    db.refresh(new_activity)
    
    return new_activity

@app.get("/trips/{trip_id}/activities", response_model=List[schemas.ActivityResponse])
async def get_trip_activities(trip_id: int, status: str = None, db: Session = Depends(get_db)):
    """Get activities for a trip"""
    
    query = db.query(models.Activity).filter(models.Activity.trip_id == trip_id)
    
    if status:
        query = query.filter(models.Activity.status == status)
    
    activities = query.order_by(models.Activity.start_time).all()
    
    return activities

@app.put("/activities/{activity_id}/status", response_model=schemas.ActivityResponse)
async def update_activity_status(activity_id: int, update: schemas.ActivityStatusUpdate, db: Session = Depends(get_db)):
    """Update activity status"""
    
    activity = db.query(models.Activity).filter(models.Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    
    activity.status = update.status
    db.commit()
    db.refresh(activity)
    
    return activity

@app.get("/trips/{trip_id}/current-activity", response_model=schemas.CurrentActivityResponse)
async def get_current_activity(trip_id: int, db: Session = Depends(get_db)):
    """Get current active activity for a trip"""
    
    # Check if there's an active activity
    active_activity = db.query(models.Activity).filter(
        models.Activity.trip_id == trip_id,
        models.Activity.status == "active"
    ).first()
    
    if not active_activity:
        return schemas.CurrentActivityResponse(
            activity_id=None,
            activity=None,
            status="no_active_activity"
        )
    
    # Count participants who have voted for this activity
    total_participants = db.query(models.User).filter(
        models.User.trip_id == trip_id,
        models.User.is_active == True
    ).count()
    
    participants_who_voted = [
        vote.user_id for vote in db.query(models.Vote).filter(
            models.Vote.activity_id == active_activity.id
        ).all()
    ]
    
    return schemas.CurrentActivityResponse(
        activity_id=active_activity.id,
        activity=active_activity,
        status="activity_ongoing" if len(participants_who_voted) < total_participants else "waiting_for_votes",
        participants_who_voted=participants_who_voted,
        total_participants=total_participants
    )

# =============================================================================
# FEEDBACK SYSTEM ENDPOINTS (5-CATEGORY)
# =============================================================================

@app.post("/activities/{activity_id}/feedback", response_model=schemas.FeedbackResponse)
async def submit_feedback(activity_id: int, feedback: schemas.FeedbackCreate, db: Session = Depends(get_db)):
    """Submit 5-category feedback for an activity"""
    
    # Verify user can submit feedback for this activity
    activity = db.query(models.Activity).filter(models.Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    
    # Check if user already submitted feedback for this activity
    existing_feedback = db.query(models.ActivityFeedback).filter(
        models.ActivityFeedback.activity_id == activity_id,
        models.ActivityFeedback.user_id == feedback.user_id
    ).first()
    
    if existing_feedback:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feedback already submitted for this activity"
        )
    
    # Create new feedback
    new_feedback = models.ActivityFeedback(
        activity_id=activity_id,
        user_id=feedback.user_id,
        tired=feedback.tired,
        energetic=feedback.energetic,
        sick=feedback.sick,
        hungry=feedback.hungry,
        adventurous=feedback.adventurous,
        overall_feeling=feedback.overall_feeling
    )
    
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    
    # Calculate average scores
    feedback_data = {
        "tired": feedback.tired,
        "energetic": feedback.energetic,
        "sick": feedback.sick,
        "hungry": feedback.hungry,
        "adventurous": feedback.adventurous
    }
    
    # Analyze feedback
    fatigue_score = models.FeedbackAnalyzer.calculate_fatigue_score(feedback_data)
    fatigue_level = models.FeedbackAnalyzer.get_fatigue_level(fatigue_score)
    recommendations = models.FeedbackAnalyzer.generate_recommendations(feedback_data, fatigue_score)
    
    return schemas.FeedbackResponse(
        feedback_id=new_feedback.id,
        average_scores=feedback_data,
        fatigue_analysis={
            "score": fatigue_score,
            "level": fatigue_level
        },
        recommendations=recommendations
    )

@app.get("/activities/{activity_id}/feedback", response_model=schemas.FeedbackAggregateResponse)
async def get_activity_feedback(activity_id: int, db: Session = Depends(get_db)):
    """Get aggregated feedback for an activity"""
    
    # Verify activity exists
    activity = db.query(models.Activity).filter(models.Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    
    # Get all feedback for this activity
    feedbacks = db.query(models.ActivityFeedback).filter(
        models.ActivityFeedback.activity_id == activity_id
    ).all()
    
    if not feedbacks:
        return schemas.FeedbackAggregateResponse(
            activity_id=activity_id,
            total_participants=0,
            feedbacks_submitted=0,
            average_scores={"tired": 3, "energetic": 3, "sick": 3, "hungry": 3, "adventurous": 3},
            fatigue_analysis={"overall_score": 0, "level": "NO_DATA", "severity": "unknown", "action_required": False},
            recommendations=[],
            participant_status=[]
        )
    
    # Calculate averages
    total_feedbacks = len(feedbacks)
    avg_scores = {
        "tired": sum(f.tired for f in feedbacks) / total_feedbacks,
        "energetic": sum(f.energetic for f in feedbacks) / total_feedbacks,
        "sick": sum(f.sick for f in feedbacks) / total_feedbacks,
        "hungry": sum(f.hungry for f in feedbacks) / total_feedbacks,
        "adventurous": sum(f.adventurous for f in feedbacks) / total_feedbacks
    }
    
    # Fatigue analysis
    fatigue_score = models.FeedbackAnalyzer.calculate_fatigue_score(avg_scores)
    fatigue_level = models.FeedbackAnalyzer.get_fatigue_level(fatigue_score)
    
    # Get participant status
    trip_participants = db.query(models.User).filter(
        models.User.trip_id == activity.trip_id,
        models.User.is_active == True
    ).all()
    
    participant_status = [
        {
            "user_id": user.id,
            "username": user.username,
            "has_submitted": user.id in [f.user_id for f in feedbacks],
            "submission_time": next((f.submitted_at for f in feedbacks if f.user_id == user.id), None).isoformat() if user.id in [f.user_id for f in feedbacks] else None
        } for user in trip_participants
    ]
    
    return schemas.FeedbackAggregateResponse(
        activity_id=activity_id,
        total_participants=len(trip_participants),
        feedbacks_submitted=total_feedbacks,
        average_scores=avg_scores,
        fatigue_analysis={
            "overall_score": fatigue_score,
            "level": fatigue_level,
            "severity": "high" if fatigue_score > 60 else "moderate" if fatigue_score > 30 else "low",
            "action_required": fatigue_score > 60
        },
        recommendations=models.FeedbackAnalyzer.generate_recommendations(avg_scores, fatigue_score),
        participant_status=participant_status
    )

# =============================================================================
# LEGACY VOTING ENDPOINTS (for backward compatibility)
# =============================================================================

@app.post("/activities/{activity_id}/vote", response_model=schemas.VoteResponse)
async def vote_mood(activity_id: int, vote: schemas.VoteCreate, db: Session = Depends(get_db)):
    """Legacy voting endpoint (single energy level)"""
    
    # Record vote
    new_vote = models.Vote(
        activity_id=activity_id, 
        user_id=vote.user_id, 
        energy_level=vote.energy_level
    )
    db.add(new_vote)
    db.commit()
    
    # Calculate average immediately for real-time feedback
    avg_score = db.query(func.avg(models.Vote.energy_level)).filter(
        models.Vote.activity_id == activity_id
    ).scalar() or 10.0
    
    # Check if all participants have voted
    activity = db.query(models.Activity).filter(models.Activity.id == activity_id).first()
    total_users = db.query(models.User).filter(
        models.User.trip_id == activity.trip_id,
        models.User.is_active == True
    ).count()
    current_votes = db.query(models.Vote).filter(models.Vote.activity_id == activity_id).count()
    
    # Decision logic (simplified)
    action = "CONTINUE"
    msg = "Waiting for others..."
    
    if current_votes >= (total_users / 2):
        if avg_score < 4.0:
            action = "ADMIN_DECISION" 
            msg = "Group energy is critically low. Admin Intervention Required."
        elif avg_score > 8.0:
            action = "AUTO_PIVOT" 
            msg = "Group is hyper! Adding intensity automatically."
        else:
            action = "CONTINUE"
            msg = "Energy levels optimal. Proceeding to next activity."

    return {
        "average_mood": float(avg_score),
        "action_required": action,
        "message": msg
    }

# =============================================================================
# AI OPTIMIZATION ENDPOINTS
# =============================================================================

@app.post("/trips/{trip_id}/pivot", response_model=schemas.PivotResponse)
async def admin_pivot_decision(trip_id: int, request: schemas.PivotRequest, db: Session = Depends(get_db)):
    """AI-powered trip optimization"""
    
    # Verify admin
    if not auth_system.is_trip_admin(request.admin_id, trip_id):
        raise HTTPException(
            status_code=403, 
            detail="Only Trip Admins can pivot"
        )
    
    if request.decision == "FORCE_CONTINUE":
        return schemas.PivotResponse(
            message="Proceeding with original plan despite fatigue.",
            changes_made=0,
            strategy_used="Manual Continue"
        )
    
    # Get pending activities
    pending_activities = db.query(models.Activity).filter(
        models.Activity.trip_id == trip_id, 
        models.Activity.status == "pending"
    ).all()
    
    # For now, use last activity's feedback as context
    # In a real implementation, you'd aggregate all recent feedback
    last_feedback = db.query(models.ActivityFeedback).join(models.Activity).filter(
        models.Activity.trip_id == trip_id
    ).order_by(models.ActivityFeedback.submitted_at.desc()).first()
    
    if last_feedback:
        feedback_data = {
            "tired": last_feedback.tired,
            "energetic": last_feedback.energetic,
            "sick": last_feedback.sick,
            "hungry": last_feedback.hungry,
            "adventurous": last_feedback.adventurous
        }
    else:
        # Default neutral feedback
        feedback_data = {"tired": 3, "energetic": 3, "sick": 3, "hungry": 3, "adventurous": 3}
    
    # Call AI pivot engine
    optimization_result = pivot_engine.PivotEngine.optimize_itinerary_5_category(
        pending_activities, feedback_data, request.user_lat, request.user_lng
    )
    
    # Apply updates to database
    updated_count = 0
    for update in optimization_result.get("updates", []):
        original_id = update.get("original_id")
        if not original_id:
            continue
            
        activity = db.query(models.Activity).get(original_id)
        if not activity:
            continue
        
        action = update.get("action")
        new_data = update.get("new_data", {})
        
        if action == "replace":
            # Update activity with new data
            for field, value in new_data.items():
                if hasattr(activity, field):
                    setattr(activity, field, value)
            activity.is_ai_generated = True
            updated_count += 1
            
        elif action == "cancel":
            activity.status = "cancelled"
            updated_count += 1
            
        # For "keep" action, no changes needed
    
    db.commit()
    
    return schemas.PivotResponse(
        message=f"Itinerary optimized with AI analysis",
        changes_made=updated_count,
        strategy_used="AI-Enhanced Optimization",
        ai_analysis=optimization_result.get("ai_analysis", {})
    )

# =============================================================================
# UTILITY ENDPOINTS
# =============================================================================

@app.get("/trips/{trip_id}/statistics", response_model=schemas.TripStatisticsResponse)
async def get_trip_statistics(trip_id: int, db: Session = Depends(get_db)):
    """Get statistics for a trip"""
    
    total_activities = db.query(models.Activity).filter(
        models.Activity.trip_id == trip_id
    ).count()
    
    completed_activities = db.query(models.Activity).filter(
        models.Activity.trip_id == trip_id,
        models.Activity.status == "completed"
    ).count()
    
    pending_activities = db.query(models.Activity).filter(
        models.Activity.trip_id == trip_id,
        models.Activity.status == "pending"
    ).count()
    
    total_participants = db.query(models.User).filter(
        models.User.trip_id == trip_id,
        models.User.is_active == True
    ).count()
    
    # Calculate average mood from recent feedback
    recent_feedback = db.query(models.ActivityFeedback).join(models.Activity).filter(
        models.Activity.trip_id == trip_id
    ).order_by(models.ActivityFeedback.submitted_at.desc()).limit(50).all()
    
    if recent_feedback:
        avg_mood = sum((f.energetic + (6 - f.tired)) / 2 for f in recent_feedback) / len(recent_feedback)
    else:
        avg_mood = 5.0
    
    return schemas.TripStatisticsResponse(
        trip_id=trip_id,
        total_activities=total_activities,
        completed_activities=completed_activities,
        pending_activities=pending_activities,
        total_participants=total_participants,
        active_participants=total_participants,  # For now, assume all active
        average_mood_score=avg_mood,
        recent_feedback_trend=[]
    )

# =============================================================================
# WEBSOCKET ENDPOINTS FOR REAL-TIME UPDATES
# =============================================================================

@app.websocket("/ws/trip/{trip_id}/user/{user_id}")
async def websocket_endpoint(websocket: WebSocket, trip_id: int, user_id: int, username: str = None):
    """
    WebSocket endpoint for real-time trip updates.
    Connects users to their trip room for live synchronization.
    """
    if not username:
        # Try to get username from query parameters
        try:
            username = websocket.query_params.get('username', f'user_{user_id}')
        except:
            username = f'user_{user_id}'
    
    try:
        await connection_manager.connect(websocket, trip_id, user_id, username)
        
        # Send initial trip data
        await send_initial_trip_data(websocket, trip_id)
        
        # Listen for incoming messages
        while True:
            try:
                message = await websocket.receive_text()
                message_data = json.loads(message)
                
                # Handle different message types
                await connection_manager.handle_message(websocket, message_data)
                
                # Process real-time updates based on message type
                if message_data.get('type') == 'feedback_update':
                    await handle_websocket_feedback_update(message_data)
                elif message_data.get('type') == 'activity_status_change':
                    await handle_websocket_activity_status_change(message_data)
                elif message_data.get('type') == 'admin_decision':
                    await handle_websocket_admin_decision(message_data)
                    
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    'type': 'error',
                    'message': 'Invalid JSON format'
                }))
            except Exception as e:
                logger.error(f"Error in WebSocket message handling: {e}")
                await websocket.send_text(json.dumps({
                    'type': 'error',
                    'message': 'Internal server error'
                }))
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        connection_manager.disconnect(websocket)

@app.get("/api/websocket/status")
async def get_websocket_status():
    """
    Get WebSocket connection status and statistics.
    """
    return {
        'status': 'active',
        'total_connections': len(connection_manager.connection_metadata),
        'active_trips': len(connection_manager.trip_connections),
        'timestamp': datetime.now().isoformat()
    }

@app.get("/api/trips/{trip_id}/connections")
async def get_trip_connections(trip_id: int):
    """
    Get list of active connections for a specific trip.
    """
    connections_info = connection_manager.get_trip_connections_info(trip_id)
    return {
        'trip_id': trip_id,
        'active_connections': len(connections_info),
        'connections': connections_info
    }

# =============================================================================
# WEBSOCKET HELPER FUNCTIONS
# =============================================================================

async def send_initial_trip_data(websocket: WebSocket, trip_id: int):
    """
    Send initial trip data when WebSocket connection is established.
    """
    try:
        # Get current activity
        current_activity_data = await get_current_activity_for_websocket(trip_id)
        
        # Get recent feedback
        recent_feedback_data = await get_recent_feedback_for_websocket(trip_id)
        
        # Get active participants
        active_participants = await get_active_participants_for_websocket(trip_id)
        
        initial_data = {
            'type': 'initial_data',
            'trip_id': trip_id,
            'current_activity': current_activity_data,
            'recent_feedback': recent_feedback_data,
            'active_participants': active_participants,
            'timestamp': datetime.now().isoformat()
        }
        
        await websocket.send_text(json.dumps(initial_data))
        
    except Exception as e:
        logger.error(f"Error sending initial trip data: {e}")

async def get_current_activity_for_websocket(trip_id: int):
    """Get current activity data for WebSocket clients"""
    db = SessionLocal()
    try:
        active_activity = db.query(models.Activity).filter(
            models.Activity.trip_id == trip_id,
            models.Activity.status == "active"
        ).first()
        
        if not active_activity:
            return None
        
        # Get vote count for this activity
        total_participants = db.query(models.User).filter(
            models.User.trip_id == trip_id,
            models.User.is_active == True
        ).count()
        
        participants_who_voted = [
            vote.user_id for vote in db.query(models.Vote).filter(
                models.Vote.activity_id == active_activity.id
            ).all()
        ]
        
        return {
            'activity_id': active_activity.id,
            'title': active_activity.title,
            'type': active_activity.type,
            'status': active_activity.status,
            'start_time': active_activity.start_time.isoformat() if active_activity.start_time else None,
            'location_name': active_activity.location_name,
            'votes_received': len(participants_who_voted),
            'total_participants': total_participants,
            'completion_percentage': (len(participants_who_voted) / total_participants * 100) if total_participants > 0 else 0
        }
    finally:
        db.close()

async def get_recent_feedback_for_websocket(trip_id: int):
    """Get recent feedback data for WebSocket clients"""
    db = SessionLocal()
    try:
        # Get feedback from the last 30 minutes
        thirty_minutes_ago = datetime.now() - timedelta(minutes=30)
        
        recent_feedback = db.query(models.ActivityFeedback).join(models.Activity).filter(
            models.Activity.trip_id == trip_id,
            models.ActivityFeedback.submitted_at >= thirty_minutes_ago
        ).order_by(models.ActivityFeedback.submitted_at.desc()).all()
        
        if not recent_feedback:
            return []
        
        feedback_summary = []
        for feedback in recent_feedback:
            user = db.query(models.User).filter(models.User.id == feedback.user_id).first()
            feedback_summary.append({
                'feedback_id': feedback.id,
                'user_id': feedback.user_id,
                'username': user.username if user else 'Unknown',
                'activity_id': feedback.activity_id,
                'tired': feedback.tired,
                'energetic': feedback.energetic,
                'sick': feedback.sick,
                'hungry': feedback.hungry,
                'adventurous': feedback.adventurous,
                'overall_feeling': feedback.overall_feeling,
                'submitted_at': feedback.submitted_at.isoformat()
            })
        
        return feedback_summary
    finally:
        db.close()

async def get_active_participants_for_websocket(trip_id: int):
    """Get active participants data for WebSocket clients"""
    db = SessionLocal()
    try:
        participants = db.query(models.User).filter(
            models.User.trip_id == trip_id,
            models.User.is_active == True
        ).all()
        
        participants_info = []
        for user in participants:
            participants_info.append({
                'user_id': user.id,
                'username': user.username,
                'full_name': user.full_name,
                'is_admin': user.is_admin,
                'connected': connection_manager.get_user_connection_count(user.id) > 0
            })
        
        return participants_info
    finally:
        db.close()

async def handle_websocket_feedback_update(message_data: dict):
    """
    Handle real-time feedback updates via WebSocket.
    """
    trip_id = message_data.get('trip_id')
    user_id = message_data.get('user_id')
    feedback_data = message_data.get('feedback_data', {})
    
    # Broadcast to all trip participants
    await connection_manager.broadcast_to_trip(trip_id, {
        'type': 'feedback_live_update',
        'user_id': user_id,
        'feedback_preview': {
            'tired': feedback_data.get('tired'),
            'energetic': feedback_data.get('energetic'),
            'overall_feeling': feedback_data.get('overall_feeling', 'unknown')
        },
        'timestamp': datetime.now().isoformat()
    })

async def handle_websocket_activity_status_change(message_data: dict):
    """
    Handle real-time activity status changes via WebSocket.
    """
    trip_id = message_data.get('trip_id')
    activity_id = message_data.get('activity_id')
    new_status = message_data.get('new_status')
    user_id = message_data.get('user_id')
    
    # Broadcast activity status change to all participants
    await connection_manager.broadcast_to_trip(trip_id, {
        'type': 'activity_status_live_change',
        'activity_id': activity_id,
        'new_status': new_status,
        'user_id': user_id,
        'timestamp': datetime.now().isoformat()
    })

async def handle_websocket_admin_decision(message_data: dict):
    """
    Handle real-time admin decisions via WebSocket.
    """
    trip_id = message_data.get('trip_id')
    decision_type = message_data.get('decision_type')
    decision_data = message_data.get('decision_data', {})
    admin_user_id = message_data.get('admin_user_id')
    
    # Broadcast admin decision to all participants
    await connection_manager.broadcast_to_trip(trip_id, {
        'type': 'admin_decision_live',
        'decision_type': decision_type,
        'decision_data': decision_data,
        'admin_user_id': admin_user_id,
        'timestamp': datetime.now().isoformat()
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)