import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Dashboard.css';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <h1>Closet-X</h1>
        </div>
        <div className="nav-user">
          <span className="user-name">{user?.name}</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Welcome, {user?.username}!</h2>
          <p>Your AI-powered wardrobe assistant</p>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>📸 Upload Clothing</h3>
            <p>Add new items to your wardrobe by uploading photos</p>
            <button className="card-btn">Start Uploading</button>
          </div>

          <div className="dashboard-card">
            <h3>👗 My Wardrobe</h3>
            <p>View and manage all your clothing items</p>
            <button className="card-btn">View Wardrobe</button>
          </div>

          <div className="dashboard-card">
            <h3>🎯 Outfit Generator</h3>
            <p>Get AI-powered outfit suggestions</p>
            <button className="card-btn">Generate Outfit</button>
          </div>

          <div className="dashboard-card">
            <h3>🌤️ Weather Recommendations</h3>
            <p>Get outfit ideas based on today's weather</p>
            <button className="card-btn">Check Weather</button>
          </div>

          <div className="dashboard-card">
            <h3>📊 Analytics</h3>
            <p>Track your most-worn and least-worn items</p>
            <button className="card-btn">View Analytics</button>
          </div>

          <div className="dashboard-card">
            <h3>👤 Profile</h3>
            <p>Update your preferences and account settings</p>
            <button className="card-btn">Edit Profile</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
