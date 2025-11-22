import { useState } from 'react';
import { getDailyOutfit } from '../services/api';
import './OutfitInspo.css';

function OutfitInspo() {
  const [outfit, setOutfit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);
  const [city, setCity] = useState('New York');

  const generateOutfit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getDailyOutfit(city);
      
      // Set weather data
      if (data.weather) {
        setWeather({
          temp: data.weather.temperature,
          condition: data.weather.description,
          icon: getWeatherIcon(data.weather.description)
        });
      }
      
      // Set outfit items
      if (data.outfit) {
        setOutfit(data.outfit);
      }
      
    } catch (err) {
      console.error('Error generating outfit:', err);
      setError('Failed to generate outfit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (condition) => {
    const lower = condition.toLowerCase();
    if (lower.includes('sun') || lower.includes('clear')) return '☀️';
    if (lower.includes('rain')) return '🌧️';
    if (lower.includes('cloud')) return '☁️';
    if (lower.includes('snow')) return '❄️';
    return '🌤️';
  };

  return (
    <div className="outfit-inspo">
      <div className="inspo-header">
        <h1>✨ Outfit Inspiration</h1>
        <p>Let AI pick the perfect outfit based on weather and your closet!</p>
      </div>

      <div className="generate-section">
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter your city"
          className="city-input"
        />
        <button 
          className="btn-generate" 
          onClick={generateOutfit}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Generating...
            </>
          ) : (
            <>
              🎲 Give Me Outfit Inspo
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {weather && (
        <div className="weather-card">
          <span className="weather-icon">{weather.icon}</span>
          <div className="weather-info">
            <h3>{weather.condition}</h3>
            <p>{weather.temp}°F</p>
          </div>
        </div>
      )}

      {outfit && (
        <div className="outfit-display">
          <h2>Your Perfect Outfit Today:</h2>
          <div className="outfit-items">
            {outfit.map((item) => (
              <div key={item._id || item.id} className="outfit-item">
                <div className="outfit-item-image">
                  <img 
                    src={item.imageUrl || item.image || 'https://via.placeholder.com/300'} 
                    alt={item.name} 
                  />
                </div>
                <div className="outfit-item-info">
                  <p className="item-category">{item.category}</p>
                  <p className="item-name">{item.name}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-regenerate" onClick={generateOutfit}>
            🔄 Try Another Outfit
          </button>
        </div>
      )}

      {!outfit && !loading && !error && (
        <div className="empty-inspo">
          <p>Click the button above to get your personalized outfit!</p>
        </div>
      )}
    </div>
  );
}

export default OutfitInspo;
