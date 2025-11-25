import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Homepage from './Homepage';
import AuthPage from './AuthPage';
import Dashboard from './Dashboard';
import CreateTrip from './CreateTrip';
import './App.css';

// Authentication check component
const AuthCheck = ({ children }) => {
  const location = useLocation();
  
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    const currentPath = location.pathname;
    
    // If user is on login page but already logged in, redirect to dashboard
    if (currentPath === '/login' && userData) {
      console.log('User already logged in, redirecting to dashboard');
      window.location.href = '/dashboard';
      return;
    }
    
    // If user is trying to access protected routes without login, redirect to homepage
    const protectedRoutes = ['/dashboard', '/create-trip'];
    if (protectedRoutes.includes(currentPath) && !userData) {
      console.log('User not logged in, redirecting to homepage');
      window.location.href = '/';
      return;
    }
  }, [location.pathname]);

  return children;
};

function App() {
  useEffect(() => {
    console.log('App component loaded - checking current path:', window.location.pathname);
  }, []);

  return (
    <Router>
      <div className="App">
        <AuthCheck>
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create-trip" element={<CreateTrip />} />
          </Routes>
        </AuthCheck>
      </div>
    </Router>
  );
}

export default App;