import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './Home.css';

function Home() {
  const [stats, setStats] = useState({
    totalItems: 4,
    outfitsCreated: 0,
    categories: 4
  });

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
          <h3>Make Outfit Inspo</h3>
          <p>Create and save outfit combinations</p>
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
