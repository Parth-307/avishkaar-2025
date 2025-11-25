import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthPage.css';

const API_BASE_URL = 'http://127.0.0.1:8000';

const AuthPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('signin');
  const [formData, setFormData] = useState({
    signinIdentifier: '',
    signinPassword: '',
    firstName: '',
    lastName: '',
    signupUsername: '',
    signupEmail: '',
    signupPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState({ error: '', success: '' });

  useEffect(() => {
    const userData = localStorage.getItem('userData');
    
    if (userData) {
      navigate('/dashboard');
      return;
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (messages.error || messages.success) {
      setMessages({ error: '', success: '' });
    }
  };

  const showMessage = (type, message) => {
    setMessages({
      error: type === 'error' ? message : '',
      success: type === 'success' ? message : ''
    });
    
    setTimeout(() => {
      setMessages({ error: '', success: '' });
    }, 5000);
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    return usernameRegex.test(username);
  };

  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/\d/)) strength++;
    if (password.match(/[^a-zA-Z\d]/)) strength++;
    
    if (strength <= 1) return { level: 'weak', text: 'Weak password', color: 'var(--color-error)' };
    if (strength <= 3) return { level: 'medium', text: 'Medium password', color: '#ff9800' };
    return { level: 'strong', text: 'Strong password', color: 'var(--color-success)' };
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    
    const { signinIdentifier, signinPassword } = formData;
    
    if (!signinIdentifier || !signinPassword) {
      showMessage('error', 'Please fill in all fields.');
      return;
    }
    
    const isEmail = isValidEmail(signinIdentifier);
    
    if (!isEmail && !isValidUsername(signinIdentifier)) {
      showMessage('error', 'Please enter a valid email address or username.');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: signinIdentifier,
          password: signinPassword
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showMessage('success', `🎉 Successfully logged in! Welcome back, ${data.full_name}!`);
        
        localStorage.setItem('userData', JSON.stringify({
          user_id: data.user_id,
          full_name: data.full_name,
          username: data.username,
          email: data.email || signinIdentifier
        }));
        
        setFormData(prev => ({ ...prev, signinPassword: '' }));
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
        
      } else {
        showMessage('error', data.detail || 'Login failed. Please try again.');
      }
      
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        showMessage('error', 'Unable to connect to server. Please ensure the backend is running on port 8000.');
      } else {
        showMessage('error', 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    
    const { firstName, lastName, signupUsername, signupEmail, signupPassword, confirmPassword } = formData;
    
    if (!firstName || !lastName || !signupUsername || !signupEmail || !signupPassword || !confirmPassword) {
      showMessage('error', 'Please fill in all fields.');
      return;
    }
    
    if (!isValidUsername(signupUsername)) {
      showMessage('error', 'Username must be 3-30 characters long and contain only letters, numbers, and underscores.');
      return;
    }
    
    if (!isValidEmail(signupEmail)) {
      showMessage('error', 'Please enter a valid email address.');
      return;
    }
    
    if (signupPassword.length < 8) {
      showMessage('error', 'Password must be at least 8 characters long.');
      return;
    }
    
    if (signupPassword !== confirmPassword) {
      showMessage('error', 'Passwords do not match.');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: `${firstName} ${lastName}`,
          username: signupUsername,
          email: signupEmail,
          password: signupPassword,
          confirm_password: confirmPassword
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showMessage('success', 'Account created successfully! You can now sign in.');
        
        setFormData(prev => ({
          ...prev,
          firstName: '',
          lastName: '',
          signupUsername: '',
          signupEmail: '',
          signupPassword: '',
          confirmPassword: ''
        }));
        
        setTimeout(() => {
          setActiveTab('signin');
        }, 2000);
        
      } else {
        showMessage('error', data.detail || 'Sign up failed. Please try again.');
      }
      
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        showMessage('error', 'Unable to connect to server. Please ensure the backend is running on port 8000.');
      } else {
        showMessage('error', 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const passwordStrength = getPasswordStrength(formData.signupPassword);

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <button className="close-button" onClick={handleBackToHome} aria-label="Close and go back to home">
            ×
          </button>
          
          <div className="logo-section">
            <div className="logo">🌍</div>
            <h1>Admin Portal</h1>
            <p className="subtitle">Itinerary Planner</p>
          </div>

          <div className="tab-container">
            <button
              className={`tab-btn ${activeTab === 'signin' ? 'active' : ''}`}
              onClick={() => setActiveTab('signin')}
            >
              Sign In
            </button>
            <button
              className={`tab-btn ${activeTab === 'signup' ? 'active' : ''}`}
              onClick={() => setActiveTab('signup')}
            >
              Sign Up
            </button>
          </div>

          {messages.error && (
            <div className="message error show">
              <span className="message-icon">⚠️</span>
              <span>{messages.error}</span>
            </div>
          )}
          
          {messages.success && (
            <div className="message success show">
              <span className="message-icon">✅</span>
              <span>{messages.success}</span>
            </div>
          )}

          {activeTab === 'signin' && (
            <form className="form-container active" onSubmit={handleSignIn}>
              <div className="form-group">
                <label htmlFor="signinIdentifier">📧 Email or Username</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    name="signinIdentifier"
                    id="signinIdentifier"
                    placeholder="Enter your email or username"
                    value={formData.signinIdentifier}
                    onChange={handleInputChange}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="signinPassword">🔒 Password</label>
                <div className="input-wrapper">
                  <input
                    type="password"
                    name="signinPassword"
                    id="signinPassword"
                    placeholder="Enter your password"
                    value={formData.signinPassword}
                    onChange={handleInputChange}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button type="submit" className={`auth-btn ${loading ? 'loading' : ''}`} disabled={loading}>
                <span className="btn-text">Sign In</span>
                <div className="btn-loader"></div>
              </button>
            </form>
          )}

          {activeTab === 'signup' && (
            <form className="form-container active" onSubmit={handleSignUp}>
              <div className="name-group">
                <div className="form-group">
                  <label htmlFor="firstName">👤 First Name</label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      name="firstName"
                      id="firstName"
                      placeholder="Enter your first name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      autoComplete="given-name"
                    />
                  </div>
                </div>
  
                <div className="form-group">
                  <label htmlFor="lastName">👤 Last Name</label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      name="lastName"
                      id="lastName"
                      placeholder="Enter your last name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      autoComplete="family-name"
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="signupUsername">@ Username</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    name="signupUsername"
                    id="signupUsername"
                    placeholder="Choose a username"
                    value={formData.signupUsername}
                    onChange={handleInputChange}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="signupEmail">📧 Email Address</label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    name="signupEmail"
                    id="signupEmail"
                    placeholder="Enter your email address"
                    value={formData.signupEmail}
                    onChange={handleInputChange}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="signupPassword">🔒 Password</label>
                <div className="input-wrapper">
                  <input
                    type="password"
                    name="signupPassword"
                    id="signupPassword"
                    placeholder="Create a password"
                    value={formData.signupPassword}
                    onChange={handleInputChange}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="password-strength">
                  <div className="strength-meter">
                    <div className={`strength-bar ${passwordStrength.level}`}></div>
                  </div>
                  <span style={{ fontSize: '12px', color: passwordStrength.color, marginTop: '4px', display: 'block' }}>
                    {passwordStrength.text}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">🔒 Confirm Password</label>
                <div className="input-wrapper">
                  <input
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button type="submit" className={`auth-btn ${loading ? 'loading' : ''}`} disabled={loading}>
                <span className="btn-text">Create Account</span>
                <div className="btn-loader"></div>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;