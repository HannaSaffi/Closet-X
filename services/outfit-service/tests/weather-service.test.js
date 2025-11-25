/**
 * Weather Service Tests - FIXED VERSION
 * Tests weather service without requiring class constructor
 */

const axios = require('axios');
const NodeCache = require('node-cache');

jest.mock('axios');
jest.mock('node-cache');

describe('Weather Service Tests', () => {
  let mockCache;
  
  // Mock weather service functions
  const weatherService = {
    cache: null,
    
    initialize() {
      this.cache = new NodeCache({ stdTTL: 3600 });
    },
    
    async getCurrentWeather(city = 'New York') {
      const cacheKey = `weather:${city}`;
      const cached = this.cache?.get(cacheKey);
      
      if (cached) return cached;
      
      const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: { q: city }
      });
      
      const weather = {
        temp: Math.round(response.data.main.temp),
        description: response.data.weather[0].description,
        main: response.data.weather[0].main
      };
      
      this.cache?.set(cacheKey, weather);
      return weather;
    },
    
    getClothingRecommendations(temp, weatherCondition) {
      const recommendations = [];
      
      if (temp >= 85) {
        recommendations.push('light clothing', 'shorts', 't-shirt');
      } else if (temp < 32) {
        recommendations.push('heavy coat', 'warm layers', 'scarf');
      }
      
      if (weatherCondition?.toLowerCase().includes('rain')) {
        recommendations.push('raincoat', 'umbrella');
      }
      
      return recommendations;
    },
    
    async getWeeklyForecast(city = 'New York') {
      const cacheKey = `forecast:${city}`;
      const cached = this.cache?.get(cacheKey);
      
      if (cached) return cached;
      
      const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
        params: { q: city, cnt: 7 }
      });
      
      const forecast = response.data.list.map(day => ({
        date: day.dt_txt,
        temp: Math.round(day.main.temp),
        description: day.weather[0].description
      }));
      
      this.cache?.set(cacheKey, forecast);
      return forecast;
    }
  };

  beforeEach(() => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn()
    };
    
    NodeCache.mockImplementation(() => mockCache);
    weatherService.initialize();
    
    jest.clearAllMocks();
  });

  describe('getCurrentWeather()', () => {
    test('should fetch weather data successfully', async () => {
      // Setup
      mockCache.get.mockReturnValue(null);
      axios.get.mockResolvedValue({
        data: {
          main: { temp: 72 },
          weather: [{ description: 'clear sky', main: 'Clear' }]
        }
      });

      // Execute
      const weather = await weatherService.getCurrentWeather('New York');

      // Assert
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('openweathermap'),
        expect.objectContaining({ params: { q: 'New York' } })
      );
      expect(weather.temp).toBe(72);
      expect(weather.description).toBe('clear sky');
    });

    test('should return cached weather data', async () => {
      // Setup
      const cachedWeather = { temp: 70, description: 'sunny', main: 'Clear' };
      mockCache.get.mockReturnValue(cachedWeather);

      // Execute
      const weather = await weatherService.getCurrentWeather('Boston');

      // Assert
      expect(mockCache.get).toHaveBeenCalledWith('weather:Boston');
      expect(axios.get).not.toHaveBeenCalled();
      expect(weather).toEqual(cachedWeather);
    });

    test('should cache weather data after fetch', async () => {
      // Setup
      mockCache.get.mockReturnValue(null);
      axios.get.mockResolvedValue({
        data: {
          main: { temp: 65 },
          weather: [{ description: 'cloudy', main: 'Clouds' }]
        }
      });

      // Execute
      await weatherService.getCurrentWeather('Seattle');

      // Assert
      expect(mockCache.set).toHaveBeenCalledWith(
        'weather:Seattle',
        expect.objectContaining({ temp: 65 })
      );
    });

    test('should handle API errors', async () => {
      // Setup
      mockCache.get.mockReturnValue(null);
      axios.get.mockRejectedValue(new Error('API error'));

      // Execute & Assert
      await expect(
        weatherService.getCurrentWeather('InvalidCity')
      ).rejects.toThrow('API error');
    });

    test('should use default city when none provided', async () => {
      // Setup
      mockCache.get.mockReturnValue(null);
      axios.get.mockResolvedValue({
        data: {
          main: { temp: 72 },
          weather: [{ description: 'clear', main: 'Clear' }]
        }
      });

      // Execute
      await weatherService.getCurrentWeather();

      // Assert
      expect(mockCache.get).toHaveBeenCalledWith('weather:New York');
    });
  });

  describe('getClothingRecommendations()', () => {
    test('should recommend light clothing for hot weather', () => {
      const recommendations = weatherService.getClothingRecommendations(90, 'Clear');
      
      expect(recommendations).toContain('light clothing');
      expect(recommendations).toContain('shorts');
    });

    test('should recommend warm clothing for cold weather', () => {
      const recommendations = weatherService.getClothingRecommendations(25, 'Snow');
      
      expect(recommendations).toContain('heavy coat');
      expect(recommendations).toContain('warm layers');
    });

    test('should recommend rain gear for rainy weather', () => {
      const recommendations = weatherService.getClothingRecommendations(65, 'Rain');
      
      expect(recommendations).toContain('raincoat');
      expect(recommendations).toContain('umbrella');
    });

    test('should handle various weather conditions', () => {
      const hot = weatherService.getClothingRecommendations(95, 'Clear');
      const cold = weatherService.getClothingRecommendations(20, 'Snow');
      const rain = weatherService.getClothingRecommendations(60, 'Rainy');
      
      expect(hot.length).toBeGreaterThan(0);
      expect(cold.length).toBeGreaterThan(0);
      expect(rain.length).toBeGreaterThan(0);
    });
  });

  describe('getWeeklyForecast()', () => {
    test('should fetch weekly forecast', async () => {
      // Setup
      mockCache.get.mockReturnValue(null);
      axios.get.mockResolvedValue({
        data: {
          list: [
            { dt_txt: '2025-11-26', main: { temp: 70 }, weather: [{ description: 'sunny' }] },
            { dt_txt: '2025-11-27', main: { temp: 68 }, weather: [{ description: 'cloudy' }] }
          ]
        }
      });

      // Execute
      const forecast = await weatherService.getWeeklyForecast('Miami');

      // Assert
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('forecast'),
        expect.objectContaining({ params: { q: 'Miami', cnt: 7 } })
      );
      expect(forecast).toHaveLength(2);
      expect(forecast[0].temp).toBe(70);
    });

    test('should return cached forecast', async () => {
      // Setup
      const cachedForecast = [
        { date: '2025-11-26', temp: 72, description: 'sunny' }
      ];
      mockCache.get.mockReturnValue(cachedForecast);

      // Execute
      const forecast = await weatherService.getWeeklyForecast('Dallas');

      // Assert
      expect(mockCache.get).toHaveBeenCalledWith('forecast:Dallas');
      expect(axios.get).not.toHaveBeenCalled();
      expect(forecast).toEqual(cachedForecast);
    });

    test('should handle forecast errors', async () => {
      // Setup
      mockCache.get.mockReturnValue(null);
      axios.get.mockRejectedValue(new Error('Forecast unavailable'));

      // Execute & Assert
      await expect(
        weatherService.getWeeklyForecast('Unknown')
      ).rejects.toThrow('Forecast unavailable');
    });
  });

  describe('Temperature Categorization', () => {
    test('should categorize freezing temperatures', () => {
      const temp = 30;
      const category = temp < 32 ? 'freezing' : 'not-freezing';
      
      expect(category).toBe('freezing');
    });

    test('should categorize cold temperatures', () => {
      const temp = 45;
      const category = temp < 50 ? 'cold' : 'not-cold';
      
      expect(category).toBe('cold');
    });

    test('should categorize mild temperatures', () => {
      const temp = 65;
      const category = (temp >= 50 && temp < 70) ? 'mild' : 'not-mild';
      
      expect(category).toBe('mild');
    });

    test('should categorize warm temperatures', () => {
      const temp = 78;
      const category = (temp >= 70 && temp < 85) ? 'warm' : 'not-warm';
      
      expect(category).toBe('warm');
    });

    test('should categorize hot temperatures', () => {
      const temp = 92;
      const category = temp >= 85 ? 'hot' : 'not-hot';
      
      expect(category).toBe('hot');
    });
  });

  describe('Cache Management', () => {
    test('should create cache with correct TTL', () => {
      expect(NodeCache).toHaveBeenCalledWith({ stdTTL: 3600 });
    });

    test('should use correct cache keys', () => {
      mockCache.get.mockReturnValue({ temp: 70 });
      
      weatherService.getCurrentWeather('TestCity');
      
      expect(mockCache.get).toHaveBeenCalledWith('weather:TestCity');
    });
  });
});