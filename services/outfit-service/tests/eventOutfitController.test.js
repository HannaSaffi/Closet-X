const request = require('supertest');
const express = require('express');
const weatherService = require('../src/services/weatherService');
const outfitGenerator = require('../src/services/outfitGenerator');

// Create Express app for testing
const app = express();
app.use(express.json());

// Mock authentication middleware
const mockAuthMiddleware = (req, res, next) => {
  req.user = { id: 'test-user-id', email: 'test@example.com' };
  next();
};

// Import controller
const eventOutfitController = require('../src/controllers/eventOutfitController');

// Set up route
app.post('/api/outfits/event', mockAuthMiddleware, eventOutfitController.getEventOutfit);

// Mock external services
jest.mock('../src/services/weatherService');
jest.mock('../src/services/outfitGenerator');

describe('Event Outfit Controller', () => {
  const mockWeatherData = {
    location: { city: 'New York', region: 'NY', country: 'US' },
    current: {
      temperature: { value: 72, feelsLike: 70, category: 'comfortable' },
      condition: { description: 'Partly Cloudy', icon: 'partly-cloudy' }
    }
  };

  const mockOutfits = [
    {
      items: [
        {
          _id: 'item1',
          category: 'tops',
          subcategory: 'dress-shirt',
          color: { primary: 'navy', secondary: [] },
          brand: 'Brooks Brothers',
          imageURL: 'http://example.com/shirt.jpg',
          style: 'formal'
        },
        {
          _id: 'item2',
          category: 'bottoms',
          subcategory: 'dress-pants',
          color: { primary: 'charcoal', secondary: [] },
          brand: 'Hugo Boss',
          imageURL: 'http://example.com/pants.jpg',
          style: 'formal'
        },
        {
          _id: 'item3',
          category: 'shoes',
          subcategory: 'dress-shoes',
          color: { primary: 'black', secondary: [] },
          brand: 'Allen Edmonds',
          imageURL: 'http://example.com/shoes.jpg',
          style: 'formal'
        }
      ],
      colors: ['navy', 'charcoal', 'black'],
      styles: ['formal', 'formal', 'formal'],
      score: 95
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    weatherService.getCurrentWeather.mockResolvedValue(mockWeatherData);
    weatherService.getWeatherForecast.mockResolvedValue([mockWeatherData.current]);
    outfitGenerator.generateOutfits.mockResolvedValue(mockOutfits);
  });

  describe('POST /api/outfits/event - Validation', () => {
    test('should return 400 when date is missing', async () => {
      const response = await request(app)
        .post('/api/outfits/event')
        .send({ city: 'New York', occasion: 'wedding' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required fields');
    });

    test('should return 400 when city is missing', async () => {
      const response = await request(app)
        .post('/api/outfits/event')
        .send({ date: '2024-12-25', occasion: 'wedding' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 when occasion is missing', async () => {
      const response = await request(app)
        .post('/api/outfits/event')
        .send({ date: '2024-12-25', city: 'New York' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .post('/api/outfits/event')
        .send({ date: 'invalid-date', city: 'New York', occasion: 'wedding' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid date format');
    });

    test('should return 400 for past event date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const response = await request(app)
        .post('/api/outfits/event')
        .send({
          date: pastDate.toISOString().split('T')[0],
          city: 'New York',
          occasion: 'wedding'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('cannot be in the past');
    });
  });

  describe('POST /api/outfits/event - Success Cases', () => {
    test('should generate outfit for event today', async () => {
      const today = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/outfits/event')
        .send({ date: today, city: 'New York', occasion: 'interview' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.event.daysUntil).toBe(0);
      expect(weatherService.getCurrentWeather).toHaveBeenCalledWith('New York');
    });

    test('should generate outfit for event within 7 days', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const dateString = futureDate.toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/outfits/event')
        .send({ date: dateString, city: 'Boston', occasion: 'wedding' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.event.daysUntil).toBe(3);
      expect(weatherService.getWeatherForecast).toHaveBeenCalledWith('Boston');
    });

    test('should generate outfit for event beyond 7 days', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const dateString = futureDate.toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/outfits/event')
        .send({ date: dateString, city: 'Chicago', occasion: 'party' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.weather.note).toContain('beyond 7 days');
      expect(weatherService.getCurrentWeather).toHaveBeenCalledWith('Chicago');
    });

    test('should include dresscode when provided', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/outfits/event')
        .send({
          date: tomorrow.toISOString().split('T')[0],
          city: 'New York',
          occasion: 'meeting',
          dresscode: 'business casual'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.event.dresscode).toBe('business casual');
    });
  });

  describe('POST /api/outfits/event - Occasion Mapping', () => {
    test('should map wedding to formal style', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await request(app)
        .post('/api/outfits/event')
        .send({
          date: tomorrow.toISOString().split('T')[0],
          city: 'New York',
          occasion: 'wedding'
        });

      expect(outfitGenerator.generateOutfits).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          userStyle: 'formal',
          occasion: 'wedding'
        })
      );
    });

    test('should map interview to formal style', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await request(app)
        .post('/api/outfits/event')
        .send({
          date: tomorrow.toISOString().split('T')[0],
          city: 'New York',
          occasion: 'interview'
        });

      expect(outfitGenerator.generateOutfits).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          userStyle: 'formal'
        })
      );
    });

    test('should map date to trendy style', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await request(app)
        .post('/api/outfits/event')
        .send({
          date: tomorrow.toISOString().split('T')[0],
          city: 'New York',
          occasion: 'date'
        });

      expect(outfitGenerator.generateOutfits).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          userStyle: 'trendy'
        })
      );
    });

    test('should map party to trendy style', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await request(app)
        .post('/api/outfits/event')
        .send({
          date: tomorrow.toISOString().split('T')[0],
          city: 'New York',
          occasion: 'party'
        });

      expect(outfitGenerator.generateOutfits).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          userStyle: 'trendy'
        })
      );
    });

    test('should default to casual for unknown occasions', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await request(app)
        .post('/api/outfits/event')
        .send({
          date: tomorrow.toISOString().split('T')[0],
          city: 'New York',
          occasion: 'unknown-event'
        });

      expect(outfitGenerator.generateOutfits).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          userStyle: 'casual'
        })
      );
    });
  });

  describe('POST /api/outfits/event - Response Format', () => {
    test('should include event details in response', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/outfits/event')
        .send({
          date: tomorrow.toISOString().split('T')[0],
          city: 'New York',
          occasion: 'wedding'
        });

      expect(response.body.data.event).toMatchObject({
        occasion: 'wedding',
        location: 'New York'
      });
      expect(response.body.data.event.date).toBeDefined();
      expect(response.body.data.event.daysUntil).toBeDefined();
    });

    test('should include weather information', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/outfits/event')
        .send({
          date: tomorrow.toISOString().split('T')[0],
          city: 'New York',
          occasion: 'wedding'
        });

      expect(response.body.data.weather).toMatchObject({
        temperature: expect.any(Object),
        condition: expect.any(Object)
      });
    });

    test('should include recommendations with scores', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/outfits/event')
        .send({
          date: tomorrow.toISOString().split('T')[0],
          city: 'New York',
          occasion: 'wedding'
        });

      expect(response.body.data.recommendations).toHaveLength(1);
      expect(response.body.data.recommendations[0]).toMatchObject({
        rank: 1,
        items: expect.any(Array),
        score: expect.objectContaining({
          overall: expect.any(Number),
          colorHarmony: expect.any(Number),
          styleCoherence: expect.any(Number),
          occasionFit: expect.any(Number)
        }),
        reasoning: expect.any(Array)
      });
    });

    test('should include helpful tips', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/outfits/event')
        .send({
          date: tomorrow.toISOString().split('T')[0],
          city: 'New York',
          occasion: 'wedding'
        });

      expect(response.body.data.tips).toBeDefined();
      expect(Array.isArray(response.body.data.tips)).toBe(true);
      expect(response.body.data.tips.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/outfits/event - Error Handling', () => {
    test('should handle weather service errors', async () => {
      weatherService.getCurrentWeather.mockRejectedValue(new Error('Weather API failed'));
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/outfits/event')
        .send({
          date: tomorrow.toISOString().split('T')[0],
          city: 'InvalidCity',
          occasion: 'wedding'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Failed to get weather data');
    });

    test('should return 404 when no suitable outfits found', async () => {
      outfitGenerator.generateOutfits.mockResolvedValue([]);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/outfits/event')
        .send({
          date: tomorrow.toISOString().split('T')[0],
          city: 'New York',
          occasion: 'wedding'
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Could not generate outfits');
      expect(response.body.suggestion).toBeDefined();
    });

    test('should handle unexpected errors', async () => {
      outfitGenerator.generateOutfits.mockRejectedValue(new Error('Unexpected error'));
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/outfits/event')
        .send({
          date: tomorrow.toISOString().split('T')[0],
          city: 'New York',
          occasion: 'wedding'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/outfits/event - Event-Specific Tips', () => {
    test('should include wedding-specific tips', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/outfits/event')
        .send({
          date: tomorrow.toISOString().split('T')[0],
          city: 'New York',
          occasion: 'wedding'
        });

      expect(response.body.data.tips.some(tip => 
        tip.toLowerCase().includes('white')
      )).toBe(true);
    });

    test('should include interview-specific tips', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/outfits/event')
        .send({
          date: tomorrow.toISOString().split('T')[0],
          city: 'New York',
          occasion: 'interview'
        });

      expect(response.body.data.tips.some(tip => 
        tip.toLowerCase().includes('conservative') || tip.toLowerCase().includes('pressed')
      )).toBe(true);
    });

    test('should include weather-based tips for cold weather', async () => {
      const coldWeather = {
        location: { city: 'Boston', region: 'MA', country: 'US' },
        current: {
          temperature: { value: 35, feelsLike: 30, category: 'cold' },
          condition: { description: 'Clear', icon: 'clear' }
        }
      };
      weatherService.getCurrentWeather.mockResolvedValue(coldWeather);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/outfits/event')
        .send({
          date: tomorrow.toISOString().split('T')[0],
          city: 'Boston',
          occasion: 'meeting'
        });

      expect(response.body.data.tips.some(tip => 
        tip.toLowerCase().includes('layer') || tip.toLowerCase().includes('cold')
      )).toBe(true);
    });

    test('should include weather-based tips for hot weather', async () => {
      const hotWeather = {
        location: { city: 'Miami', region: 'FL', country: 'US' },
        current: {
          temperature: { value: 90, feelsLike: 95, category: 'hot' },
          condition: { description: 'Sunny', icon: 'sunny' }
        }
      };
      weatherService.getCurrentWeather.mockResolvedValue(hotWeather);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/outfits/event')
        .send({
          date: tomorrow.toISOString().split('T')[0],
          city: 'Miami',
          occasion: 'party'
        });

      expect(response.body.data.tips.some(tip => 
        tip.toLowerCase().includes('breathable')
      )).toBe(true);
    });

    test('should include time-based tip for tomorrow', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/outfits/event')
        .send({
          date: tomorrow.toISOString().split('T')[0],
          city: 'New York',
          occasion: 'interview'
        });

      expect(response.body.data.tips.some(tip => 
        tip.toLowerCase().includes('tomorrow')
      )).toBe(true);
    });

    test('should include time-based tip for today', async () => {
      const today = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/outfits/event')
        .send({
          date: today,
          city: 'New York',
          occasion: 'meeting'
        });

      expect(response.body.data.tips.some(tip => 
        tip.toLowerCase().includes('today')
      )).toBe(true);
    });
  });
});
