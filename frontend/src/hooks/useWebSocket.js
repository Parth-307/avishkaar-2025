import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useWebSocket Hook
 * Manages WebSocket connection and real-time messaging for trip updates
 */
export const useWebSocket = (tripId, userId, username) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [recentFeedback, setRecentFeedback] = useState([]);
  
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000; // 2 seconds
  const HEARTBEAT_INTERVAL = 30000; // 30 seconds

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // Construct WebSocket URL with proper path
    const wsUrl = `${protocol}//${host}/ws/trip/${tripId}/user/${userId}?username=${encodeURIComponent(username)}`;
    
    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        
        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          sendMessage({ type: 'ping' });
        }, HEARTBEAT_INTERVAL);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        
        // Attempt reconnection if not a clean close
        if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          scheduleReconnect();
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
      scheduleReconnect();
    }
  }, [tripId, userId, username]);

  // Handle incoming messages
  const handleMessage = (message) => {
    setLastMessage(message);

    switch (message.type) {
      case 'connection_established':
        console.log('WebSocket connection established');
        setConnectionStatus('connected');
        break;

      case 'initial_data':
        setCurrentActivity(message.current_activity);
        setRecentFeedback(message.recent_feedback || []);
        setParticipants(message.active_participants || []);
        break;

      case 'participant_joined':
        setParticipants(prev => {
          const exists = prev.find(p => p.user_id === message.user_id);
          if (exists) return prev;
          
          return [...prev, {
            user_id: message.user_id,
            username: message.username,
            connected: true
          }];
        });
        break;

      case 'participant_left':
        setParticipants(prev => prev.filter(p => p.user_id !== message.user_id));
        break;

      case 'feedback_received':
      case 'feedback_live_update':
        // Update recent feedback
        if (message.feedback_preview) {
          setRecentFeedback(prev => [
            {
              user_id: message.user_id,
              username: 'Current User',
              feedback_preview: message.feedback_preview,
              timestamp: message.timestamp
            },
            ...prev.slice(0, 9) // Keep last 10
          ]);
        }
        break;

      case 'activity_status_updated':
      case 'activity_status_live_change':
        if (message.activity_id === currentActivity?.activity_id) {
          setCurrentActivity(prev => ({
            ...prev,
            status: message.new_status
          }));
        }
        break;

      case 'admin_decision_made':
      case 'admin_decision_live':
        console.log('Admin decision received:', message);
        // Handle admin decisions (could trigger UI updates)
        break;

      case 'pong':
        // Heartbeat response
        break;

      case 'error':
        console.error('WebSocket error message:', message.message);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  };

  // Send message through WebSocket
  const sendMessage = useCallback((message) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket is not connected');
      return false;
    }
  }, []);

  // Submit feedback via WebSocket
  const submitFeedback = useCallback((feedbackData) => {
    const message = {
      type: 'feedback_update',
      trip_id: tripId,
      user_id: userId,
      feedback_data: feedbackData,
      timestamp: new Date().toISOString()
    };
    
    return sendMessage(message);
  }, [tripId, userId, sendMessage]);

  // Update activity status via WebSocket
  const updateActivityStatus = useCallback((activityId, newStatus) => {
    const message = {
      type: 'activity_status_change',
      trip_id: tripId,
      activity_id: activityId,
      new_status: newStatus,
      user_id: userId,
      timestamp: new Date().toISOString()
    };
    
    return sendMessage(message);
  }, [tripId, userId, sendMessage]);

  // Send admin decision via WebSocket
  const sendAdminDecision = useCallback((decisionType, decisionData) => {
    const message = {
      type: 'admin_decision',
      trip_id: tripId,
      decision_type: decisionType,
      decision_data: decisionData,
      admin_user_id: userId,
      timestamp: new Date().toISOString()
    };
    
    return sendMessage(message);
  }, [tripId, userId, sendMessage]);

  // Schedule reconnection
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setConnectionStatus('failed');
      console.error('Max reconnection attempts reached');
      return;
    }

    reconnectAttemptsRef.current += 1;
    setConnectionStatus(`reconnecting (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, RECONNECT_DELAY * reconnectAttemptsRef.current);
  }, [connect]);

  // Set reconnect attempts
  const setReconnectAttempts = useCallback((count) => {
    reconnectAttemptsRef.current = count;
  }, []);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close(1000, 'Client disconnected');
      socketRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  // Auto-connect when tripId, userId, and username are available
  useEffect(() => {
    if (tripId && userId && username) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [tripId, userId, username, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // Connection status
    isConnected,
    connectionStatus,
    
    // Current data
    participants,
    currentActivity,
    recentFeedback,
    lastMessage,
    
    // Actions
    connect,
    disconnect,
    sendMessage,
    submitFeedback,
    updateActivityStatus,
    sendAdminDecision,
    
    // Connection info
    reconnectAttempts: reconnectAttemptsRef.current,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS
  };
};

export default useWebSocket;