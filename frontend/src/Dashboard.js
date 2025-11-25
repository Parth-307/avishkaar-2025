import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();

  const handleCreateTrip = () => {
    navigate('/create-trip');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  // Mock data for upcoming trips (in a real app, this would come from an API)
  const upcomingTrips = [
    { id: 1, name: "Bali Adventure", destination: "Bali, Indonesia", startDate: "2025-12-15", endDate: "2025-12-22", status: "Confirmed" },
    { id: 2, name: "Goa Beach Trip", destination: "Goa, India", startDate: "2025-11-28", endDate: "2025-12-02", status: "Pending" },
  ];

  // Mock data for recent activity
  const recentActivity = [
    { id: 1, action: "Trip created", tripName: "Bali Adventure", time: "2 hours ago" },
    { id: 2, action: "Hotel booked", tripName: "Goa Beach Trip", time: "1 day ago" },
    { id: 3, action: "Flight confirmed", tripName: "Bali Adventure", time: "3 days ago" },
  ];

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <button onClick={handleGoHome} className="back-btn">← Back to Home</button>
        <div className="user-greeting">
          <span>Welcome back, {userData.full_name?.split(' ')[0] || 'Traveler'}! 👋</span>
        </div>
      </header>

      <div className="dashboard-grid">
        {/* Profile Section */}
        <section className="profile-section">
          <div className="profile-card">
            <div className="profile-avatar">🌍</div>
            <div className="profile-info">
              <h3>{userData.full_name || 'Traveler'}</h3>
              <p>Travel Enthusiast</p>
              <div className="profile-stats">
                <div className="stat">
                  <span className="stat-number">3</span>
                  <span className="stat-label">Trips</span>
                </div>
                <div className="stat">
                  <span className="stat-number">2</span>
                  <span className="stat-label">Countries</span>
                </div>
                <div className="stat">
                  <span className="stat-number">5</span>
                  <span className="stat-label">Days</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
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
            <button className="action-card tertiary">
              <div className="action-icon">👥</div>
              <h3>Join Group Trip</h3>
              <p>Travel with others</p>
            </button>
          </div>
        </section>

        {/* Upcoming Trips */}
        <section className="upcoming-trips">
          <div className="section-header">
            <h2>Upcoming Trips</h2>
            <button className="view-all-btn">View All</button>
          </div>
          <div className="trips-list">
            {upcomingTrips.map(trip => (
              <div key={trip.id} className="trip-card">
                <div className="trip-destination">📍 {trip.destination}</div>
                <div className="trip-name">{trip.name}</div>
                <div className="trip-dates">{trip.startDate} - {trip.endDate}</div>
                <div className={`trip-status ${trip.status.toLowerCase()}`}>{trip.status}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
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

        {/* Travel Statistics */}
        <section className="travel-stats">
          <div className="section-header">
            <h2>Travel Stats</h2>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">✈️</div>
              <div className="stat-value">3</div>
              <div className="stat-label">Trips Planned</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-value">$2,450</div>
              <div className="stat-label">Budget Used</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-value">4.8</div>
              <div className="stat-label">Avg Rating</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;