import { useWebSocket } from '../hooks/useWebSocket';

/**
 * SocketService - Centralized WebSocket service
 * Provides singleton pattern for WebSocket connections across the app
 */

class SocketService {
  constructor() {
    this.connections = new Map();
    this.eventListeners = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the socket service
   */
  init() {
    if (this.isInitialized) return;

    console.log('SocketService initialized');
    this.isInitialized = true;

    // Set up global event listeners
    this.setupGlobalListeners();
  }

  /**
   * Create or get existing WebSocket connection
   */
  createConnection(tripId, userId, username) {
    const key = `${tripId}_${userId}`;
    
    if (this.connections.has(key)) {
      return this.connections.get(key);
    }

    console.log(`Creating new WebSocket connection for trip ${tripId}, user ${userId}`);
    
    // Create new connection using useWebSocket hook
    // Note: This is typically done within React components, but this service
    // can be used for utility functions and background tasks
    
    return {
      tripId,
      userId,
      username,
      connect: () => console.log('Use useWebSocket hook in React components'),
      disconnect: () => console.log('Disconnect from React component'),
      sendMessage: (message) => console.log('Send message from React component'),
      isConnected: false,
      connectionStatus: 'disconnected'
    };
  }

  /**
   * Remove WebSocket connection
   */
  removeConnection(tripId, userId) {
    const key = `${tripId}_${userId}`;
    
    if (this.connections.has(key)) {
      const connection = this.connections.get(key);
      connection.disconnect?.();
      this.connections.delete(key);
      console.log(`Removed WebSocket connection for trip ${tripId}, user ${userId}`);
    }
  }

  /**
   * Send message to all active connections in a trip
   */
  broadcastToTrip(tripId, message) {
    // This would typically be called from the backend via server-side broadcasting
    // But can also be used for client-side coordination
    
    console.log(`Broadcasting to trip ${tripId}:`, message);
    
    // Trigger event listeners
    this.triggerEventListeners(`trip_${tripId}`, {
      type: 'broadcast',
      data: message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Add event listener
   */
  addEventListener(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    this.eventListeners.get(event).add(callback);
    
    // Return cleanup function
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.eventListeners.delete(event);
        }
      }
    };
  }

  /**
   * Remove event listener
   */
  removeEventListener(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  /**
   * Trigger event listeners
   */
  triggerEventListeners(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Setup global event listeners
   */
  setupGlobalListeners() {
    // Handle visibility change (pause/resume connections)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        console.log('Page hidden - minimizing WebSocket activity');
      } else {
        console.log('Page visible - resuming WebSocket activity');
      }
    });

    // Handle beforeunload (cleanup connections)
    window.addEventListener('beforeunload', () => {
      console.log('Page unloading - cleaning up WebSocket connections');
      this.cleanup();
    });

    // Handle online/offline status
    window.addEventListener('online', () => {
      console.log('Network online - resuming connections');
      this.triggerEventListeners('network_online', { timestamp: new Date().toISOString() });
    });

    window.addEventListener('offline', () => {
      console.log('Network offline - disconnecting connections');
      this.triggerEventListeners('network_offline', { timestamp: new Date().toISOString() });
    });
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      activeConnections: Array.from(this.connections.values()).filter(conn => conn.isConnected).length,
      registeredEvents: Array.from(this.eventListeners.keys()),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get all active connections
   */
  getActiveConnections() {
    return Array.from(this.connections.entries()).map(([key, connection]) => ({
      key,
      tripId: connection.tripId,
      userId: connection.userId,
      username: connection.username,
      isConnected: connection.isConnected,
      connectionStatus: connection.connectionStatus
    }));
  }

  /**
   * Check if user is connected to a specific trip
   */
  isUserConnectedToTrip(tripId, userId) {
    const key = `${tripId}_${userId}`;
    const connection = this.connections.get(key);
    return connection?.isConnected || false;
  }

  /**
   * Get participants count for a trip
   */
  getTripParticipantCount(tripId) {
    return Array.from(this.connections.values()).filter(
      conn => conn.tripId === tripId && conn.isConnected
    ).length;
  }

  /**
   * Cleanup all connections
   */
  cleanup() {
    console.log('Cleaning up SocketService connections');
    
    this.connections.forEach((connection, key) => {
      connection.disconnect?.();
    });
    
    this.connections.clear();
    this.eventListeners.clear();
  }

  /**
   * Health check for WebSocket connections
   */
  async healthCheck() {
    const connections = this.getActiveConnections();
    const results = [];
    
    for (const conn of connections) {
      try {
        const response = await fetch('/api/websocket/status');
        const status = await response.json();
        
        results.push({
          tripId: conn.tripId,
          userId: conn.userId,
          status: 'healthy',
          serverStatus: status
        });
      } catch (error) {
        results.push({
          tripId: conn.tripId,
          userId: conn.userId,
          status: 'unhealthy',
          error: error.message
        });
      }
    }
    
    return {
      timestamp: new Date().toISOString(),
      totalChecked: connections.length,
      results
    };
  }
}

// Create singleton instance
const socketService = new SocketService();

// Initialize service
socketService.init();

export default socketService;
export { SocketService };