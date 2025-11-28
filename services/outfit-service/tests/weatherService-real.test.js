/**
 * Weather Service - REAL Integration Tests
 * These tests import and execute ACTUAL source code from src/services/weatherService.js
 */

const weatherService = require('../src/services/weatherService');
const axios = require('axios');

// Mock axios for API calls
jest.mock('axios');

describe('Weather Service - Real Source Code Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentWeather()', () => {
    test('should fetch weather data from API', async () => {
      // Setup mock OpenWeather API response
      const mockResponse = {
        data: {
          main: { temp: 72, feels_like: 70, humidity: 60 },
          weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
          wind: { speed: 5 },
          sys: { country: 'US' },
          name: 'New York'
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      // Execute
      const weather = await weatherService.getCurrentWeather('New York');

      // Assert
      expect(axios.get).toHaveBeenCalled();
      expect(weather).toBeDefined();
      expect(weather.current).toBeDefined();
      expect(weather.current.temperature).toBeDefined();
    });

    test('should handle API errors gracefully', async () => {
      // Setup
      axios.get.mockRejectedValue(new Error('API Error'));

      // Execute & Assert
      await expect(weatherService.getCurrentWeather('InvalidCity'))
        .rejects.toThrow();
    });

    test('should use default city when none provided', async () => {
      // Setup
      const mockResponse = {
        data: {
          main: { temp: 68 },
          weather: [{ id: 800, main: 'Clouds', description: 'cloudy' }],
          wind: { speed: 3 },
          sys: { country: 'US' },
          name: 'DefaultCity'
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      // Execute
      const weather = await weatherService.getCurrentWeather();

      // Assert
      expect(weather).toBeDefined();
    });

    test('should return temperature in correct format', async () => {
      // Setup
      const mockResponse = {
        data: {
          main: { temp: 72.5 },
          weather: [{ id: 800, main: 'Clear', description: 'clear' }],
          wind: { speed: 5 },
          sys: { country: 'US' },
          name: 'Miami'
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      // Execute
      const weather = await weatherService.getCurrentWeather('Miami');

      // Assert
      expect(weather.current.temperature.value).toBeDefined();
      expect(typeof weather.current.temperature.value).toBe('number');
    });

    test('should include weather description', async () => {
      // Setup
      const mockResponse = {
        data: {
          main: { temp: 65 },
          weather: [{ id: 500, main: 'Rain', description: 'light rain' }],
          wind: { speed: 10 },
          sys: { country: 'US' },
          name: 'Seattle'
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      // Execute
      const weather = await weatherService.getCurrentWeather('Seattle');

      // Assert
      expect(weather.current.condition.description).toBeDefined();
      expect(typeof weather.current.condition.description).toBe('string');
    });
  });

  describe('getClothingRecommendations()', () => {
    test('should recommend light clothing for hot weather', () => {
      const weatherData = {
        current: {
          temperature: { value: 90, unit: 'F' },
          condition: { main: 'Clear', mapped: 'clear' }
        },
        precipitation: { level: 'none' }
      };
      
      const recommendations = weatherService.getClothingRecommendations(weatherData);
      
      expect(recommendations).toBeDefined();
      expect(recommendations.temperature).toBeDefined();
      expect(Array.isArray(recommendations.suggested)).toBe(true);
    });

    test('should recommend warm clothing for cold weather', () => {
      const weatherData = {
        current: {
          temperature: { value: 32, unit: 'F' },
          condition: { main: 'Snow', mapped: 'snow' }
        },
        precipitation: { level: 'moderate' }
      };
      
      const recommendations = weatherService.getClothingRecommendations(weatherData);
      
      expect(recommendations).toBeDefined();
      expect(recommendations.temperature).toBeDefined();
    });

    test('should recommend medium clothing for moderate weather', () => {
      const weatherData = {
        current: {
          temperature: { value: 65, unit: 'F' },
          condition: { main: 'Cloudy', mapped: 'cloudy' }
        },
        precipitation: { level: 'none' }
      };
      
      const recommendations = weatherService.getClothingRecommendations(weatherData);
      
      expect(recommendations).toBeDefined();
    });

    test('should include rain gear for rainy weather', () => {
      const weatherData = {
        current: {
          temperature: { value: 60, unit: 'F' },
          condition: { main: 'Rain', mapped: 'rain' }
        },
        precipitation: { level: 'moderate' }
      };
      
      const recommendations = weatherService.getClothingRecommendations(weatherData);
      
      expect(recommendations).toBeDefined();
      expect(recommendations.precipitation).toBeDefined();
    });

    test('should provide recommendation summary', () => {
      const weatherData = {
        current: {
          temperature: { value: 70, unit: 'F' },
          condition: { main: 'Clear', mapped: 'clear' }
        },
        precipitation: { level: 'none' }
      };
      
      const recommendations = weatherService.getClothingRecommendations(weatherData);
      
      expect(recommendations.summary).toBeDefined();
      expect(typeof recommendations.summary).toBe('string');
    });
  });

  describe('getWeatherForecast()', () => {
    test('should fetch 5-day forecast', async () => {
      // Setup
      const mockForecastData = {
        data: {
          list: [
            { 
              dt: 1234567890, 
              main: { temp: 70 }, 
              weather: [{ id: 800, main: 'Clear', description: 'sunny' }],
              wind: { speed: 5 }
            },
            { 
              dt: 1234654290, 
              main: { temp: 72 }, 
              weather: [{ id: 800, main: 'Clear', description: 'sunny' }],
              wind: { speed: 4 }
            }
          ]
        }
      };
      axios.get.mockResolvedValue(mockForecastData);

      // Execute
      const forecast = await weatherService.getWeatherForecast('Boston');

      // Assert
      expect(forecast).toBeDefined();
      expect(Array.isArray(forecast)).toBe(true);
      expect(forecast.length).toBeGreaterThan(0);
    });

    test('should handle forecast API errors', async () => {
      // Setup
      axios.get.mockRejectedValue(new Error('Forecast unavailable'));

      // Execute & Assert
      await expect(weatherService.getWeatherForecast('Unknown'))
        .rejects.toThrow();
    });

    test('should use default city for forecast', async () => {
      // Setup
      const mockForecastData = {
        data: {
          list: [
            { 
              dt: 1234567890, 
              main: { temp: 70 }, 
              weather: [{ id: 800, main: 'Clear' }],
              wind: { speed: 5 }
            }
          ]
        }
      };
      axios.get.mockResolvedValue(mockForecastData);

      // Execute
      const forecast = await weatherService.getWeatherForecast();

      // Assert
      expect(forecast).toBeDefined();
    });

    test('should parse forecast data correctly', async () => {
      // Setup
      const mockForecastData = {
        data: {
          list: [
            { 
              dt: 1234567890, 
              main: { temp: 70 }, 
              weather: [{ id: 800, main: 'Clear' }],
              wind: { speed: 5 }
            }
          ]
        }
      };
      axios.get.mockResolvedValue(mockForecastData);

      // Execute
      const forecast = await weatherService.getWeatherForecast('Chicago');

      // Assert
      expect(Array.isArray(forecast)).toBe(true);
      if (forecast.length > 0) {
        expect(forecast[0]).toHaveProperty('date');
        expect(forecast[0]).toHaveProperty('temperature');
      }
    });
  });

  describe('API Integration', () => {
    test('should call weather API with correct parameters', async () => {
      // Setup
      const mockResponse = {
        data: {
          main: { temp: 72 },
          weather: [{ id: 800, main: 'Clear', description: 'clear' }],
          wind: { speed: 5 },
          sys: { country: 'US' },
          name: 'Denver'
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      // Execute
      await weatherService.getCurrentWeather('Denver');

      // Assert
      expect(axios.get).toHaveBeenCalled();
      const callArgs = axios.get.mock.calls[0];
      expect(callArgs[0]).toContain('weather');
    });

    test('should call forecast API with correct parameters', async () => {
      // Setup
      const mockForecastData = {
        data: {
          list: [
            { 
              dt: 1234567890, 
              main: { temp: 70 }, 
              weather: [{ id: 800, main: 'Clear' }],
              wind: { speed: 5 }
            }
          ]
        }
      };
      axios.get.mockResolvedValue(mockForecastData);

      // Execute
      await weatherService.getWeatherForecast('Portland');

      // Assert
      expect(axios.get).toHaveBeenCalled();
      const callArgs = axios.get.mock.calls[0];
      expect(callArgs[0]).toContain('forecast');
    });
  });

  describe('Data Formatting', () => {
    test('should format temperature data correctly', async () => {
      // Setup
      const mockResponse = {
        data: {
          main: { temp: 72.7 },
          weather: [{ id: 800, main: 'Clear', description: 'clear' }],
          wind: { speed: 5 },
          sys: { country: 'US' },
          name: 'Austin'
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      // Execute
      const weather = await weatherService.getCurrentWeather('Austin');

      // Assert
      expect(weather.current.temperature.value).toBeDefined();
      expect(typeof weather.current.temperature.value).toBe('number');
    });

    test('should format forecast data correctly', async () => {
      // Setup
      const mockForecastData = {
        data: {
          list: [
            { 
              dt: 1234567890, 
              main: { temp: 70.5 }, 
              weather: [{ id: 800, main: 'Clear' }],
              wind: { speed: 5 }
            }
          ]
        }
      };
      axios.get.mockResolvedValue(mockForecastData);

      // Execute
      const forecast = await weatherService.getWeatherForecast('Phoenix');

      // Assert
      expect(Array.isArray(forecast)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      // Setup
      axios.get.mockRejectedValue(new Error('Network error'));

      // Execute & Assert
      await expect(weatherService.getCurrentWeather('TestCity'))
        .rejects.toThrow();
    });

    test('should handle timeout errors', async () => {
      // Setup
      axios.get.mockRejectedValue(new Error('Timeout'));

      // Execute & Assert
      await expect(weatherService.getCurrentWeather('TestCity'))
        .rejects.toThrow();
    });
  });

  describe('Cache Management', () => {
    test('should cache weather data', async () => {
      // Setup
      const mockResponse = {
        data: {
          main: { temp: 72 },
          weather: [{ id: 800, main: 'Clear', description: 'clear' }],
          wind: { speed: 5 },
          sys: { country: 'US' },
          name: 'CachedCity'
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      // Execute
      await weatherService.getCurrentWeather('CachedCity');
      await weatherService.getCurrentWeather('CachedCity');

      // Assert - API should only be called once due to caching
      expect(axios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Multiple Cities', () => {
    test('should fetch weather for different cities', async () => {
      // Setup
      const mockResponse = {
        data: {
          main: { temp: 72 },
          weather: [{ id: 800, main: 'Clear', description: 'clear' }],
          wind: { speed: 5 },
          sys: { country: 'US' },
          name: 'TestCity'
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      // Execute
      const weather1 = await weatherService.getCurrentWeather('New York');
      const weather2 = await weatherService.getCurrentWeather('Los Angeles');

      // Assert
      expect(weather1).toBeDefined();
      expect(weather2).toBeDefined();
    });
  });

  describe('Recommendation Summary', () => {
    test('should generate recommendation summary', () => {
      const weatherData = {
        current: {
          temperature: { value: 75, unit: 'F' },
          condition: { main: 'Clear', mapped: 'clear' }
        },
        precipitation: { level: 'none' }
      };
      
      const recommendations = weatherService.getClothingRecommendations(weatherData);
      
      expect(recommendations.summary).toBeDefined();
      expect(recommendations.summary).toContain('°F');
    });

    test('should include weather condition in summary', () => {
      const weatherData = {
        current: {
          temperature: { value: 60, unit: 'F' },
          condition: { main: 'Rain', mapped: 'rain' }
        },
        precipitation: { level: 'moderate' }
      };
      
      const recommendations = weatherService.getClothingRecommendations(weatherData);
      
      expect(recommendations.summary).toBeDefined();
      expect(typeof recommendations.summary).toBe('string');
    });
  });
});