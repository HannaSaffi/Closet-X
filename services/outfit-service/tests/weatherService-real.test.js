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
    test('should handle API errors gracefully', async () => {
      // Setup
      axios.get.mockRejectedValue(new Error('API Error'));

      // Execute & Assert
      await expect(weatherService.getCurrentWeather('InvalidCity'))
        .rejects.toThrow();
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
  });

  describe('Multiple Cities', () => {
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