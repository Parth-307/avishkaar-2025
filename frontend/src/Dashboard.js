import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();

  const handleCreateTrip = () => {
    navigate('/create-trip');
  };

  const handleJoinTrip = () => {
    alert("Redirecting to Join Trip page...");
    // TODO: Implement join trip functionality
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <h1 className="dashboard-title">Plan Your Next Journey</h1>

        <div className="btn-group">
          <button onClick={handleCreateTrip} className="create-trip-btn">
            <span className="icon">➕</span> 
            Create a Trip
          </button>
          <button onClick={handleJoinTrip} className="join-trip-btn">
            Join an Existing Trip
          </button>
        </div>

        <p className="footer-text">Your Adventure Starts Here 🌍</p>

        {/* Back to Home Button */}
        <button onClick={handleGoHome} className="back-home-btn">
          ← Back to Home
        </button>
      </div>
    </div>
  );
};

export default Dashboard;