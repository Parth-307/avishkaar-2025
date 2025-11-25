from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Set, Optional
import json
import asyncio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    Manages WebSocket connections for real-time updates.
    Organizes connections by trip rooms for efficient broadcasting.
    """
    
    def __init__(self):
        # Map of trip_id to set of WebSocket connections
        self.trip_connections: Dict[int, Set[WebSocket]] = {}
        # Map of user_id to their connections
        self.user_connections: Dict[int, Set[WebSocket]] = {}
        # Map of WebSocket to user metadata
        self.connection_metadata: Dict[WebSocket, Dict] = {}
        
    async def connect(self, websocket: WebSocket, trip_id: int, user_id: int, username: str):
        """Accept connection and add to appropriate rooms"""
        await websocket.accept()
        
        # Add to trip room
        if trip_id not in self.trip_connections:
            self.trip_connections[trip_id] = set()
        self.trip_connections[trip_id].add(websocket)
        
        # Add to user connections
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(websocket)
        
        # Store metadata
        self.connection_metadata[websocket] = {
            'user_id': user_id,
            'username': username,
            'trip_id': trip_id,
            'connected_at': datetime.now()
        }
        
        logger.info(f"User {username} (ID: {user_id}) connected to trip {trip_id}")
        
        # Send connection confirmation
        await self.send_to_user(user_id, {
            'type': 'connection_established',
            'message': 'Connected to real-time updates',
            'user_id': user_id,
            'trip_id': trip_id,
            'timestamp': datetime.now().isoformat()
        })
        
        # Notify others of new participant
        await self.broadcast_to_trip(trip_id, {
            'type': 'participant_joined',
            'user_id': user_id,
            'username': username,
            'timestamp': datetime.now().isoformat()
        }, exclude_user_id=user_id)
    
    def disconnect(self, websocket: WebSocket):
        """Remove connection and clean up"""
        if websocket not in self.connection_metadata:
            return
            
        metadata = self.connection_metadata[websocket]
        user_id = metadata['user_id']
        username = metadata['username']
        trip_id = metadata['trip_id']
        
        # Remove from trip connections
        if trip_id in self.trip_connections:
            self.trip_connections[trip_id].discard(websocket)
            if not self.trip_connections[trip_id]:
                del self.trip_connections[trip_id]
        
        # Remove from user connections
        if user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        # Remove metadata
        del self.connection_metadata[websocket]
        
        logger.info(f"User {username} (ID: {user_id}) disconnected from trip {trip_id}")
        
        # Notify others of participant leaving
        asyncio.create_task(self.broadcast_to_trip(trip_id, {
            'type': 'participant_left',
            'user_id': user_id,
            'username': username,
            'timestamp': datetime.now().isoformat()
        }))
    
    async def send_to_user(self, user_id: int, message: dict):
        """Send message to specific user"""
        if user_id not in self.user_connections:
            return
            
        disconnected = set()
        for websocket in self.user_connections[user_id].copy():
            try:
                await websocket.send_text(json.dumps(message))
            except WebSocketDisconnect:
                disconnected.add(websocket)
            except Exception as e:
                logger.error(f"Error sending to user {user_id}: {e}")
                disconnected.add(websocket)
        
        # Clean up disconnected sockets
        for websocket in disconnected:
            self.disconnect(websocket)
    
    async def send_to_trip(self, trip_id: int, message: dict):
        """Send message to all users in a trip"""
        if trip_id not in self.trip_connections:
            return
            
        disconnected = set()
        for websocket in self.trip_connections[trip_id].copy():
            try:
                await websocket.send_text(json.dumps(message))
            except WebSocketDisconnect:
                disconnected.add(websocket)
            except Exception as e:
                logger.error(f"Error sending to trip {trip_id}: {e}")
                disconnected.add(websocket)
        
        # Clean up disconnected sockets
        for websocket in disconnected:
            self.disconnect(websocket)
    
    async def broadcast_to_trip(self, trip_id: int, message: dict, exclude_user_id: Optional[int] = None):
        """Send message to all users in a trip except specified user"""
        if trip_id not in self.trip_connections:
            return
            
        disconnected = set()
        for websocket in self.trip_connections[trip_id].copy():
            # Skip excluded user
            if exclude_user_id and websocket in self.connection_metadata:
                metadata = self.connection_metadata[websocket]
                if metadata['user_id'] == exclude_user_id:
                    continue
                    
            try:
                await websocket.send_text(json.dumps(message))
            except WebSocketDisconnect:
                disconnected.add(websocket)
            except Exception as e:
                logger.error(f"Error broadcasting to trip {trip_id}: {e}")
                disconnected.add(websocket)
        
        # Clean up disconnected sockets
        for websocket in disconnected:
            self.disconnect(websocket)
    
    async def broadcast_to_all(self, message: dict):
        """Send message to all connected users"""
        all_websockets = set()
        for connections in self.trip_connections.values():
            all_websockets.update(connections)
        
        disconnected = set()
        for websocket in all_websockets:
            try:
                await websocket.send_text(json.dumps(message))
            except WebSocketDisconnect:
                disconnected.add(websocket)
            except Exception as e:
                logger.error(f"Error broadcasting to all: {e}")
                disconnected.add(websocket)
        
        # Clean up disconnected sockets
        for websocket in disconnected:
            self.disconnect(websocket)
    
    def get_trip_participant_count(self, trip_id: int) -> int:
        """Get number of active participants in a trip"""
        return len(self.trip_connections.get(trip_id, set()))
    
    def get_user_connection_count(self, user_id: int) -> int:
        """Get number of connections for a user"""
        return len(self.user_connections.get(user_id, set()))
    
    def get_trip_connections_info(self, trip_id: int) -> List[Dict]:
        """Get connection info for a trip"""
        if trip_id not in self.trip_connections:
            return []
        
        return [
            {
                'user_id': self.connection_metadata[ws]['user_id'],
                'username': self.connection_metadata[ws]['username'],
                'connected_at': self.connection_metadata[ws]['connected_at'].isoformat()
            }
            for ws in self.trip_connections[trip_id]
            if ws in self.connection_metadata
        ]
    
    async def handle_message(self, websocket: WebSocket, message: dict):
        """Handle incoming WebSocket messages"""
        message_type = message.get('type')
        
        if message_type == 'ping':
            await websocket.send_text(json.dumps({
                'type': 'pong',
                'timestamp': datetime.now().isoformat()
            }))
        elif message_type == 'feedback_update':
            # Real-time feedback submission
            await self.handle_feedback_update(message)
        elif message_type == 'activity_status_change':
            # Real-time activity status updates
            await self.handle_activity_status_change(message)
        elif message_type == 'admin_decision':
            # Real-time admin decisions
            await self.handle_admin_decision(message)
        else:
            logger.warning(f"Unknown message type: {message_type}")
    
    async def handle_feedback_update(self, message: dict):
        """Handle real-time feedback updates"""
        trip_id = message.get('trip_id')
        user_id = message.get('user_id')
        feedback_data = message.get('feedback_data', {})
        
        # Broadcast feedback update to all trip participants
        await self.broadcast_to_trip(trip_id, {
            'type': 'feedback_received',
            'user_id': user_id,
            'feedback_data': feedback_data,
            'timestamp': datetime.now().isoformat()
        })
    
    async def handle_activity_status_change(self, message: dict):
        """Handle real-time activity status changes"""
        trip_id = message.get('trip_id')
        activity_id = message.get('activity_id')
        new_status = message.get('new_status')
        user_id = message.get('user_id')
        
        # Broadcast activity status change
        await self.broadcast_to_trip(trip_id, {
            'type': 'activity_status_updated',
            'activity_id': activity_id,
            'new_status': new_status,
            'user_id': user_id,
            'timestamp': datetime.now().isoformat()
        })
    
    async def handle_admin_decision(self, message: dict):
        """Handle real-time admin decisions"""
        trip_id = message.get('trip_id')
        decision_type = message.get('decision_type')
        decision_data = message.get('decision_data', {})
        admin_user_id = message.get('admin_user_id')
        
        # Broadcast admin decision to all participants
        await self.broadcast_to_trip(trip_id, {
            'type': 'admin_decision_made',
            'decision_type': decision_type,
            'decision_data': decision_data,
            'admin_user_id': admin_user_id,
            'timestamp': datetime.now().isoformat()
        })

# Global connection manager instance
connection_manager = ConnectionManager()