import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Homepage from './Homepage';
import AuthPage from './AuthPage';
import Dashboard from './Dashboard';
import CreateTrip from './CreateTrip';
import './App.css';

const AuthCheck = ({ children }) => {
  const location = useLocation();
  
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    const currentPath = location.pathname;
    
    if (currentPath === '/login' && userData) {
      window.location.href = '/dashboard';
      return;
    }
    
    const protectedRoutes = ['/dashboard', '/create-trip'];
    if (protectedRoutes.includes(currentPath) && !userData) {
      window.location.href = '/';
      return;
    }
  }, [location.pathname]);

  return children;
};

function App() {
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