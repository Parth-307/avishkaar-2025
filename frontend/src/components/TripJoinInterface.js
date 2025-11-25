import React, { useState } from 'react';
import './TripJoinInterface.css';

const TripJoinInterface = ({ onNavigate, onJoinSuccess }) => {
  const [joinStep, setJoinStep] = useState(1); // 1: Join Code, 2: Login, 3: Success
  const [joinCode, setJoinCode] = useState('');
  const [userCredentials, setUserCredentials] = useState({
    identifier: '', // username or email
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [joinResult, setJoinResult] = useState(null);

  // Validate join code format
  const isValidJoinCode = (code) => {
    return /^[A-Z0-9]{6,10}$/.test(code.toUpperCase());
  };

  // Handle join code submission
  const handleJoinCodeSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmedCode = joinCode.trim().toUpperCase();
    
    if (!trimmedCode) {
      setError('Please enter a join code');
      return;
    }

    if (!isValidJoinCode(trimmedCode)) {
      setError('Invalid join code format. Use 6-10 alphanumeric characters.');
      return;
    }

    setJoinStep(2);
  };

  // Handle login and trip joining
  const handleJoinTrip = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/trips/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          join_code: joinCode.trim().toUpperCase(),
          identifier: userCredentials.identifier.trim(),
          password: userCredentials.password
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setJoinResult(result);
        setJoinStep(3);
        
        // Store user session info
        localStorage.setItem('user_session', JSON.stringify({
          user_id: result.user_id, // Would need to be returned from backend
          trip_id: result.trip_id,
          role: result.user_role,
          joined_at: new Date().toISOString()
        }));
        
        // Call success callback if provided
        if (onJoinSuccess) {
          onJoinSuccess(result);
        }
      } else {
        setError(result.detail || 'Failed to join trip. Please check your credentials and try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset the form
  const resetForm = () => {
    setJoinStep(1);
    setJoinCode('');
    setUserCredentials({ identifier: '', password: '' });
    setError('');
    setJoinResult(null);
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    if (field === 'joinCode') {
      setJoinCode(value.toUpperCase());
    } else {
      setUserCredentials(prev => ({
        ...prev,
        [field]: value
      }));
    }
    setError(''); // Clear errors when user types
  };

  // Render join code input step
  const renderJoinCodeStep = () => (
    <div className="join-step join-code-step">
      <div className="step-header">
        <div className="step-icon">🔗</div>
        <h2>Join a Trip</h2>
        <p>Enter the join code provided by the trip organizer</p>
      </div>

      <form onSubmit={handleJoinCodeSubmit} className="join-form">
        <div className="form-group">
          <label htmlFor="joinCode">Trip Join Code</label>
          <div className="join-code-input">
            <input
              type="text"
              id="joinCode"
              value={joinCode}
              onChange={(e) => handleInputChange('joinCode', e.target.value)}
              placeholder="e.g., TRIP123"
              maxLength="10"
              autoFocus
              className="join-code-field"
            />
            <div className="code-preview">
              {joinCode && (
                <div className={`code-status ${isValidJoinCode(joinCode) ? 'valid' : 'invalid'}`}>
                  {isValidJoinCode(joinCode) ? '✅ Valid' : '❌ Invalid'}
                </div>
              )}
            </div>
          </div>
          <small className="input-help">
            Ask the trip organizer for the join code. It should be 6-10 alphanumeric characters.
          </small>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <div className="form-actions">
          <button 
            type="submit" 
            className="btn-primary"
            disabled={!joinCode.trim() || !isValidJoinCode(joinCode)}
          >
            Continue
          </button>
          
          <button 
            type="button" 
            className="btn-secondary"
            onClick={() => onNavigate('home')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  // Render login step
  const renderLoginStep = () => (
    <div className="join-step login-step">
      <div className="step-header">
        <div className="step-icon">🔐</div>
        <h2>Sign In to Join Trip</h2>
        <p>Enter your credentials to join the trip: <strong>{joinCode}</strong></p>
      </div>

      <form onSubmit={handleJoinTrip} className="join-form">
        <div className="form-group">
          <label htmlFor="identifier">Username or Email</label>
          <input
            type="text"
            id="identifier"
            value={userCredentials.identifier}
            onChange={(e) => handleInputChange('identifier', e.target.value)}
            placeholder="Enter your username or email"
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={userCredentials.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="Enter your password"
            required
          />
          <small className="input-help">
            Don't have an account? <button 
              type="button" 
              className="link-btn"
              onClick={() => onNavigate('signup', { joinCode })}
            >Sign up here</button>
          </small>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <div className="form-actions">
          <button 
            type="submit" 
            className="btn-primary"
            disabled={!userCredentials.identifier || !userCredentials.password || isLoading}
          >
            {isLoading ? '⏳ Joining...' : '🔗 Join Trip'}
          </button>
          
          <button 
            type="button" 
            className="btn-secondary"
            onClick={() => setJoinStep(1)}
            disabled={isLoading}
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );

  // Render success step
  const renderSuccessStep = () => (
    <div className="join-step success-step">
      <div className="success-content">
        <div className="success-icon">🎉</div>
        <h2>Successfully Joined!</h2>
        <p className="success-message">
          Welcome to the trip! You're now connected with the group.
        </p>

        <div className="join-summary">
          <div className="summary-item">
            <span className="summary-label">Role:</span>
            <span className={`summary-value role-${joinResult.user_role}`}>
              {joinResult.user_role === 'admin' ? 'Administrator' : 'Participant'}
            </span>
          </div>
          
          <div className="summary-item">
            <span className="summary-label">Trip ID:</span>
            <span className="summary-value">{joinResult.trip_id}</span>
          </div>
        </div>

        <div className="success-actions">
          <button 
            className="btn-primary"
            onClick={() => onNavigate('dashboard')}
          >
            Go to Dashboard
          </button>
          
          <button 
            className="btn-secondary"
            onClick={() => onNavigate('activities')}
          >
            View Activities
          </button>
        </div>

        <div className="success-footer">
          <p className="help-text">
            Need help getting started? Check out the{' '}
            <button 
              className="link-btn"
              onClick={() => onNavigate('help')}
            >
              participant guide
            </button>
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="trip-join-interface">
      {/* Progress indicator */}
      <div className="join-progress">
        <div className={`progress-step ${joinStep >= 1 ? 'active' : ''} ${joinStep > 1 ? 'completed' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">Join Code</div>
        </div>
        
        <div className="progress-connector"></div>
        
        <div className={`progress-step ${joinStep >= 2 ? 'active' : ''} ${joinStep > 2 ? 'completed' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">Sign In</div>
        </div>
        
        <div className="progress-connector"></div>
        
        <div className={`progress-step ${joinStep >= 3 ? 'active' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-label">Complete</div>
        </div>
      </div>

      {/* Main content */}
      <div className="join-content">
        {joinStep === 1 && renderJoinCodeStep()}
        {joinStep === 2 && renderLoginStep()}
        {joinStep === 3 && renderSuccessStep()}
      </div>

      {/* Help section */}
      {joinStep < 3 && (
        <div className="join-help">
          <h3>Need Help?</h3>
          <div className="help-items">
            <div className="help-item">
              <span className="help-icon">❓</span>
              <div>
                <div className="help-title">Don't have a join code?</div>
                <div className="help-text">Ask the trip organizer to share their join code with you.</div>
              </div>
            </div>
            
            <div className="help-item">
              <span className="help-icon">🔑</span>
              <div>
                <div className="help-title">New to the platform?</div>
                <div className="help-text">
                  <button 
                    className="link-btn"
                    onClick={() => onNavigate('signup')}
                  >
                    Create an account
                  </button>
                </div>
              </div>
            </div>
            
            <div className="help-item">
              <span className="help-icon">🆘</span>
              <div>
                <div className="help-title">Having trouble?</div>
                <div className="help-text">
                  <button 
                    className="link-btn"
                    onClick={() => onNavigate('support')}
                  >
                    Contact support
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripJoinInterface;