import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './Home.css';
import axios from 'axios';

function Home() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
  
  const [stats, setStats] = useState({
    totalItems: 0,
    outfitsCreated: 0,
    categories: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/api/wardrobe/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Stats response:", JSON.stringify(response.data, null, 2));      

        setStats({
          totalItems: response.data.data.overall?.totalItems || 0,
          outfitsCreated: 0,
          categories: response.data.data.byCategory?.length || 0
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="home">
      <div className="home-header">
        <h1>My Digital Closet</h1>
        <p>Organize, manage, and style your wardrobe</p>
      </div>

      <div className="action-cards">
        <Link to="/closet" className="action-card">
          <div className="card-icon">👔</div>
          <h3>View My Closet</h3>
          <p>Browse and manage all your clothing items</p>
        </Link>

        <Link to="/add" className="action-card">
          <div className="card-icon">➕</div>
          <h3>Add Item</h3>
          <p>Add new pieces to your wardrobe collection</p>
        </Link>

        <Link to="/outfit-inspo" className="action-card">
          <div className="card-icon">✨</div>
          <h3>What should I wear?</h3>
          <p>Create and save outfit combinations</p>
        </Link>

        <Link to="/event-outfit" className="action-card">
          <div className="card-icon">🎉</div>
          <h3>Event Outfit Planner</h3>
          <p>Plan perfect outfits for special occasions</p>
        </Link>

        <Link to="/travel-packing" className="action-card">
          <div className="card-icon">✈️</div>
          <h3>Travel Packing Assistant</h3>
          <p>Smart packing for your next trip</p>
        </Link>

        <Link to="/outfit-calendar" className="action-card">
          <div className="card-icon">📅</div>
          <h3>Outfit Calendar</h3>
          <p>Plan and schedule your weekly outfits</p>
        </Link>

        <Link to="/analytics" className="action-card">
          <div className="card-icon">📊</div>
          <h3>Wardrobe Analytics</h3>
          <p>Insights about your wardrobe usage</p>
        </Link>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-number">{stats.totalItems}</div>
          <div className="stat-label">Total Items</div>
        </div>

        <div className="stat-card">
          <div className="stat-number">{stats.outfitsCreated}</div>
          <div className="stat-label">Outfits Created</div>
        </div>

        <div className="stat-card">
          <div className="stat-number">{stats.categories}</div>
          <div className="stat-label">Categories</div>
        </div>
      </div>
    </div>
  );
}

export default Home;
