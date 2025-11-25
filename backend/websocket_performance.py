import asyncio
import json
import time
import logging
from typing import Dict, List, Optional, Set, Any
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from collections import defaultdict, deque
import hashlib

logger = logging.getLogger(__name__)

@dataclass
class MessageMetrics:
    """Track WebSocket message performance metrics"""
    message_type: str
    size_bytes: int
    send_time: float
    receive_time: Optional[float] = None
    delivery_time: Optional[float] = None
    retry_count: int = 0
    success: bool = True
    error_message: Optional[str] = None

@dataclass
class ConnectionQuality:
    """Monitor WebSocket connection quality"""
    connection_id: str
    user_id: int
    trip_id: int
    connected_at: datetime
    messages_sent: int = 0
    messages_received: int = 0
    messages_failed: int = 0
    avg_response_time: float = 0.0
    connection_stability: float = 1.0  # 0.0 to 1.0
    quality_score: float = 1.0  # 0.0 to 1.0

class MessageQueue:
    """Queue messages for offline/delayed delivery"""
    
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self.queues: Dict[str, deque] = defaultdict(lambda: deque(maxlen=max_size))
        self.message_ids: Set[str] = set()
        
    def add_message(self, user_id: int, message: dict) -> str:
        """Add message to user's queue"""
        message_id = hashlib.md5(
            f"{user_id}_{time.time()}_{json.dumps(message, sort_keys=True)}".encode()
        ).hexdigest()[:16]
        
        if message_id not in self.message_ids:
            self.message_ids.add(message_id)
            
            # Add timestamp and message ID
            enriched_message = {
                **message,
                'message_id': message_id,
                'queue_timestamp': datetime.now().isoformat(),
                'retry_count': 0
            }
            
            self.queues[user_id].append(enriched_message)
            logger.debug(f"Message {message_id} added to queue for user {user_id}")
        
        return message_id
    
    def get_messages(self, user_id: int) -> List[dict]:
        """Get all pending messages for user"""
        return list(self.queues[user_id])
    
    def clear_user_messages(self, user_id: int):
        """Clear all messages for a specific user"""
        if user_id in self.queues:
            message_count = len(self.queues[user_id])
            self.queues[user_id].clear()
            logger.info(f"Cleared {message_count} messages from queue for user {user_id}")
    
    def update_retry_count(self, user_id: int, message_id: str):
        """Update retry count for a specific message"""
        messages = list(self.queues[user_id])
        for message in messages:
            if message.get('message_id') == message_id:
                message['retry_count'] += 1
                if message['retry_count'] > 3:  # Max retries
                    logger.warning(f"Message {message_id} exceeded max retries, removing from queue")
                    self.queues[user_id].remove(message)
                break
    
    def get_queue_stats(self) -> Dict:
        """Get queue statistics"""
        total_messages = sum(len(queue) for queue in self.queues.values())
        user_count = len(self.queues)
        
        return {
            'total_queued_messages': total_messages,
            'users_with_messages': user_count,
            'queue_utilization': total_messages / (user_count * self.max_size) if user_count > 0 else 0,
            'timestamp': datetime.now().isoformat()
        }

