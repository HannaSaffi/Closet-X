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

  // Generate style insights from analytics data
  const generateStyleInsights = () => {
    const insights = [];

    // Dominant colors insight
    if (analytics.byColor && analytics.byColor.length > 0) {
      const topColors = analytics.byColor.slice(0, 3).map(c => c.color);
      insights.push({
        title: 'Color Palette',
        text: `Your wardrobe leans heavily towards ${topColors.join(', ')}. This creates a cohesive look and makes mixing and matching easier.`,
        icon: '🎨'
      });
    }

    // Category balance insight
    if (analytics.byCategory && analytics.byCategory.length > 0) {
      const sortedCategories = [...analytics.byCategory].sort((a, b) => b.count - a.count);
      const mostCommon = sortedCategories[0];
      const leastCommon = sortedCategories[sortedCategories.length - 1];
      
      insights.push({
        title: 'Wardrobe Balance',
        text: `You have ${mostCommon.count} ${mostCommon.category} but only ${leastCommon.count} ${leastCommon.category}. Consider balancing your collection for more outfit versatility.`,
        icon: '⚖️'
      });
    }

    // Wear pattern insight
    if (analytics.summary) {
      const wearRate = (analytics.summary.totalItems - analytics.summary.neverWornCount) / analytics.summary.totalItems * 100;
      insights.push({
        title: 'Utilization Rate',
        text: `You actively wear ${wearRate.toFixed(0)}% of your wardrobe. ${wearRate > 80 ? 'Excellent! You make great use of what you own.' : 'Try incorporating more pieces into your regular rotation.'}`,
        icon: '📈'
      });
    }

    // Sustainability insight
    if (analytics.costPerWear && analytics.costPerWear.length > 0) {
      const avgCostPerWear = analytics.costPerWear.reduce((sum, item) => sum + parseFloat(item.costPerWear), 0) / analytics.costPerWear.length;
      insights.push({
        title: 'Sustainability Score',
        text: `Your average cost-per-wear is $${avgCostPerWear.toFixed(2)}. The more you wear each piece, the better value and less environmental impact per use!`,
        icon: '🌱'
      });
    }

    return insights;
  };

  const styleInsights = generateStyleInsights();

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

      {/* NEW: Style Insights Section */}
      <div className="style-insights-section">
        <div className="section-header">
          <h2>✨ Style Insights & Analysis</h2>
          <span className="beta-badge">BETA</span>
        </div>
        <p className="section-description">
          Deep dive into your wardrobe patterns and personal style preferences
        </p>

        <div className="insights-cards-grid">
          {styleInsights.map((insight, index) => (
            <div key={index} className="insight-detailed-card">
              <div className="insight-icon">{insight.icon}</div>
              <h3>{insight.title}</h3>
              <p>{insight.text}</p>
            </div>
          ))}
        </div>

        {/* Color Distribution Visualization */}
        {analytics.byColor && analytics.byColor.length > 0 && (
          <div className="color-analysis">
            <h3>Color Distribution</h3>
            <div className="color-bars">
              {analytics.byColor.map((color) => (
                <div key={color.color} className="color-bar-item">
                  <div className="color-bar-header">
                    <span className="color-dot-large" style={{ backgroundColor: color.color }}></span>
                    <span className="color-name">{color.color}</span>
                    <span className="color-count">{color.count} items ({color.percentage}%)</span>
                  </div>
                  <div className="color-bar-visual">
                    <div 
                      className="color-bar-fill" 
                      style={{ 
                        width: `${color.percentage}%`,
                        backgroundColor: color.color
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Season Distribution */}
        {analytics.bySeason && analytics.bySeason.length > 0 && (
          <div className="season-analysis">
            <h3>Seasonal Readiness</h3>
            <div className="season-grid">
              {analytics.bySeason.map((season) => (
                <div key={season.season} className="season-card">
                  <div className="season-icon">
                    {season.season === 'summer' && '☀️'}
                    {season.season === 'winter' && '❄️'}
                    {season.season === 'spring' && '🌸'}
                    {season.season === 'fall' && '🍂'}
                    {season.season === 'all-season' && '🔄'}
                  </div>
                  <h4>{season.season.charAt(0).toUpperCase() + season.season.slice(1)}</h4>
                  <p className="season-count">{season.count} items</p>
                  <p className="season-percentage">{season.percentage}%</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
