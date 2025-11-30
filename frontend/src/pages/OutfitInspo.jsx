import { useState, useRef, useEffect } from 'react';
import { getDailyOutfit } from '../services/api';
import './OutfitInspo.css';

function OutfitInspo() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Hi! I'm your AI stylist. Tell me what kind of outfit you're looking for today, and I'll help you pick the perfect look from your wardrobe!",
      timestamp: new Date()
    }
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState(null);
  const [currentOutfit, setCurrentOutfit] = useState(null);
  const [includeWeather, setIncludeWeather] = useState(false);
  const [city, setCity] = useState('New York');
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role, content, outfit = null, weatherData = null, aiAdvice = null) => {
    const newMessage = {
      role,
      content,
      timestamp: new Date(),
      outfit,
      weather: weatherData,
      aiAdvice
    };
    setMessages(prev => [...prev, newMessage]);
    
    if (outfit) {
      setCurrentOutfit(outfit);
    }
    if (weatherData) {
      setWeather(weatherData);
    }
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || loading) return;

    const userMessage = currentInput.trim();
    setCurrentInput('');
    
    // Add user message to chat
    addMessage('user', userMessage);
    
    setLoading(true);
    
    try {
      // Build the API request
      const params = {
        preference: userMessage,
        includeAI: true
      };
      
      if (includeWeather) {
        params.city = city;
      }
      
      const data = await getDailyOutfit(params);

      // Check if it's a conversational response
      if (data.conversational) {
        addMessage('assistant', data.message);
        setLoading(false);
        return;
      }

      // Extract weather data if available
      let weatherData = null;
      if (data.data?.weather && includeWeather) {
        weatherData = {
          temp: data.data.weather.temp,
          feelsLike: data.data.weather.feelsLike,
          condition: data.data.weather.condition || data.data.weather.description,
          description: data.data.weather.description,
          icon: getWeatherIcon(data.data.weather.condition, data.data.weather.description)
        };
      }
      
      // Extract outfit
      let outfit = null;
      if (data.data?.outfits && data.data.outfits[0]) {
        outfit = data.data.outfits[0].items;
      }
      
      // Create assistant response message
      let responseText = '';
      
      if (weatherData) {
        responseText += `🌤️ It's ${weatherData.temp}°F in ${city} - ${weatherData.description}!\n\n`;
      }
      
      if (outfit) {
        responseText += `Perfect! I found a great outfit for you based on "${userMessage}". `;
      } else {
        responseText += `I couldn't find any matching outfits in your wardrobe. `;
      }
      
      if (data.data?.aiAdvice) {
        responseText += `\n\n💡 ${data.data.aiAdvice}`;
      }
      
      if (!outfit) {
        responseText += '\n\nWould you like to try a different style, or add more items to your wardrobe?';
      }
      
      addMessage('assistant', responseText, outfit, weatherData, data.data?.aiAdvice);
      
    } catch (err) {
      console.error('Error generating outfit:', err);
      addMessage('assistant', '❌ Sorry, I had trouble generating an outfit. Could you try rephrasing your request?');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getWeatherIcon = (condition, description) => {
  const lower = (condition || description || '').toLowerCase();
  
  // Check time of day for sun/moon
  const hour = new Date().getHours();
  const isNight = hour < 6 || hour > 18; // Night between 6 PM and 6 AM
  
  // Clear/Sunny
  if (lower.includes('clear') || lower.includes('sun')) {
    return isNight ? '🌙' : '☀️';
  }
  
  // Rain
  if (lower.includes('rain') || lower.includes('drizzle')) {
    if (lower.includes('heavy')) return '🌧️';
    if (lower.includes('light')) return '🌦️';
    return '🌧️';
  }
  
  // Thunderstorm
  if (lower.includes('thunder') || lower.includes('storm')) {
    return '⛈️';
  }
  
  // Snow
  if (lower.includes('snow')) {
    if (lower.includes('heavy')) return '❄️';
    return '🌨️';
  }
  
  // Clouds/Overcast
  if (lower.includes('cloud') || lower.includes('overcast')) {
    if (lower.includes('few') || lower.includes('scattered')) {
      return isNight ? '☁️' : '⛅';
    }
    return '☁️';
  }
  
  // Fog/Mist/Haze
  if (lower.includes('fog') || lower.includes('mist') || lower.includes('haze')) {
    return '🌫️';
  }
  
  // Wind
  if (lower.includes('wind')) {
    return '💨';
  }
  
  // Tornado/Severe
  if (lower.includes('tornado')) {
    return '🌪️';
  }
  
  // Default based on time
  return isNight ? '🌙' : '🌤️';
};

  const suggestedPrompts = [
    "Something comfy for working from home",
    "Professional outfit for a meeting",
    "Casual look for coffee with friends",
    "Date night outfit",
    "Weekend brunch style"
  ];

  const handleSuggestedPrompt = (prompt) => {
    setCurrentInput(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className="outfit-inspo-chat">
      <div className="chat-header">
        <h1>✨ AI Style Chat</h1>
        <p>Chat with your AI stylist about your outfit needs</p>
        
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
            <span className="toggle-text">Include weather</span>
          </label>
          
          {includeWeather && (
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="city-input-inline"
            />
          )}
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <div className="message-bubble">
              <div className="message-content">
                {message.content.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              
              {/* Display outfit if present */}
              {message.outfit && (
                <div className="message-outfit">
                  <div className="outfit-grid">
                    {message.outfit.map((item, idx) => (
                      <div key={item._id || item.id || idx} className="outfit-item-mini">
                        <img 
                          src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}${item.imageUrl}` || item.image || 'https://via.placeholder.com/150'}
                          alt={item.name}
                          className="outfit-item-image-mini"
                        />
                        <div className="outfit-item-name-mini">{item.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Display weather if present */}
              {message.weather && (
                <div className="message-weather">
                  <span className="weather-icon">{message.weather.icon}</span>
                  <span>{message.weather.temp}°F - {message.weather.description}</span>
                </div>
              )}
              
              <div className="message-timestamp">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="message assistant">
            <div className="message-bubble">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts - only show when chat is empty */}
      {messages.length === 1 && !loading && (
        <div className="suggested-prompts">
          <p className="prompts-label">Try asking:</p>
          <div className="prompt-buttons">
            {suggestedPrompts.map((prompt, idx) => (
              <button
                key={idx}
                className="prompt-button"
                onClick={() => handleSuggestedPrompt(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="chat-input-container">
        <textarea
          ref={inputRef}
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Tell me what you're looking for..."
          className="chat-input"
          rows="2"
          disabled={loading}
        />
        <button 
          className="send-button" 
          onClick={handleSendMessage}
          disabled={loading || !currentInput.trim()}
        >
          {loading ? '⏳' : '🚀'}
        </button>
      </div>
    </div>
  );
}

export default OutfitInspo;