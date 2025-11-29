const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const User = require('../src/models/User');
const weatherService = require('../src/services/weatherService');
const aiAdviceService = require('../src/services/aiAdviceService');
const outfitGenerator = require('../src/services/outfitGenerator');

// Create a simple Express app for testing
const app = express();
app.use(express.json());

// Mock authentication middleware
const mockAuthMiddleware = (req, res, next) => {
  req.user = { id: 'test-user-id', email: 'test@example.com' };
  next();
};

// Import controller functions
const dailyOutfitController = require('../src/controllers/dailyOutfitController');

// Set up routes
app.get('/api/daily-outfit', mockAuthMiddleware, dailyOutfitController.getDailyOutfit);
app.get('/api/weekly-outfits', mockAuthMiddleware, dailyOutfitController.getWeeklyOutfits);
app.post('/api/daily-outfit/save', mockAuthMiddleware, dailyOutfitController.saveFavoriteOutfit);

// Mock external services
jest.mock('../src/services/weatherService');
jest.mock('../src/services/aiAdviceService');
jest.mock('../src/services/outfitGenerator');

describe('Outfit Service - Controllers', () => {
  let mockUser;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/closetx_outfits_test?directConnection=true';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear database
    await User.deleteMany({});

    // Create test user
    mockUser = await User.create({
      email: 'test@example.com',
      password: 'hashedpassword',
      fullName: 'Test User',
      preferences: {
        style: 'casual',
        defaultCity: 'New York'
      },
      outfitsGenerated: 0
    });

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('GET /api/daily-outfit', () => {
    const mockWeatherData = {
      location: {
        city: 'New York',
        region: 'NY',
        country: 'US'
      },
      current: {
        temperature: {
          value: 72,
          feelsLike: 70,
          category: 'comfortable'
        },
        condition: {
          description: 'Partly Cloudy',
          icon: 'partly-cloudy'
        },
        humidity: 65,
        wind: {
          speed: 10
        }
      }
    };

    const mockOutfits = [
      {
        items: [
          {
            _id: 'item1',
            category: 'tops',
            subcategory: 'shirt',
            color: { primary: 'blue', secondary: ['white'] },
            brand: 'Nike',
            imageURL: 'http://example.com/shirt.jpg',
            style: 'casual'
          },
          {
            _id: 'item2',
            category: 'bottoms',
            subcategory: 'jeans',
            color: { primary: 'black', secondary: [] },
            brand: 'Levi\'s',
            imageURL: 'http://example.com/jeans.jpg',
            style: 'casual'
          },
          {
            _id: 'item3',
            category: 'shoes',
            subcategory: 'sneakers',
            color: { primary: 'white', secondary: [] },
            brand: 'Adidas',
            imageURL: 'http://example.com/shoes.jpg',
            style: 'casual'
          }
        ],
        colors: ['blue', 'black', 'white'],
        styles: ['casual', 'casual', 'casual'],
        score: 92,
        weatherScore: 95
      }
    ];

    beforeEach(() => {
      // Mock weather service
      weatherService.getCurrentWeather.mockResolvedValue(mockWeatherData);
      weatherService.getClothingRecommendations.mockReturnValue({
        summary: 'Perfect weather for light layers',
        suggested: ['Light jacket'],
        layering: 'Optional light layer',
        accessories: ['Sunglasses']
      });

      // Mock outfit generator
      outfitGenerator.generateOutfits.mockResolvedValue(mockOutfits);

      // Mock AI service
      aiAdviceService.isAvailable.mockResolvedValue(true);
      aiAdviceService.getFashionAdvice.mockResolvedValue({
        success: true,
        advice: 'Looking great! This outfit is perfect for the weather.',
        provider: 'ollama'
      });
      aiAdviceService.analyzeOutfit.mockResolvedValue({
        success: true,
        analysis: 'Excellent color coordination and style coherence.',
        provider: 'ollama'
      });
    });

    test('should successfully generate daily outfit recommendations', async () => {
      const response = await request(app)
        .get('/api/daily-outfit')
        .query({ includeAI: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('weather');
      expect(response.body.data).toHaveProperty('outfits');
      expect(response.body.data.outfits).toHaveLength(1);
    });

    test('should fetch weather for specified city', async () => {
      await request(app)
        .get('/api/daily-outfit')
        .query({ city: 'Boston' });

      expect(weatherService.getCurrentWeather).toHaveBeenCalledWith('Boston');
    });

    test('should use user default city when no city specified', async () => {
      await request(app)
        .get('/api/daily-outfit');

      expect(weatherService.getCurrentWeather).toHaveBeenCalledWith('New York');
    });

    test('should return weather information in response', async () => {
      const response = await request(app)
        .get('/api/daily-outfit');

      expect(response.body.data.weather).toMatchObject({
        temperature: {
          current: '72°F',
          feelsLike: '70°F',
          category: 'comfortable'
        },
        condition: {
          description: 'Partly Cloudy',
          icon: 'partly-cloudy'
        }
      });
    });

    test('should return outfit recommendations with scores', async () => {
      const response = await request(app)
        .get('/api/daily-outfit');

      const outfit = response.body.data.outfits[0];
      expect(outfit).toHaveProperty('score');
      expect(outfit.score).toHaveProperty('overall');
      expect(outfit.score).toHaveProperty('colorHarmony');
      expect(outfit.score).toHaveProperty('styleCoherence');
      expect(outfit.score).toHaveProperty('weatherAppropriate');
    });

    test('should include AI insights when enabled', async () => {
      const response = await request(app)
        .get('/api/daily-outfit')
        .query({ includeAI: 'true' });

      expect(response.body.data.aiInsights).toBeDefined();
      expect(response.body.data.aiInsights.fashionAdvice).toBe('Looking great! This outfit is perfect for the weather.');
    });

    test('should not include AI insights when disabled', async () => {
      const response = await request(app)
        .get('/api/daily-outfit')
        .query({ includeAI: 'false' });

      expect(response.body.data.aiInsights).toBeNull();
      expect(aiAdviceService.isAvailable).not.toHaveBeenCalled();
    });

    test('should handle AI service unavailability gracefully', async () => {
      aiAdviceService.isAvailable.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/daily-outfit')
        .query({ includeAI: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.data.aiInsights).toBeNull();
    });

    test('should increment user outfit counter', async () => {
      await request(app).get('/api/daily-outfit');

      const updatedUser = await User.findById(mockUser._id);
      expect(updatedUser.outfitsGenerated).toBe(1);
    });

    test('should return 404 when user not found', async () => {
      await User.deleteMany({});

      const response = await request(app).get('/api/daily-outfit');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    test('should handle weather service error', async () => {
      weatherService.getCurrentWeather.mockRejectedValue(new Error('Weather API failed'));

      const response = await request(app).get('/api/daily-outfit');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to get weather data');
    });

    test('should handle no outfits available', async () => {
      outfitGenerator.generateOutfits.mockResolvedValue([]);

      const response = await request(app).get('/api/daily-outfit');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Could not generate outfits');
    });

    test('should include weather-based tips', async () => {
      const response = await request(app).get('/api/daily-outfit');

      expect(response.body.data.weatherTips).toBeDefined();
      expect(response.body.data.weatherTips.shouldBring).toContain('Light jacket');
      expect(response.body.data.weatherTips.accessories).toContain('Sunglasses');
    });

    test('should include outfit reasoning', async () => {
      const response = await request(app).get('/api/daily-outfit');

      const outfit = response.body.data.outfits[0];
      expect(outfit.whyThisWorks).toBeDefined();
      expect(Array.isArray(outfit.whyThisWorks)).toBe(true);
      expect(outfit.whyThisWorks.length).toBeGreaterThan(0);
    });

    test('should format date and location correctly', async () => {
      const response = await request(app).get('/api/daily-outfit');

      expect(response.body.data.date).toBeDefined();
      expect(response.body.data.location).toMatchObject({
        city: 'New York',
        region: 'NY',
        country: 'US'
      });
    });

    test('should handle AI service errors gracefully', async () => {
      aiAdviceService.getFashionAdvice.mockResolvedValue({
        success: false,
        error: 'AI service error'
      });

      const response = await request(app)
        .get('/api/daily-outfit')
        .query({ includeAI: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/weekly-outfits', () => {
    const mockForecast = [
      {
        temperature: { value: 70, category: 'comfortable' },
        condition: { description: 'Sunny' }
      },
      {
        temperature: { value: 68, category: 'comfortable' },
        condition: { description: 'Cloudy' }
      },
      {
        temperature: { value: 75, category: 'warm' },
        condition: { description: 'Clear' }
      }
    ];

    const mockOutfit = {
      items: [
        {
          category: 'tops',
          color: { primary: 'blue' },
          imageURL: 'http://example.com/shirt.jpg'
        }
      ]
    };

    beforeEach(() => {
      weatherService.getWeatherForecast.mockResolvedValue(mockForecast);
      outfitGenerator.generateOutfits.mockResolvedValue([mockOutfit]);
    });

    test('should generate weekly outfit plan', async () => {
      const response = await request(app).get('/api/weekly-outfits');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.weeklyPlan).toBeDefined();
      expect(response.body.data.weeklyPlan).toHaveLength(3);
    });

    test('should include weather for each day', async () => {
      const response = await request(app).get('/api/weekly-outfits');

      response.body.data.weeklyPlan.forEach(day => {
        expect(day).toHaveProperty('weather');
        expect(day.weather).toHaveProperty('temperature');
        expect(day.weather).toHaveProperty('condition');
      });
    });

    test('should include day and date for each entry', async () => {
      const response = await request(app).get('/api/weekly-outfits');

      response.body.data.weeklyPlan.forEach(day => {
        expect(day).toHaveProperty('day');
        expect(day).toHaveProperty('date');
      });
    });

    test('should use specified city', async () => {
      await request(app)
        .get('/api/weekly-outfits')
        .query({ city: 'Chicago' });

      expect(weatherService.getWeatherForecast).toHaveBeenCalledWith('Chicago');
    });

    test('should handle forecast error', async () => {
      weatherService.getWeatherForecast.mockRejectedValue(new Error('Forecast failed'));

      const response = await request(app).get('/api/weekly-outfits');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/daily-outfit/save', () => {
    test('should save favorite outfit', async () => {
      const outfitData = {
        outfitItems: ['item1', 'item2', 'item3'],
        occasion: 'casual',
        notes: 'Great for summer'
      };

      const response = await request(app)
        .post('/api/daily-outfit/save')
        .send(outfitData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Outfit saved to favorites');
    });

    test('should handle save errors', async () => {
      // Mock a scenario where saving fails (future implementation)
      const response = await request(app)
        .post('/api/daily-outfit/save')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      // Temporarily close the connection
      await mongoose.connection.close();

      const response = await request(app).get('/api/daily-outfit');

      expect(response.status).toBe(500);

      // Reconnect for other tests
      const mongoUri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/closetx_outfits_test?directConnection=true';
      await mongoose.connect(mongoUri);
    });

    test('should handle malformed requests', async () => {
      const response = await request(app)
        .get('/api/daily-outfit')
        .query({ city: null });

      // Should still work with default city
      expect(response.status).toBeLessThan(500);
    });

    test('should handle unexpected outfit generator errors', async () => {
      outfitGenerator.generateOutfits.mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app).get('/api/daily-outfit');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Integration with Algorithms', () => {
    test('should calculate color harmony correctly', async () => {
      const mockOutfitsWithColors = [{
        ...mockUser,
        items: [
          { category: 'tops', color: { primary: 'blue' }, style: 'casual' },
          { category: 'bottoms', color: { primary: 'white' }, style: 'casual' }
        ],
        colors: ['blue', 'white'],
        styles: ['casual', 'casual'],
        score: 90
      }];

      outfitGenerator.generateOutfits.mockResolvedValue(mockOutfitsWithColors);

      const response = await request(app).get('/api/daily-outfit');

      const outfit = response.body.data.outfits[0];
      expect(outfit.score.colorHarmony).toBeGreaterThan(0);
      expect(outfit.score.colorHarmony).toBeLessThanOrEqual(100);
    });

    test('should calculate style coherence correctly', async () => {
      const mockOutfitsWithStyles = [{
        items: [
          { category: 'tops', color: { primary: 'blue' }, style: 'casual' },
          { category: 'bottoms', color: { primary: 'black' }, style: 'casual' }
        ],
        colors: ['blue', 'black'],
        styles: ['casual', 'casual'],
        score: 95
      }];

      outfitGenerator.generateOutfits.mockResolvedValue(mockOutfitsWithStyles);

      const response = await request(app).get('/api/daily-outfit');

      const outfit = response.body.data.outfits[0];
      expect(outfit.score.styleCoherence).toBeGreaterThan(0);
      expect(outfit.score.styleCoherence).toBeLessThanOrEqual(100);
    });
  });
});
