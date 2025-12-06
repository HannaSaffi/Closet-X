import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './EventOutfitPlanner.css';

const EventOutfitPlanner = () => {
  const { token } = useAuth();
  const OUTFIT_SERVICE_URL = import.meta.env.VITE_OUTFIT_SERVICE_URL || 'http://localhost:3002';

  const [formData, setFormData] = useState({
    date: '',
    city: '',
    occasion: 'casual',
    dresscode: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommendations, setRecommendations] = useState(null);

  const occasions = [
    'casual', 'formal', 'wedding', 'interview', 'date', 'party', 
    'business', 'outdoor', 'athletic', 'beach'
  ];

  const dresscodes = ['', 'formal', 'business casual', 'casual', 'smart casual'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRecommendations(null);

    try {
      const response = await axios.post(
        `${OUTFIT_SERVICE_URL}/api/daily-outfit/event`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setRecommendations(response.data.data);
    } catch (err) {
      console.error('Error planning event outfit:', err);
      setError(err.response?.data?.message || 'Failed to plan event outfit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="event-outfit-planner">
      <h1>🎉 Event Outfit Planner</h1>
      <p className="subtitle">Plan the perfect outfit for your special occasion</p>

      <div className="planner-container">
        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-group">
            <label htmlFor="date">Event Date *</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="form-group">
            <label htmlFor="city">City *</label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="e.g., New York"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="occasion">Occasion *</label>
            <select
              id="occasion"
              name="occasion"
              value={formData.occasion}
              onChange={handleInputChange}
              required
            >
              {occasions.map(occ => (
                <option key={occ} value={occ}>
                  {occ.charAt(0).toUpperCase() + occ.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="dresscode">Dress Code (optional)</label>
            <select
              id="dresscode"
              name="dresscode"
              value={formData.dresscode}
              onChange={handleInputChange}
            >
              <option value="">Auto-detect from occasion</option>
              {dresscodes.slice(1).map(code => (
                <option key={code} value={code}>
                  {code.charAt(0).toUpperCase() + code.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Planning...' : 'Find Perfect Outfit'}
          </button>
        </form>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {recommendations && (
          <div className="recommendations-section">
            <div className="event-details">
              <h2>Event Details</h2>
              <div className="detail-grid">
                <div className="detail-item">
                  <strong>Date:</strong> {recommendations.event.date}
                </div>
                <div className="detail-item">
                  <strong>Days Until:</strong> {recommendations.event.daysUntil} days
                </div>
                <div className="detail-item">
                  <strong>Occasion:</strong> {recommendations.event.occasion}
                </div>
                <div className="detail-item">
                  <strong>Dress Code:</strong> {recommendations.event.dresscode}
                </div>
              </div>

              {recommendations.weather && (
                <div className="weather-info">
                  <h3>Weather Forecast</h3>
                  <p>
                    <strong>Temperature:</strong> {recommendations.weather.temperature.current} 
                    (feels like {recommendations.weather.temperature.feelsLike})
                  </p>
                  <p>
                    <strong>Conditions:</strong> {recommendations.weather.condition.description}
                  </p>
                  {recommendations.weather.note && (
                    <p className="weather-note"><em>{recommendations.weather.note}</em></p>
                  )}
                </div>
              )}
            </div>

            <h2>Outfit Recommendations</h2>
            <div className="outfits-grid">
              {recommendations.recommendations.map((outfit, index) => (
                <div key={index} className="outfit-card">
                  <div className="outfit-header">
                    <h3>Option {outfit.rank}</h3>
                    <div className="overall-score">{outfit.score}/100</div>
                  </div>

                  <div className="outfit-items">
                    {outfit.items.map((item, idx) => (
                      <div key={idx} className="outfit-item">
                        {item.imageURL && (
                          <img src={item.imageURL} alt={`${item.color} ${item.category}`} />
                        )}
                        <div className="item-details">
                          <strong>{item.category}</strong>
                          <p>{item.color} {item.subcategory}</p>
                          {item.brand && <small>{item.brand}</small>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="outfit-scores">
                    <div className="score-item">
                      <span className="score-label">Color Harmony:</span>
                      <span className="score-value">{outfit.score.colorHarmony}%</span>
                    </div>
                    <div className="score-item">
                      <span className="score-label">Style Coherence:</span>
                      <span className="score-value">{outfit.score.styleCoherence}%</span>
                    </div>
                    <div className="score-item">
                      <span className="score-label">Occasion Fit:</span>
                      <span className="score-value">{outfit.score.occasionFit}%</span>
                    </div>
                  </div>

                  <div className="outfit-reasoning">
                    <strong>Why this works:</strong>
                    <ul>
                      {outfit.reasoning.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            {recommendations.tips && recommendations.tips.length > 0 && (
              <div className="tips-section">
                <h3>💡 Tips for Your Event</h3>
                <ul>
                  {recommendations.tips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventOutfitPlanner;
