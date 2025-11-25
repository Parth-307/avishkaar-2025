import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [userTrips, setUserTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [tripStats, setTripStats] = useState({
    totalTrips: 0,
    totalCountries: 0,
    totalDays: 0
  });

  React.useEffect(() => {
    fetchUserTrips();
  }, []);

  const fetchUserTrips = async () => {
    setLoadingTrips(true);
    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      
      if (userData.trip_id) {
        const statsResponse = await fetch(`http://127.0.0.1:8000/trips/${userData.trip_id}/statistics`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const tripResponse = await fetch(`http://127.0.0.1:8000/trips/${userData.trip_id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (tripResponse.ok) {
          const tripDetails = await tripResponse.json();
          
          const startDate = tripDetails.created_at ? new Date(tripDetails.created_at) : new Date('2025-12-15');
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 7);
          
          const trip = {
            id: tripDetails.id,
            name: tripDetails.name || 'My Trip',
            destination: tripDetails.name || 'Trip Destination',
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            status: 'Confirmed'
          };
          
          setUserTrips([trip]);
          
          setTripStats({
            totalTrips: 1,
            totalCountries: 1,
            totalDays: 7
          });
        } else {
          const updatedUserData = { ...userData, trip_id: null };
          localStorage.setItem('userData', JSON.stringify(updatedUserData));
          setUserTrips([]);
          setTripStats({
            totalTrips: 0,
            totalCountries: 0,
            totalDays: 0
          });
        }
      } else {
        setUserTrips([]);
        setTripStats({
          totalTrips: 0,
          totalCountries: 0,
          totalDays: 0
        });
      }
    } catch (error) {
      setUserTrips([]);
      setTripStats({
        totalTrips: 0,
        totalCountries: 0,
        totalDays: 0
      });
    } finally {
      setLoadingTrips(false);
    }
  };

  const handleCreateTrip = () => {
    navigate('/create-trip');
  };

  const handleJoinTrip = async () => {
    if (!joinCode.trim()) {
      setJoinError('Please enter a join code');
      return;
    }

    setJoinLoading(true);
    setJoinError('');

    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      
      const response = await fetch('http://127.0.0.1:8000/trips/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: userData.username || userData.email,
          password: userData.password || 'password123',
          join_code: joinCode
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const updatedUserData = {
          ...userData,
          trip_id: result.trip_id,
          is_admin: result.user_role === 'admin'
        };
        localStorage.setItem('userData', JSON.stringify(updatedUserData));
        
        setShowJoinModal(false);
        setJoinCode('');
        
        fetchUserTrips();
      } else {
        setJoinError(result.detail || 'Failed to join trip');
      }
    } catch (error) {
      setJoinError('Network error. Please try again.');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleRefreshTrips = () => {
    fetchUserTrips();
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  const recentActivity = [
    { id: 1, action: "Trip created", tripName: userTrips[0]?.name || "Your Trip", time: "2 hours ago" },
    { id: 2, action: "Hotel booked", tripName: userTrips[0]?.name || "Your Trip", time: "1 day ago" },
    { id: 3, action: "Flight confirmed", tripName: userTrips[0]?.name || "Your Trip", time: "3 days ago" },
  ];

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button onClick={handleGoHome} className="back-btn">← Back to Home</button>
        <div className="user-greeting">
          <span>Welcome back, {userData.full_name?.split(' ')[0] || 'Traveler'}! 👋</span>
        </div>
      </header>

      <div className="dashboard-grid">
        <section className="profile-section">
          <div className="profile-card">
            <div className="profile-avatar">🌍</div>
            <div className="profile-info">
              <h3>{userData.full_name || 'Traveler'}</h3>
              <p>Travel Enthusiast</p>
              <div className="profile-stats">
                <div className="stat">
                  <span className="stat-number">{tripStats.totalTrips}</span>
                  <span className="stat-label">Trips</span>
                </div>
                <div className="stat">
                  <span className="stat-number">{tripStats.totalCountries}</span>
                  <span className="stat-label">Countries</span>
                </div>
                <div className="stat">
                  <span className="stat-number">{tripStats.totalDays}</span>
                  <span className="stat-label">Days</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="quick-actions">
          <div className="section-header">
            <h2>Quick Actions</h2>
          </div>
          <div className="action-cards">
            <button onClick={handleCreateTrip} className="action-card primary">
              <div className="action-icon">➕</div>
              <h3>Create New Trip</h3>
              <p>Plan your next adventure</p>
            </button>
            <button className="action-card secondary">
              <div className="action-icon">📍</div>
              <h3>Explore Destinations</h3>
              <p>Discover amazing places</p>
            </button>
            <button onClick={() => setShowJoinModal(true)} className="action-card tertiary">
              <div className="action-icon">👥</div>
              <h3>Join Group Trip</h3>
              <p>Travel with others</p>
            </button>
          </div>
        </section>

        <section className="upcoming-trips">
          <div className="section-header">
            <h2>Upcoming Trips</h2>
            <button onClick={handleRefreshTrips} className="view-all-btn" style={{ marginRight: '8px' }}>🔄</button>
            <button className="view-all-btn">View All</button>
          </div>
          <div className="trips-list">
            {loadingTrips ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>⏳</div>
                <div>Loading your trips...</div>
              </div>
            ) : userTrips.length > 0 ? (
              userTrips.map(trip => (
                <div key={trip.id} className="trip-card">
                  <div className="trip-destination">📍 {trip.destination}</div>
                  <div className="trip-name">{trip.name}</div>
                  <div className="trip-dates">{trip.startDate} - {trip.endDate}</div>
                  <div className={`trip-status ${trip.status.toLowerCase()}`}>{trip.status}</div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎒</div>
                <div style={{ fontSize: '1.1rem', marginBottom: '8px', fontWeight: '600' }}>No Trips Yet</div>
                <div style={{ fontSize: '0.9rem' }}>Create your first trip to get started!</div>
                <button
                  onClick={handleCreateTrip}
                  style={{
                    marginTop: '16px',
                    padding: '8px 16px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Create Trip
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="recent-activity">
          <div className="section-header">
            <h2>Recent Activity</h2>
          </div>
          <div className="activity-list">
            {recentActivity.map(activity => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">📝</div>
                <div className="activity-content">
                  <div className="activity-action">{activity.action}</div>
                  <div className="activity-trip">{activity.tripName}</div>
                </div>
                <div className="activity-time">{activity.time}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="travel-stats">
          <div className="section-header">
            <h2>Travel Stats</h2>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">✈️</div>
              <div className="stat-value">{tripStats.totalTrips}</div>
              <div className="stat-label">Trips Planned</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🌍</div>
              <div className="stat-value">{tripStats.totalCountries}</div>
              <div className="stat-label">Countries</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-value">{tripStats.totalDays}</div>
              <div className="stat-label">Total Days</div>
            </div>
          </div>
        </section>
      </div>

      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Join Group Trip</h2>
              <button onClick={() => setShowJoinModal(false)} className="modal-close">✕</button>
            </div>
            <div className="modal-body">
              <p>Enter the join code shared by your trip organizer:</p>
              <input
                type="text"
                placeholder="Enter join code (e.g., ABC123)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="join-code-input"
                maxLength={10}
              />
              {joinError && <div className="error-message">{joinError}</div>}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowJoinModal(false)} className="btn-cancel">Cancel</button>
              <button
                onClick={handleJoinTrip}
                disabled={joinLoading || !joinCode.trim()}
                className="btn-join"
              >
                {joinLoading ? 'Joining...' : 'Join Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;