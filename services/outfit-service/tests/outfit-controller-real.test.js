/**
 * REAL Outfit Controller Tests - Executes Actual Source Code
 * This will ACTUALLY INCREASE your coverage report!
 * 
 * Place in: services/outfit-service/tests/controller-real.test.js
 */

const dailyOutfitController = require('../src/controllers/dailyOutfitController');
const weatherService = require('../src/services/weatherService');
const aiAdviceService = require('../src/services/aiAdviceService');
const outfitGenerator = require('../src/services/outfitGenerator');

// Mock dependencies
jest.mock('../src/services/weatherService', () => ({
  getCurrentWeather: jest.fn(),
  getClothingRecommendations: jest.fn(),
  getWeeklyForecast: jest.fn()
}));
jest.mock('../src/services/outfitGenerator');

// Mock aiAdviceService differently since it might not have default export
jest.mock('../src/services/aiAdviceService', () => ({
  getAdvice: jest.fn()
}));

describe('Daily Outfit Controller - Real Source Code Tests', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Setup mock request and response
    mockReq = {
      user: {
        id: 'user123',
        email: 'test@example.com'
      },
      query: {},
      headers: {
        authorization: 'Bearer mock-token-12345'
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('getDailyOutfit()', () => {
    test('should generate daily outfit successfully', async () => {
      // Arrange
      const mockWeather = {
        temp: 72,
        feelsLike: 70,
        main: 'Clear',
        description: 'clear sky',
        humidity: 65,
        windSpeed: 5
      };

      const mockOutfits = [
        {
          id: 'outfit1',
          items: ['shirt1', 'pants1'],
          score: 95
        },
        {
          id: 'outfit2',
          items: ['shirt2', 'pants2'],
          score: 90
        }
      ];

      const mockWeatherRecs = {
        recommendation: 'Light layers recommended',
        layers: 2
      };

      const mockAIAdvice = {
        advice: 'Perfect weather for casual wear',
        tips: ['Stay cool', 'Wear breathable fabrics']
      };

      weatherService.getCurrentWeather.mockResolvedValue(mockWeather);
      weatherService.getClothingRecommendations.mockReturnValue(mockWeatherRecs);
      outfitGenerator.generateOutfits.mockResolvedValue(mockOutfits);
      aiAdviceService.getAdvice.mockResolvedValue(mockAIAdvice);

      mockReq.query = { city: 'New York', includeAI: 'true' };

      // Act
      await dailyOutfitController.getDailyOutfit(mockReq, mockRes);

      // Assert
      expect(weatherService.getCurrentWeather).toHaveBeenCalledWith('New York');
      expect(outfitGenerator.generateOutfits).toHaveBeenCalledWith('user123', expect.objectContaining({
        occasion: 'casual',
        weather: mockWeather,
        token: 'mock-token-12345'
      }));
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Daily outfit recommendations generated',
        data: expect.objectContaining({
          location: 'New York',
          weather: expect.objectContaining({
            temp: 72,
            condition: 'Clear'
          }),
          outfits: expect.any(Array),
          aiAdvice: mockAIAdvice
        })
      }));
    });

    test('should use default city when not provided', async () => {
      // Arrange
      const mockWeather = { temp: 65, main: 'Cloudy' };
      const mockOutfits = [{ id: 'outfit1' }];

      weatherService.getCurrentWeather.mockResolvedValue(mockWeather);
      weatherService.getClothingRecommendations.mockReturnValue({ recommendation: 'Normal' });
      outfitGenerator.generateOutfits.mockResolvedValue(mockOutfits);

      mockReq.query = {}; // No city specified

      // Act
      await dailyOutfitController.getDailyOutfit(mockReq, mockRes);

      // Assert
      expect(weatherService.getCurrentWeather).toHaveBeenCalledWith('New York'); // Default
    });

    test('should handle weather service failure', async () => {
      // Arrange
      weatherService.getCurrentWeather.mockRejectedValue(new Error('Weather API unavailable'));

      mockReq.query = { city: 'InvalidCity' };

      // Act
      await dailyOutfitController.getDailyOutfit(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to get weather data',
        error: 'Weather API unavailable',
        hint: 'Please check the city name or API key'
      });
    });

    test('should handle outfit generation failure', async () => {
      // Arrange
      const mockWeather = { temp: 72, main: 'Clear' };
      
      weatherService.getCurrentWeather.mockResolvedValue(mockWeather);
      weatherService.getClothingRecommendations.mockReturnValue({ recommendation: 'Test' });
      outfitGenerator.generateOutfits.mockRejectedValue(new Error('No wardrobe items'));

      // Act
      await dailyOutfitController.getDailyOutfit(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to generate daily outfit',
        error: 'No wardrobe items'
      });
    });

    test('should return 404 when no outfits generated', async () => {
      // Arrange
      const mockWeather = { temp: 72, main: 'Clear' };
      
      weatherService.getCurrentWeather.mockResolvedValue(mockWeather);
      weatherService.getClothingRecommendations.mockReturnValue({ recommendation: 'Test' });
      outfitGenerator.generateOutfits.mockResolvedValue([]); // Empty array

      // Act
      await dailyOutfitController.getDailyOutfit(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Could not generate outfits',
        reason: 'Not enough clothing items in your wardrobe',
        suggestion: 'Please add more clothing items to your wardrobe'
      });
    });

    test('should work without AI when includeAI is false', async () => {
      // Arrange
      const mockWeather = { temp: 72, main: 'Clear' };
      const mockOutfits = [{ id: 'outfit1' }];

      weatherService.getCurrentWeather.mockResolvedValue(mockWeather);
      weatherService.getClothingRecommendations.mockReturnValue({ recommendation: 'Test' });
      outfitGenerator.generateOutfits.mockResolvedValue(mockOutfits);

      mockReq.query = { includeAI: 'false' };

      // Act
      await dailyOutfitController.getDailyOutfit(mockReq, mockRes);

      // Assert
      expect(aiAdviceService.getAdvice).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          aiAdvice: null
        })
      }));
    });

    test('should continue if AI service fails', async () => {
      // Arrange
      const mockWeather = { temp: 72, main: 'Clear' };
      const mockOutfits = [{ id: 'outfit1' }];

      weatherService.getCurrentWeather.mockResolvedValue(mockWeather);
      weatherService.getClothingRecommendations.mockReturnValue({ recommendation: 'Test' });
      outfitGenerator.generateOutfits.mockResolvedValue(mockOutfits);
      aiAdviceService.getAdvice.mockRejectedValue(new Error('AI unavailable'));

      mockReq.query = { includeAI: 'true' };

      // Act
      await dailyOutfitController.getDailyOutfit(mockReq, mockRes);

      // Assert - Should still succeed
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    test('should return top 3 outfits only', async () => {
      // Arrange
      const mockWeather = { temp: 72, main: 'Clear' };
      const mockOutfits = [
        { id: '1' }, { id: '2' }, { id: '3' }, 
        { id: '4' }, { id: '5' }
      ]; // 5 outfits

      weatherService.getCurrentWeather.mockResolvedValue(mockWeather);
      weatherService.getClothingRecommendations.mockReturnValue({ recommendation: 'Test' });
      outfitGenerator.generateOutfits.mockResolvedValue(mockOutfits);

      // Act
      await dailyOutfitController.getDailyOutfit(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          outfits: expect.arrayContaining([
            { id: '1' }, { id: '2' }, { id: '3' }
          ])
        })
      }));
      
      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.outfits).toHaveLength(3);
    });
  });

  describe('getWeeklyOutfits()', () => {
    test('should generate weekly outfits successfully', async () => {
      // Arrange
      const mockForecast = [
        { date: '2025-11-25', dayOfWeek: 'Monday', weather: { temp: 70 } },
        { date: '2025-11-26', dayOfWeek: 'Tuesday', weather: { temp: 72 } }
      ];

      const mockOutfits = [{ id: 'outfit1' }];

      weatherService.getWeeklyForecast.mockResolvedValue(mockForecast);
      outfitGenerator.generateOutfits.mockResolvedValue(mockOutfits);

      mockReq.query = { city: 'Boston' };

      // Act
      await dailyOutfitController.getWeeklyOutfits(mockReq, mockRes);

      // Assert
      expect(weatherService.getWeeklyForecast).toHaveBeenCalledWith('Boston');
      expect(outfitGenerator.generateOutfits).toHaveBeenCalledTimes(2);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Weekly outfit plan generated',
        data: expect.objectContaining({
          location: 'Boston',
          weeklyOutfits: expect.arrayContaining([
            expect.objectContaining({
              date: '2025-11-25',
              outfit: expect.any(Object)
            })
          ])
        })
      }));
    });

    test('should handle weekly forecast failure', async () => {
      // Arrange
      weatherService.getWeeklyForecast.mockRejectedValue(new Error('Forecast API error'));

      // Act
      await dailyOutfitController.getWeeklyOutfits(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to generate weekly outfits',
        error: 'Forecast API error'
      });
    });

    test('should continue if single day outfit fails', async () => {
      // Arrange
      const mockForecast = [
        { date: '2025-11-25', dayOfWeek: 'Monday', weather: { temp: 70 } },
        { date: '2025-11-26', dayOfWeek: 'Tuesday', weather: { temp: 72 } }
      ];

      weatherService.getWeeklyForecast.mockResolvedValue(mockForecast);
      outfitGenerator.generateOutfits
        .mockResolvedValueOnce([{ id: 'outfit1' }]) // First day succeeds
        .mockRejectedValueOnce(new Error('Failed')); // Second day fails

      // Act
      await dailyOutfitController.getWeeklyOutfits(mockReq, mockRes);

      // Assert - Should still return response
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });
  });

  describe('saveFavoriteOutfit()', () => {
    test('should save favorite outfit successfully', async () => {
      // Arrange
      mockReq.body = {
        outfitId: 'outfit123',
        name: 'My Favorite Outfit'
      };

      // Act
      await dailyOutfitController.saveFavoriteOutfit(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Outfit saved as favorite',
        data: expect.objectContaining({
          userId: 'user123',
          outfitId: 'outfit123',
          name: 'My Favorite Outfit',
          savedAt: expect.any(String)
        })
      });
    });

    test('should handle save errors gracefully', async () => {
      // Arrange
      mockReq.body = {
        outfitId: 'outfit123',
        name: 'Test'
      };

      // Force an error by making user undefined
      mockReq.user = undefined;

      // Act
      await dailyOutfitController.saveFavoriteOutfit(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Failed to save outfit'
      }));
    });
  });
});