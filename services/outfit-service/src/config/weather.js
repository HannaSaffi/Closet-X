// services/outfit-service/src/config/weather.js

const weatherConfig = {
  // Primary Weather Provider
  provider: process.env.WEATHER_PROVIDER || 'openweather',
  
  // OpenWeatherMap Configuration
  openweather: {
    apiKey: process.env.OPENWEATHER_API_KEY,
    baseUrl: 'https://api.openweathermap.org/data/2.5',
    units: 'imperial', // fahrenheit
    endpoints: {
      current: '/weather',
      forecast: '/forecast',
      onecall: '/onecall'
    }
  },
  
  // WeatherStack Configuration (Backup)
  weatherstack: {
    apiKey: process.env.WEATHERSTACK_API_KEY,
    baseUrl: 'http://api.weatherstack.com',
    units: 'f' // fahrenheit
  },
  
  // Cache Settings
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour in seconds
    keyPrefix: 'weather:'
  },
  
  // Temperature Thresholds (Fahrenheit)
  thresholds: {
    freezing: 32,
    cold: 50,
    cool: 65,
    comfortable: 75,
    warm: 85,
    hot: 95
  },
  
  // Weather Condition Mappings
  conditions: {
    clear: ['Clear', 'Sunny'],
    cloudy: ['Clouds', 'Overcast', 'Fog', 'Mist'],
    rainy: ['Rain', 'Drizzle', 'Shower'],
    snowy: ['Snow', 'Sleet', 'Blizzard'],
    stormy: ['Thunderstorm', 'Storm'],
    windy: ['Windy', 'Breezy']
  },
  
  // Clothing Recommendations by Temperature
  temperatureRecommendations: {
    freezing: { // < 32°F
      required: ['outerwear', 'thermal'],
      suggested: ['boots', 'scarf', 'gloves'],
      avoid: ['shorts', 'sandals', 'tank-top']
    },
    cold: { // 32-50°F
      required: ['outerwear'],
      suggested: ['long-pants', 'closed-shoes'],
      avoid: ['shorts', 'sandals']
    },
    cool: { // 50-65°F
      required: ['long-sleeves'],
      suggested: ['light-jacket', 'jeans'],
      avoid: ['heavy-coat']
    },
    comfortable: { // 65-75°F
      required: [],
      suggested: ['t-shirt', 'jeans', 'sneakers'],
      avoid: ['heavy-outerwear']
    },
    warm: { // 75-85°F
      required: ['light-clothing'],
      suggested: ['shorts', 'sandals', 't-shirt'],
      avoid: ['jacket', 'long-pants']
    },
    hot: { // > 85°F
      required: ['breathable-clothing'],
      suggested: ['shorts', 'tank-top', 'sandals'],
      avoid: ['jacket', 'long-sleeves', 'boots']
    }
  },
  
  // Precipitation Recommendations
  precipitationRecommendations: {
    none: [],
    light: ['light-jacket', 'umbrella'],
    moderate: ['raincoat', 'waterproof-shoes', 'umbrella'],
    heavy: ['raincoat', 'rain-boots', 'waterproof-bag']
  },
  
  // Default Location (if user doesn't specify)
  defaultLocation: {
    city: 'New York',
    lat: 40.7128,
    lon: -74.0060
  }
};

// Helper function to categorize temperature
function categorizeTemperature(temp) {
  if (temp < weatherConfig.thresholds.freezing) return 'freezing';
  if (temp < weatherConfig.thresholds.cold) return 'cold';
  if (temp < weatherConfig.thresholds.cool) return 'cool';
  if (temp < weatherConfig.thresholds.comfortable) return 'comfortable';
  if (temp < weatherConfig.thresholds.warm) return 'warm';
  if (temp < weatherConfig.thresholds.hot) return 'hot';
  return 'extreme';
}

// Helper function to get season from date
function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

// Helper function to map weather condition
function mapWeatherCondition(condition) {
  const conditionLower = condition.toLowerCase();
  
  for (const [key, values] of Object.entries(weatherConfig.conditions)) {
    if (values.some(v => conditionLower.includes(v.toLowerCase()))) {
      return key;
    }
  }
  
  return 'unknown';
}

module.exports = {
  weatherConfig,
  categorizeTemperature,
  getCurrentSeason,
  mapWeatherCondition
};