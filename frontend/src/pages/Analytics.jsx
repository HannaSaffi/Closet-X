import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Analytics.css';

const Analytics = () => {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const WARDROBE_SERVICE_URL = import.meta.env.VITE_WARDROBE_SERVICE_URL || 'http://localhost:3003';

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${WARDROBE_SERVICE_URL}/api/wardrobe/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(response.data.data);
      setError('');
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="analytics-container"><div className="loading">Loading analytics...</div></div>;
  }

  if (error) {
    return <div className="analytics-container"><div className="error">{error}</div></div>;
  }

  if (!analytics) {
    return <div className="analytics-container"><div className="no-data">No data available</div></div>;
  }

  return (
    <div className="analytics-container">
      <h1>📊 Wardrobe Analytics</h1>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <h3>Total Items</h3>
          <p className="big-number">{analytics.summary.totalItems}</p>
        </div>
        <div className="summary-card">
          <h3>Total Value</h3>
          <p className="big-number">${analytics.summary.totalValue.toFixed(0)}</p>
        </div>
        <div className="summary-card">
          <h3>Avg Wear Count</h3>
          <p className="big-number">{analytics.summary.averageWearCount}</p>
        </div>
        <div className="summary-card">
          <h3>Never Worn</h3>
          <p className="big-number warning">{analytics.summary.neverWornCount}</p>
        </div>
      </div>

      {/* Insights */}
      {analytics.insights && analytics.insights.length > 0 && (
        <div className="insights-section">
          <h2>💡 Insights</h2>
          <div className="insights-grid">
            {analytics.insights.map((insight, index) => (
              <div key={index} className={`insight-card ${insight.type}`}>
                <div className="insight-message">{insight.message}</div>
                <div className="insight-suggestion">{insight.suggestion}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-card">
          <h2>By Category</h2>
          <div className="chart-content">
            {analytics.byCategory.map((cat) => (
              <div key={cat.category} className="chart-row">
                <span className="chart-label">{cat.category}</span>
                <div className="chart-bar-container">
                  <div className="chart-bar" style={{ width: `${cat.percentage}%` }}>
                    <span className="chart-value">{cat.count}</span>
                  </div>
                </div>
                <span className="chart-percent">{cat.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h2>By Color</h2>
          <div className="chart-content">
            {analytics.byColor.slice(0, 8).map((color) => (
              <div key={color.color} className="chart-row">
                <span className="chart-label">
                  <span className="color-dot" style={{ backgroundColor: color.color }}></span>
                  {color.color}
                </span>
                <div className="chart-bar-container">
                  <div className="chart-bar" style={{ width: `${color.percentage}%` }}>
                    <span className="chart-value">{color.count}</span>
                  </div>
                </div>
                <span className="chart-percent">{color.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Most/Least Worn Items */}
      <div className="items-section">
        <div className="items-card">
          <h2>⭐ Most Worn Items</h2>
          <div className="items-grid">
            {analytics.mostWornItems.slice(0, 6).map((item) => (
              <div key={item.id} className="item-tile">
                {item.imageURL && (
                  <img src={item.imageURL} alt={item.name} className="item-image" />
                )}
                <div className="item-info">
                  <p className="item-name">{item.name}</p>
                  <p className="item-stat">Worn {item.wearCount}x</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="items-card">
          <h2>⚠️ Never Worn Items</h2>
          {analytics.neverWornItems.length > 0 ? (
            <div className="items-grid">
              {analytics.neverWornItems.slice(0, 6).map((item) => (
                <div key={item.id} className="item-tile">
                  {item.imageURL && (
                    <img src={item.imageURL} alt={item.name} className="item-image" />
                  )}
                  <div className="item-info">
                    <p className="item-name">{item.name}</p>
                    <p className="item-stat">{item.daysSinceAdded} days ago</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="success-message">Great! All items have been worn at least once.</p>
          )}
        </div>
      </div>

      {/* Cost Per Wear */}
      {analytics.costPerWear && analytics.costPerWear.length > 0 && (
        <div className="items-card">
          <h2>💰 Best Value Items (Cost Per Wear)</h2>
          <div className="cost-table">
            {analytics.costPerWear.slice(0, 5).map((item) => (
              <div key={item.id} className="cost-row">
                {item.imageURL && (
                  <img src={item.imageURL} alt={item.name} className="cost-image" />
                )}
                <div className="cost-details">
                  <p className="cost-name">{item.name}</p>
                  <p className="cost-info">
                    ${item.price} ÷ {item.wearCount} wears = <strong>${item.costPerWear}/wear</strong>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
