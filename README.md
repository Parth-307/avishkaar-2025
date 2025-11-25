# AI-Powered Trip Management System

## 🚀 **Quick Start Guide**

### Prerequisites
- Python 3.8+
- Node.js 14+
- Git

### Local Development

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
# Server runs on http://127.0.0.1:8000
```

**Frontend:**
```bash
cd frontend
npm install
npm start
# App runs on http://localhost:3000
```

## 🌟 **Features**
✅ **User Authentication** - Secure registration and login  
✅ **Trip Management** - Create and manage group trips  
✅ **Activity Planning** - Manual activity creation and tracking  
✅ **AI Fatigue Analysis** - Smart 5-category feedback system  
✅ **Real-time Optimization** - AI-powered trip adjustments  
✅ **WebSocket Support** - Live updates and notifications  

## 📊 **Technology Stack**
- **Backend**: FastAPI + Python + SQLite + SQLAlchemy
- **Frontend**: React.js + WebSocket
- **AI**: Custom fatigue analysis engine
- **Database**: SQLite (production-ready for small deployments)

## 🎯 **AI System**
The AI system monitors user feedback across 5 categories:
- **Tired/Energetic**: Fatigue level tracking
- **Sick**: Health status monitoring  
- **Hungry**: Energy level assessment
- **Adventurous**: Engagement level analysis

When fatigue scores reach concerning levels, AI provides intelligent recommendations for trip optimization.

## 🚀 **Free Deployment**
See `DEPLOYMENT_GUIDE.md` for detailed deployment instructions on:
- Railway.app (Recommended)
- Render.com
- Vercel + Railway combination

## 📱 **API Endpoints**
- `POST /register` - User registration
- `POST /login` - User authentication  
- `POST /trips` - Create new trip
- `GET /trips/{id}` - Get trip details
- `POST /trips/{id}/activities` - Add activities
- `POST /trips/{id}/feedback` - Submit 5-category feedback
- `POST /trips/{id}/pivot` - AI optimization trigger
- `WebSocket /ws` - Real-time updates

## 🏆 **Production Ready**
- ✅ Database constraint handling
- ✅ Error handling & validation
- ✅ Real-time WebSocket connections
- ✅ AI-powered fatigue analysis
- ✅ Scalable architecture