class PerformanceOptimizer:
    """Optimize WebSocket performance and message delivery"""
    
    def __init__(self):
        self.message_queue = MessageQueue()
        self.connection_metrics: Dict[str, ConnectionQuality] = {}
        self.message_history: deque = deque(maxlen=10000)
        self.throttle_config = {
            'feedback_updates': {'interval': 1.0, 'max_messages': 5},  # 1 second, max 5
            'status_changes': {'interval': 0.5, 'max_messages': 10},   # 0.5 seconds, max 10
            'admin_decisions': {'interval': 0.1, 'max_messages': 20}   # 0.1 seconds, max 20
        }
        self.last_sent: Dict[str, float] = {}
        self.batch_config = {
            'feedback_batch_size': 10,
            'feedback_batch_interval': 2.0,  # 2 seconds
            'status_batch_size': 5,
            'status_batch_interval': 1.0
        }
        
    def add_connection_quality(self, connection_id: str, user_id: int, trip_id: int):
        """Add new connection to quality monitoring"""
        self.connection_metrics[connection_id] = ConnectionQuality(
            connection_id=connection_id,
            user_id=user_id,
            trip_id=trip_id,
            connected_at=datetime.now()
        )
        logger.info(f"Added quality monitoring for connection {connection_id}")
    
    def update_message_metrics(self, connection_id: str, metrics: MessageMetrics):
        """Update message performance metrics"""
        if connection_id in self.connection_metrics:
            quality = self.connection_metrics[connection_id]
            
            # Update counters
            if metrics.success:
                quality.messages_sent += 1
                if metrics.delivery_time:
                    # Update average response time
                    total_time = quality.avg_response_time * (quality.messages_sent - 1) + metrics.delivery_time
                    quality.avg_response_time = total_time / quality.messages_sent
            else:
                quality.messages_failed += 1
            
            # Calculate quality score
            total_messages = quality.messages_sent + quality.messages_failed
            if total_messages > 0:
                success_rate = quality.messages_sent / total_messages
                # Factor in response time (lower is better)
                response_factor = max(0.1, 1.0 - (quality.avg_response_time / 1000))  # Normalize to 1 second
                quality.quality_score = success_rate * response_factor
            
            # Store message in history
            self.message_history.append({
                'connection_id': connection_id,
                'timestamp': datetime.now().isoformat(),
                'metrics': asdict(metrics)
            })
    
    def should_throttle_message(self, user_id: int, message_type: str) -> bool:
        """Check if message should be throttled"""
        if message_type not in self.throttle_config:
            return False
            
        config = self.throttle_config[message_type]
        throttle_key = f"{user_id}_{message_type}"
        
        now = time.time()
        last_sent = self.last_sent.get(throttle_key, 0)
        
        if now - last_sent < config['interval']:
            return True
            
        # Update last sent time
        self.last_sent[throttle_key] = now
        return False
    
    def optimize_message_broadcast(self, trip_id: int, message_type: str, messages: List[dict]) -> List[dict]:
        """Optimize message broadcasting with batching and throttling"""
        optimized_messages = []
        
        for message in messages:
            user_id = message.get('user_id')
            if not user_id:
                continue
                
            # Check throttling
            if self.should_throttle_message(user_id, message_type):
                # Add to queue for later delivery
                self.message_queue.add_message(user_id, {
                    'trip_id': trip_id,
                    'type': message_type,
                    'original_message': message,
                    'delivery_reason': 'throttled'
                })
                continue
            
            optimized_messages.append(message)
        
        return optimized_messages
    
    def batch_messages(self, messages: List[dict], batch_type: str) -> List[dict]:
        """Batch similar messages for efficient delivery"""
        if batch_type == 'feedback':
            config = self.batch_config['feedback_batch_size']
            batch_interval = self.batch_config['feedback_batch_interval']
        elif batch_type == 'status':
            config = self.batch_config['status_batch_size']
            batch_interval = self.batch_config['status_batch_interval']
        else:
            return messages
        
        # Simple batching - in production, you'd want more sophisticated logic
        if len(messages) > config:
            # Create batch message
            batch_message = {
                'type': f'{batch_type}_batch',
                'batch_id': hashlib.md5(f"{time.time()}_{len(messages)}".encode()).hexdigest()[:8],
                'batch_size': len(messages),
                'batch_interval': batch_interval,
                'messages': messages[:config],
                'timestamp': datetime.now().isoformat()
            }
            
            # Queue excess messages
            for message in messages[config:]:
                user_id = message.get('user_id')
                if user_id:
                    self.message_queue.add_message(user_id, {
                        'trip_id': message.get('trip_id'),
                        'type': f'{batch_type}_batch_delayed',
                        'original_message': message,
                        'delivery_reason': 'batch_overflow'
                    })
            
            return [batch_message]
        
        return messages
    
    def handle_connection_quality_issues(self, connection_id: str) -> Dict[str, Any]:
        """Handle connection quality degradation"""
        if connection_id not in self.connection_metrics:
            return {'action': 'none', 'reason': 'connection_not_tracked'}
        
        quality = self.connection_metrics[connection_id]
        
        # Quality thresholds
        if quality.quality_score < 0.3:
            return {
                'action': 'disconnect',
                'reason': 'critical_quality',
                'quality_score': quality.quality_score
            }
        elif quality.quality_score < 0.6:
            return {
                'action': 'reduce_frequency',
                'reason': 'poor_quality',
                'quality_score': quality.quality_score,
                'suggested_interval': quality.avg_response_time * 2
            }
        elif quality.quality_score < 0.8:
            return {
                'action': 'monitor',
                'reason': 'degrading_quality',
                'quality_score': quality.quality_score
            }
        
        return {'action': 'none', 'reason': 'quality_good', 'quality_score': quality.quality_score}
    
    def cleanup_stale_connections(self, max_age_hours: int = 24):
        """Clean up stale connection metrics"""
        cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
        
        stale_connections = []
        for connection_id, quality in self.connection_metrics.items():
            if quality.connected_at < cutoff_time:
                stale_connections.append(connection_id)
        
        for connection_id in stale_connections:
            del self.connection_metrics[connection_id]
            logger.info(f"Cleaned up stale connection metrics for {connection_id}")
        
        return len(stale_connections)
    
    def get_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report"""
        total_connections = len(self.connection_metrics)
        active_connections = [c for c in self.connection_metrics.values() if c.quality_score > 0.5]
        
        # Calculate overall metrics
        avg_quality = sum(c.quality_score for c in self.connection_metrics.values()) / max(1, total_connections)
        avg_response_time = sum(c.avg_response_time for c in self.connection_metrics.values()) / max(1, total_connections)
        total_messages = sum(c.messages_sent + c.messages_failed for c in self.connection_metrics.values())
        
        # Quality distribution
        excellent = sum(1 for c in self.connection_metrics.values() if c.quality_score >= 0.9)
        good = sum(1 for c in self.connection_metrics.values() if 0.7 <= c.quality_score < 0.9)
        poor = sum(1 for c in self.connection_metrics.values() if c.quality_score < 0.7)
        
        return {
            'overall_performance': {
                'total_connections': total_connections,
                'active_connections': len(active_connections),
                'average_quality_score': round(avg_quality, 3),
                'average_response_time_ms': round(avg_response_time, 2),
                'total_messages_processed': total_messages
            },
            'quality_distribution': {
                'excellent': excellent,
                'good': good,
                'poor': poor
            },
            'message_queues': self.message_queue.get_queue_stats(),
            'recommendations': self._generate_recommendations(avg_quality, avg_response_time, total_messages),
            'timestamp': datetime.now().isoformat()
        }
    
    def _generate_recommendations(self, avg_quality: float, avg_response_time: float, total_messages: int) -> List[str]:
        """Generate performance recommendations"""
        recommendations = []
        
        if avg_quality < 0.7:
            recommendations.append("Consider reducing message frequency to improve connection quality")
        
        if avg_response_time > 1000:
            recommendations.append("High response times detected - consider optimizing message size and batching")
        
        if total_messages > 5000:
            recommendations.append("High message volume - implement more aggressive throttling")
        
        if not recommendations:
            recommendations.append("WebSocket performance is optimal")
        
        return recommendations

# Global performance optimizer instance
performance_optimizer = PerformanceOptimizer()