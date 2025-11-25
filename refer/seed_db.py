from database import SessionLocal, engine
import models
from datetime import datetime, timedelta

# Create tables
models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

# 1. Create a Trip
print("🌱 Seeding Trip...")
trip = models.Trip(name="Hackathon Test Trip", join_code="TEST01", current_mood_score=10.0)
db.add(trip)
db.commit()

# 2. Create an Admin User
admin = models.User(username="AdminUser", is_admin=True, trip_id=trip.id)
db.add(admin)
db.commit()

# 3. Create Activities (Morning Hike & Lunch)
# Set times relative to NOW so they appear as "future/pending"
now = datetime.now()

act1 = models.Activity(
    trip_id=trip.id,
    title="Hardcore Mountain Hike",
    type="physical",
    start_time=now + timedelta(hours=1), # Starts in 1 hour
    end_time=now + timedelta(hours=3),
    location_name="Tiger Point",
    address="Lonavala, India",
    lat=18.7481,
    lng=73.4072,
    status="pending"
)

act2 = models.Activity(
    trip_id=trip.id,
    title="Sunset Yoga",
    type="physical",
    start_time=now + timedelta(hours=5),
    end_time=now + timedelta(hours=6),
    location_name="Lions Point",
    address="Lonavala, India",
    lat=18.7481,
    lng=73.4072,
    status="pending"
)

db.add_all([act1, act2])
db.commit()

print(f"✅ Database seeded! Trip ID: {trip.id}, Admin ID: {admin.id}")
print(f"Activities created: '{act1.title}' (ID: {act1.id}) and '{act2.title}' (ID: {act2.id})")
db.close()
'''
```

**Run the seed script:**
```bash
python seed_db.py
```

### 3. Run the FastAPI Server
Now start the main server. It will use the database you just seeded.

```bash
uvicorn main:app --reload
```

### 4. Test with Swagger UI (Easiest Method)
FastAPI provides an automatic testing UI. Open your browser to:
**`http://127.0.0.1:8000/docs`**

You will see your endpoints interactively.

#### **Scenario A: Vote "Tired" to Trigger Alert**
1.  Find the `POST /activities/{activity_id}/vote` endpoint.
2.  Click **Try it out**.
3.  Enter `activity_id`: **1** (from the seed script).
4.  Edit the Request Body to simulate a tired user:
    ```json
    {
      "user_id": 1,
      "energy_level": 2
    }
    ```
5.  Click **Execute**.
6.  **Check Response:** You should see `"action_required": "ADMIN_DECISION"` because the average score is now very low.

#### **Scenario B: Test the AI Pivot**
Now, simulate the Admin clicking the "Optimize" button.

1.  Find the `POST /trips/{trip_id}/pivot` endpoint.
2.  Click **Try it out**.
3.  Enter `trip_id`: **1**.
4.  Edit the Request Body:
    ```json
    {
      "admin_id": 1,
      "user_lat": 18.7481,
      "user_lng": 73.4072,
      "decision": "PIVOT_WITH_AI"
    }
    ```
5.  Click **Execute**.
    * **What happens:** The backend will read the "Hardcore Mountain Hike" (Physical), see that the mood is "Tired" (from your vote), send it to Gemini, get a "Replace with Spa" suggestion, search Google Maps for a Spa, and update the database.
6.  **Verify:** You should see a response like:
    ```json
    {
      "message": "Itinerary Optimized",
      "changes_made": 1,
      "strategy_used": "Partial Update..."
    }

    '''