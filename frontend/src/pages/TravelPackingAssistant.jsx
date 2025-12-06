import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './TravelPackingAssistant.css';

const TravelPackingAssistant = () => {
  const { token } = useAuth();
  const OUTFIT_SERVICE_URL = import.meta.env.VITE_OUTFIT_SERVICE_URL || 'http://localhost:3002';

  const [formData, setFormData] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    activities: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [packingPlan, setPackingPlan] = useState(null);

  const availableActivities = [
    'sightseeing', 'dining', 'business', 'beach', 'hiking',
    'shopping', 'nightlife', 'cultural', 'sports', 'relaxation'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleActivityToggle = (activity) => {
    setFormData(prev => ({
      ...prev,
      activities: prev.activities.includes(activity)
        ? prev.activities.filter(a => a !== activity)
        : [...prev.activities, activity]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPackingPlan(null);

    try {
      const response = await axios.post(
        `${OUTFIT_SERVICE_URL}/api/daily-outfit/travel-plan`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setPackingPlan(response.data.data);
    } catch (err) {
      console.error('Error creating packing plan:', err);
      setError(err.response?.data?.message || 'Failed to create packing plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="travel-packing-assistant">
      <h1>✈️ Travel Packing Assistant</h1>
      <p className="subtitle">Smart packing recommendations for your trip</p>

      <div className="assistant-container">
        <form onSubmit={handleSubmit} className="packing-form">
          <div className="form-group">
            <label htmlFor="destination">Destination *</label>
            <input
              type="text"
              id="destination"
              name="destination"
              value={formData.destination}
              onChange={handleInputChange}
              placeholder="e.g., Paris, France"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">Start Date *</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label htmlFor="endDate">End Date *</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                required
                min={formData.startDate || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Activities (select all that apply)</label>
            <div className="activities-grid">
              {availableActivities.map(activity => (
                <div
                  key={activity}
                  className={`activity-chip ${formData.activities.includes(activity) ? 'selected' : ''}`}
                  onClick={() => handleActivityToggle(activity)}
                >
                  {activity.charAt(0).toUpperCase() + activity.slice(1)}
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating Plan...' : 'Create Packing Plan'}
          </button>
        </form>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {packingPlan && (
          <div className="packing-plan-section">
            <div className="trip-summary">
              <h2>Trip Summary</h2>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-label">Destination:</span>
                  <span className="summary-value">{packingPlan.trip.destination}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Duration:</span>
                  <span className="summary-value">{packingPlan.trip.duration} days</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Dates:</span>
                  <span className="summary-value">{packingPlan.trip.startDate} - {packingPlan.trip.endDate}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Activities:</span>
                  <span className="summary-value">{packingPlan.trip.activities.join(', ')}</span>
                </div>
              </div>

              {packingPlan.weather && (
                <div className="weather-summary">
                  <h3>Weather Forecast</h3>
                  <p>{packingPlan.weather.summary}</p>
                </div>
              )}
            </div>

            <div className="packing-lists">
              <h2>Packing List</h2>
              
              <div className="packing-category">
                <h3>🎯 Must Pack</h3>
                <div className="items-list">
                  {packingPlan.packingList.mustPack.map((item, idx) => (
                    <div key={idx} className="packing-item must-pack">
                      {item.imageURL && (
                        <img src={item.imageURL} alt={item.name} />
                      )}
                      <div className="item-info">
                        <strong>{item.name || `${item.color} ${item.category}`}</strong>
                        <p>{item.category} - {item.subcategory}</p>
                        {item.reason && <small>{item.reason}</small>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="packing-category">
                <h3>✅ Recommended</h3>
                <div className="items-list">
                  {packingPlan.packingList.recommended.map((item, idx) => (
                    <div key={idx} className="packing-item recommended">
                      {item.imageURL && (
                        <img src={item.imageURL} alt={item.name} />
                      )}
                      <div className="item-info">
                        <strong>{item.name || `${item.color} ${item.category}`}</strong>
                        <p>{item.category} - {item.subcategory}</p>
                        {item.reason && <small>{item.reason}</small>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="packing-category">
                <h3>💡 Optional</h3>
                <div className="items-list">
                  {packingPlan.packingList.optional.map((item, idx) => (
                    <div key={idx} className="packing-item optional">
                      {item.imageURL && (
                        <img src={item.imageURL} alt={item.name} />
                      )}
                      <div className="item-info">
                        <strong>{item.name || `${item.color} ${item.category}`}</strong>
                        <p>{item.category} - {item.subcategory}</p>
                        {item.reason && <small>{item.reason}</small>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {packingPlan.dailyOutfits && packingPlan.dailyOutfits.length > 0 && (
              <div className="daily-outfits">
                <h2>Day-by-Day Outfit Suggestions</h2>
                <div className="days-grid">
                  {packingPlan.dailyOutfits.map((day, idx) => (
                    <div key={idx} className="day-card">
                      <h3>Day {day.day} - {day.date}</h3>
                      {day.weather && (
                        <div className="day-weather">
                          <p>🌡️ {day.weather.temperature} - {day.weather.condition}</p>
                        </div>
                      )}
                      <div className="day-outfit">
                        {day.outfit.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="day-item">
                            <span className="item-category">{item.category}:</span>
                            <span className="item-desc">{item.color} {item.subcategory}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {packingPlan.tips && packingPlan.tips.length > 0 && (
              <div className="packing-tips">
                <h3>📦 Packing Tips</h3>
                <ul>
                  {packingPlan.tips.map((tip, idx) => (
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

export default TravelPackingAssistant;
