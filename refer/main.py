from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import uuid

from database import SessionLocal, engine, Base
import models, schemas
import pivot_engine 

# Create Tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 1. Trip Creation (Admin) ---
@app.post("/trips/", response_model=schemas.TripCreate)
def create_trip(trip_data: schemas.TripCreate, db: Session = Depends(get_db)):
    join_code = str(uuid.uuid4())[:6].upper() # Generate 6-char code
    
    new_trip = models.Trip(name=trip_data.trip_name, join_code=join_code)
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    
    # Create Admin User
    admin_user = models.User(username=trip_data.admin_username, is_admin=True, trip_id=new_trip.id)
    db.add(admin_user)
    db.commit()
    
    return {"admin_username": admin_user.username, "trip_name": new_trip.name, "join_code": join_code}

# --- 2. Voting Logic (The Trigger) ---
@app.post("/activities/{activity_id}/vote", response_model=schemas.VoteResponse)
def vote_mood(activity_id: int, vote: schemas.VoteCreate, db: Session = Depends(get_db)):
    # 1. Record Vote
    new_vote = models.Vote(activity_id=activity_id, user_id=vote.user_id, energy_level=vote.energy_level)
    db.add(new_vote)
    db.commit()
    
    # 2. Check Total Votes vs Total Users (Are we done voting?)
    activity = db.query(models.Activity).filter(models.Activity.id == activity_id).first()
    total_users = db.query(models.User).filter(models.User.trip_id == activity.trip_id).count()
    current_votes = db.query(models.Vote).filter(models.Vote.activity_id == activity_id).count()
    
    # Calculate Average immediately for real-time feedback
    avg_score = db.query(func.avg(models.Vote.energy_level)).filter(models.Vote.activity_id == activity_id).scalar() or 10.0
    
    # 3. Decision Logic
    action = "CONTINUE"
    msg = "Waiting for others..."
    
    # Only trigger logic if majority have voted (simple optimization)
    if current_votes >= (total_users / 2):
        if avg_score < 4.0:
            action = "ADMIN_DECISION" # Threshold breached!
            msg = "Group energy is critically low. Admin Intervention Required."
        elif avg_score > 8.0:
            action = "AUTO_PIVOT" # Optimize for fun automatically
            msg = "Group is hyper! Adding intensity automatically."
        else:
            action = "CONTINUE"
            msg = "Energy levels optimal. Proceeding to next activity."

    return {
        "average_mood": float(avg_score),
        "action_required": action,
        "message": msg
    }

# --- 3. The Pivot Endpoint (Admin Action) ---
@app.post("/trips/{trip_id}/pivot")
def admin_pivot_decision(trip_id: int, request: schemas.PivotRequest, db: Session = Depends(get_db)):
    
    # Verify Admin
    user = db.query(models.User).filter(models.User.id == request.admin_id).first()
    if not user or not user.is_admin:
        raise HTTPException(status_code=403, detail="Only Admins can pivot")

    if request.decision == "FORCE_CONTINUE":
        return {"message": "Proceeding with original plan despite fatigue."}
    
    # --- AI PIVOT EXECUTION ---
    
    # 1. Get current mood score
    # (Simplified: getting score from last activity)
    last_activity = db.query(models.Activity).filter(models.Activity.trip_id == trip_id, models.Activity.status == "completed").order_by(models.Activity.end_time.desc()).first()
    mood_score = 3.0 # Fallback/Mock
    if last_activity:
         mood_score = db.query(func.avg(models.Vote.energy_level)).filter(models.Vote.activity_id == last_activity.id).scalar()

    # 2. Get Pending Activities
    pending_activities = db.query(models.Activity).filter(
        models.Activity.trip_id == trip_id, 
        models.Activity.status == "pending"
    ).all()

    # 3. Call The Engine
    updates = pivot_engine.optimize_itinerary(pending_activities, mood_score, request.user_lat, request.user_lng)
    
    # 4. Apply Updates to DB
    updated_count = 0
    for update in updates:
        # Find original activity
        act = db.query(models.Activity).get(update['original_id'])
        if act:
            # Update fields directly (Partial Update)
            data = update['new_data']
            act.title = data['title']
            act.location_name = data['location_name']
            act.address = data['address']
            act.lat = data['lat']
            act.lng = data['lng']
            act.type = data['type']
            act.is_ai_generated = True
            updated_count += 1
            
    db.commit()
    
    return {
        "message": "Itinerary Optimized", 
        "changes_made": updated_count,
        "strategy_used": "Partial Update - Kept non-conflicting events"
    }