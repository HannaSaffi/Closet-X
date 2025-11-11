import { useState } from 'react';
import './OutfitInspo.css';

function OutfitInspo() {
  const [outfit, setOutfit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState(null);

  // Mock outfit data
  const mockOutfits = [
    {
      weather: { temp: 72, condition: 'Sunny', icon: '☀️' },
      items: [
        { id: '1', name: 'White T-Shirt', category: 'tops', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300' },
        { id: '2', name: 'Black Jeans', category: 'bottoms', image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=300' },
        { id: '3', name: 'White Sneakers', category: 'shoes', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300' }
      ]
    },
    {
      weather: { temp: 55, condition: 'Rainy', icon: '🌧️' },
      items: [
        { id: '4', name: 'Black Jacket', category: 'outerwear', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300' },
        { id: '2', name: 'Black Jeans', category: 'bottoms', image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=300' },
        { id: '3', name: 'White Sneakers', category: 'shoes', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300' }
      ]
    }
  ];

  const generateOutfit = async () => {
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Pick random outfit
    const randomOutfit = mockOutfits[Math.floor(Math.random() * mockOutfits.length)];
    setWeather(randomOutfit.weather);
    setOutfit(randomOutfit.items);
    setLoading(false);
  };

  return (
    <div className="outfit-inspo">
      <div className="inspo-header">
        <h1>✨ Outfit Inspiration</h1>
        <p>Let AI pick the perfect outfit based on weather and your closet!</p>
      </div>

      <div className="generate-section">
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
              <div key={item.id} className="outfit-item">
                <div className="outfit-item-image">
                  <img src={item.image} alt={item.name} />
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

      {!outfit && !loading && (
        <div className="empty-inspo">
          <p>Click the button above to get your personalized outfit!</p>
        </div>
      )}
    </div>
  );
}

export default OutfitInspo;
