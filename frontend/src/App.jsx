import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import Login from './pages/Login';
import Signup from './pages/Signup';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (token) => {
    localStorage.setItem('token', token);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={isLoggedIn ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
        <Route path="/signup" element={isLoggedIn ? <Navigate to="/" /> : <Signup onSignup={handleLogin} />} />
        <Route path="/" element={isLoggedIn ? <ChatPage onLogout={handleLogout} /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

export default App; 