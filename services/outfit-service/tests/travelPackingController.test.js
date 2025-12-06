const request = require('supertest');
const express = require('express');
const axios = require('axios');
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
const travelPackingController = require('../src/controllers/travelPackingController');

// Set up route
app.post('/api/outfits/travel-plan', mockAuthMiddleware, travelPackingController.getTravelPackingPlan);

// Mock external services
jest.mock('axios');
jest.mock('../src/services/weatherService');
jest.mock('../src/services/outfitGenerator');

describe('Travel Packing Controller', () => {
  const mockWeatherForecast = [
    {
      temperature: { value: 72, category: 'comfortable' },
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

  const mockWardrobeItems = [
    {
      _id: 'item1',
      category: 'tops',
      subcategory: 'shirt',
      color: { primary: 'blue' },
      season: ['spring', 'summer'],
      wearCount: 10,
      imageURL: 'http://example.com/shirt.jpg'
    },
    {
      _id: 'item2',
      category: 'bottoms',
      subcategory: 'jeans',
      color: { primary: 'black' },
      season: ['all-season'],
      wearCount: 15,
      imageURL: 'http://example.com/jeans.jpg'
    },
    {
      _id: 'item3',
      category: 'shoes',
      subcategory: 'sneakers',
      color: { primary: 'white' },
      season: ['all-season'],
      wearCount: 20,
      imageURL: 'http://example.com/shoes.jpg'
    },
    {
      _id: 'item4',
      category: 'outerwear',
      subcategory: 'jacket',
      color: { primary: 'navy' },
      season: ['fall', 'winter'],
      wearCount: 5,
      imageURL: 'http://example.com/jacket.jpg'
    }
  ];

  const mockOutfit = {
    items: mockWardrobeItems.slice(0, 3),
    colors: ['blue', 'black', 'white'],
    styles: ['casual', 'casual', 'casual'],
    score: 85
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    weatherService.getWeatherForecast.mockResolvedValue(mockWeatherForecast);
    outfitGenerator.generateOutfits.mockResolvedValue([mockOutfit]);
    
    axios.get.mockResolvedValue({
      data: { data: mockWardrobeItems }
    });
  });

  describe('POST /api/outfits/travel-plan - Validation', () => {
    test('should return 400 when destination is missing', async () => {
      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({ startDate: '2024-12-20', endDate: '2024-12-27' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required fields');
    });

    test('should return 400 when startDate is missing', async () => {
      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({ destination: 'Paris', endDate: '2024-12-27' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 when endDate is missing', async () => {
      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({ destination: 'Paris', startDate: '2024-12-20' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Paris',
          startDate: 'invalid-date',
          endDate: '2024-12-27'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid date format');
    });

    test('should return 400 when end date is before start date', async () => {
      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Paris',
          startDate: '2024-12-27',
          endDate: '2024-12-20'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('End date must be after start date');
    });

    test('should return 400 when trip duration exceeds 30 days', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 35);

      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Paris',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('cannot exceed 30 days');
    });
  });

  describe('POST /api/outfits/travel-plan - Success Cases', () => {
    test('should generate packing plan for valid trip', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);

      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Paris',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.trip).toBeDefined();
      expect(response.body.data.packingList).toBeDefined();
    });

    test('should include trip details in response', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);

      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'London',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          activities: ['sightseeing', 'dining']
        });

      expect(response.body.data.trip).toMatchObject({
        destination: 'London',
        duration: '7 days',
        activities: ['sightseeing', 'dining']
      });
      expect(response.body.data.trip.startDate).toBeDefined();
      expect(response.body.data.trip.endDate).toBeDefined();
    });

    test('should fetch weather forecast for destination', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 3);

      await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Tokyo',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      expect(weatherService.getWeatherForecast).toHaveBeenCalledWith('Tokyo');
    });

    test('should fetch user wardrobe items', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 3);

      await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Paris',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/wardrobe'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' }
        })
      );
    });

    test('should handle optional activities parameter', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 3);

      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Paris',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      expect(response.status).toBe(200);
      expect(response.body.data.trip.activities).toEqual(['general travel']);
    });
  });

  describe('POST /api/outfits/travel-plan - Packing List Generation', () => {
    test('should generate packing list with must-pack items', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 3);

      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Paris',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      expect(response.body.data.packingList.mustPack).toBeDefined();
      expect(Array.isArray(response.body.data.packingList.mustPack)).toBe(true);
      expect(response.body.data.packingList.summary).toBeDefined();
    });

    test('should include item details in packing list', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 3);

      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Paris',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      if (response.body.data.packingList.mustPack.length > 0) {
        const item = response.body.data.packingList.mustPack[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('category');
        expect(item).toHaveProperty('versatility');
      }
    });

    test('should recommend business items for business activities', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 3);

      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Paris',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          activities: ['business', 'meeting']
        });

      expect(response.body.data.packingList.recommended).toBeDefined();
      const recommendations = response.body.data.packingList.recommended;
      expect(recommendations.some(item => 
        item.toLowerCase().includes('formal') || item.toLowerCase().includes('dress')
      )).toBe(true);
    });

    test('should recommend cold weather items when needed', async () => {
      const coldForecast = [
        {
          temperature: { value: 35, category: 'cold' },
          condition: { description: 'Cold' }
        },
        {
          temperature: { value: 40, category: 'cold' },
          condition: { description: 'Chilly' }
        }
      ];
      weatherService.getWeatherForecast.mockResolvedValue(coldForecast);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 2);

      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Oslo',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      const essentials = response.body.data.packingList.recommended;
      expect(essentials.some(item => 
        item.toLowerCase().includes('jacket') || item.toLowerCase().includes('layer')
      )).toBe(true);
    });
  });

  describe('POST /api/outfits/travel-plan - Daily Outfits', () => {
    test('should generate daily outfit suggestions', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 3);

      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Paris',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      expect(response.body.data.dailyOutfits).toBeDefined();
      expect(Array.isArray(response.body.data.dailyOutfits)).toBe(true);
    });

    test('should include weather info for each day', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 3);

      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Paris',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      if (response.body.data.dailyOutfits.length > 0) {
        const day = response.body.data.dailyOutfits[0];
        expect(day).toHaveProperty('day');
        expect(day).toHaveProperty('date');
        expect(day).toHaveProperty('weather');
        expect(day).toHaveProperty('outfit');
      }
    });

    test('should limit daily outfits to 7 days', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 10); // 10 day trip

      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Paris',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      expect(response.body.data.dailyOutfits.length).toBeLessThanOrEqual(7);
    });
  });

  describe('POST /api/outfits/travel-plan - Weather Analysis', () => {
    test('should include weather forecast in response', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 3);

      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Paris',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      expect(response.body.data.weather).toBeDefined();
      expect(response.body.data.weather.forecast).toBeDefined();
      expect(response.body.data.weather.analysis).toBeDefined();
    });

    test('should analyze weather patterns', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 3);

      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Paris',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      const analysis = response.body.data.weather.analysis;
      expect(analysis).toHaveProperty('average');
      expect(analysis).toHaveProperty('range');
      expect(analysis).toHaveProperty('conditions');
    });

    test('should handle missing weather forecast gracefully', async () => {
      weatherService.getWeatherForecast.mockRejectedValue(new Error('Weather API failed'));

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 3);

      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Paris',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      // Should still return success even without weather
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/outfits/travel-plan - Travel Tips', () => {
    test('should include travel tips', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 3);

      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Paris',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      expect(response.body.data.tips).toBeDefined();
      expect(Array.isArray(response.body.data.tips)).toBe(true);
      expect(response.body.data.tips.length).toBeGreaterThan(0);
    });

    test('should recommend laundry for long trips', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 10); // 10 day trip

      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Paris',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      expect(response.body.data.tips.some(tip => 
        tip.toLowerCase().includes('laundry')
      )).toBe(true);
    });

    test('should recommend layers for variable weather', async () => {
      const variableForecast = [
        { temperature: { value: 50, category: 'cool' }, condition: { description: 'Cool' } },
        { temperature: { value: 75, category: 'warm' }, condition: { description: 'Warm' } }
      ];
      weatherService.getWeatherForecast.mockResolvedValue(variableForecast);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 2);

      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Paris',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      expect(response.body.data.tips.some(tip => 
        tip.toLowerCase().includes('layer')
      )).toBe(true);
    });
  });

  describe('POST /api/outfits/travel-plan - Error Handling', () => {
    test('should return 404 when wardrobe is empty', async () => {
      axios.get.mockResolvedValue({ data: { data: [] } });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 3);

      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Paris',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('wardrobe is empty');
    });

    test('should handle wardrobe service errors', async () => {
      axios.get.mockRejectedValue(new Error('Wardrobe service unavailable'));

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 3);

      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Paris',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('Failed to fetch wardrobe');
    });

    test('should handle unexpected errors gracefully', async () => {
      outfitGenerator.generateOutfits.mockRejectedValue(new Error('Unexpected error'));

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 3);

      const response = await request(app)
        .post('/api/outfits/travel-plan')
        .set('Authorization', 'Bearer test-token')
        .send({
          destination: 'Paris',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});
