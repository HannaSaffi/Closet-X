import { useState } from 'react';
import { getDailyOutfit } from '../services/api';
import './OutfitInspo.css';

function OutfitInspo() {
  const [outfit, setOutfit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);
  const [aiAdvice, setAiAdvice] = useState(null);
  
  // User inputs
  const [userPreference, setUserPreference] = useState('');
  const [includeWeather, setIncludeWeather] = useState(false);
  const [city, setCity] = useState('New York');

  const generateOutfit = async () => {
    if (!userPreference.trim()) {
      setError('Please tell us what kind of outfit you want!');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Build the API request
      const params = {
        preference: userPreference,
        includeAI: true
      };
      
      if (includeWeather) {
        params.city = city;
      }
      
      const data = await getDailyOutfit(params);
      
      // Set weather data if included
      if (data.weather && includeWeather) {
        setWeather({
          temp: data.weather.temperature,
          condition: data.weather.description,
          icon: getWeatherIcon(data.weather.description)
        });
      } else {
        setWeather(null);
      }
      
      // Set outfit items
      if (data.outfit) {
        setOutfit(data.outfit);
      }
      
      // Set AI advice if available
      if (data.aiAdvice) {
        setAiAdvice(data.aiAdvice);
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generateOutfit();
    }
  };

  return (
    <div className="outfit-inspo">
      <div className="inspo-header">
        <h1>✨ Outfit Inspiration</h1>
        <p>Tell us what you need, and AI will pick the perfect outfit from your closet!</p>
      </div>

      <div className="generate-section">
        {/* Main text input for user preferences */}
        <div className="preference-input-container">
          <label htmlFor="preference">What kind of outfit do you want?</label>
          <textarea
            id="preference"
            value={userPreference}
            onChange={(e) => setUserPreference(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="E.g., 'I want something comfy for working from home' or 'Give me a professional look for a meeting' or 'Casual outfit for coffee with friends'"
            className="preference-input"
            rows="3"
          />
        </div>

        {/* Weather toggle */}
        <div className="weather-toggle-container">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={includeWeather}
              onChange={(e) => setIncludeWeather(e.target.checked)}
              className="toggle-checkbox"
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">Consider current weather</span>
          </label>
        </div>

        {/* City input - only show if weather is enabled */}
        {includeWeather && (
          <div className="city-input-container">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter your city"
              className="city-input"
            />
          </div>
        )}

        {/* Generate button */}
        <button 
          className="btn-generate" 
          onClick={generateOutfit}
          disabled={loading || !userPreference.trim()}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Generating your perfect outfit...
            </>
          ) : (
            <>
              🎨 Get My Outfit Recommendation
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {/* Weather card */}
      {weather && (
        <div className="weather-card">
          <span className="weather-icon">{weather.icon}</span>
          <div className="weather-info">
            <h3>{weather.condition}</h3>
            <p>{weather.temp}°F in {city}</p>
          </div>
        </div>
      )}

      {/* AI Advice */}
      {aiAdvice && (
        <div className="ai-advice-card">
          <h3>💡 AI Styling Tip</h3>
          <p>{aiAdvice}</p>
        </div>
      )}

      {/* Outfit display */}
      {outfit && (
        <div className="outfit-display">
          <h2>Your Perfect Outfit:</h2>
          <p className="outfit-subtitle">Based on: "{userPreference}"</p>
          <div className="outfit-items">
            {outfit.map((item, index) => (
              <div key={item._id || item.id || index} className="outfit-item">
                <div className="outfit-item-image">
                  <img 
                    src={item.imageUrl || item.image || 'https://via.placeholder.com/300'} 
                    alt={item.name} 
                  />
                </div>
                <div className="outfit-item-info">
                  <p className="item-category">{item.category}</p>
                  <p className="item-name">{item.name}</p>
                  {item.color && <p className="item-color">Color: {item.color}</p>}
                </div>
              </div>
            ))}
          </div>
          <button className="btn-regenerate" onClick={generateOutfit}>
            🔄 Try Another Outfit
          </button>
        </div>
      )}

      {/* Empty state */}
      {!outfit && !loading && !error && (
        <div className="empty-inspo">
          <p>👆 Tell us what you're looking for and we'll find the perfect outfit from your wardrobe!</p>
        </div>
      )}
    </div>
  );
}

export default OutfitInspo;
