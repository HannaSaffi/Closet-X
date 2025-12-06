const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const ClothingItem = require('../src/models/ClothingItem');

// Create Express app for testing
const app = express();
app.use(express.json());

// Mock authentication middleware
const mockAuthMiddleware = (req, res, next) => {
  req.user = { userId: 'test-user-id', email: 'test@example.com' };
  next();
};

// Import controller
const analyticsController = require('../src/controllers/analyticsController');

// Set up routes
app.get('/api/analytics/stats', mockAuthMiddleware, analyticsController.getWardrobeStats);
app.get('/api/analytics/color-analysis', mockAuthMiddleware, analyticsController.getColorAnalysis);
app.get('/api/analytics/wear-frequency', mockAuthMiddleware, analyticsController.getWearFrequency);
app.get('/api/analytics/recommendations', mockAuthMiddleware, analyticsController.getRecommendations);

describe('Analytics Controller', () => {
  let mockClothingItems;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/closetx_wardrobe_test?directConnection=true';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await ClothingItem.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear database
    await ClothingItem.deleteMany({});

    // Create test clothing items
    mockClothingItems = await ClothingItem.insertMany([
      {
        userId: 'test-user-id',
        category: 'tops',
        subcategory: 'shirt',
        color: { primary: 'blue', secondary: ['white'] },
        brand: 'Nike',
        season: ['spring', 'summer'],
        style: 'casual',
        wearCount: 10,
        lastWorn: new Date('2024-11-01')
      },
      {
        userId: 'test-user-id',
        category: 'tops',
        subcategory: 't-shirt',
        color: { primary: 'black', secondary: [] },
        brand: 'Adidas',
        season: ['all-season'],
        style: 'casual',
        wearCount: 15,
        lastWorn: new Date('2024-11-15')
      },
      {
        userId: 'test-user-id',
        category: 'bottoms',
        subcategory: 'jeans',
        color: { primary: 'black', secondary: [] },
        brand: 'Levis',
        season: ['all-season'],
        style: 'casual',
        wearCount: 20,
        lastWorn: new Date('2024-11-20')
      },
      {
        userId: 'test-user-id',
        category: 'shoes',
        subcategory: 'sneakers',
        color: { primary: 'white', secondary: [] },
        brand: 'Nike',
        season: ['all-season'],
        style: 'casual',
        wearCount: 25,
        lastWorn: new Date('2024-11-25')
      },
      {
        userId: 'test-user-id',
        category: 'outerwear',
        subcategory: 'jacket',
        color: { primary: 'navy', secondary: [] },
        brand: 'North Face',
        season: ['fall', 'winter'],
        style: 'casual',
        wearCount: 5,
        lastWorn: new Date('2024-10-15')
      },
      {
        userId: 'test-user-id',
        category: 'dresses',
        subcategory: 'cocktail-dress',
        color: { primary: 'red', secondary: [] },
        brand: 'Zara',
        season: ['summer'],
        style: 'formal',
        wearCount: 2,
        lastWorn: new Date('2024-09-01')
      }
    ]);
  });

  describe('GET /api/analytics/stats - Wardrobe Statistics', () => {
    test('should return comprehensive wardrobe statistics', async () => {
      const response = await request(app).get('/api/analytics/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalItems');
      expect(response.body.data).toHaveProperty('byCategory');
      expect(response.body.data).toHaveProperty('byColor');
      expect(response.body.data).toHaveProperty('bySeason');
    });

    test('should count total items correctly', async () => {
      const response = await request(app).get('/api/analytics/stats');

      expect(response.body.data.totalItems).toBe(6);
    });

    test('should group items by category', async () => {
      const response = await request(app).get('/api/analytics/stats');

      const byCategory = response.body.data.byCategory;
      expect(byCategory.tops).toBe(2);
      expect(byCategory.bottoms).toBe(1);
      expect(byCategory.shoes).toBe(1);
      expect(byCategory.outerwear).toBe(1);
      expect(byCategory.dresses).toBe(1);
    });

    test('should group items by primary color', async () => {
      const response = await request(app).get('/api/analytics/stats');

      const byColor = response.body.data.byColor;
      expect(byColor.black).toBe(2);
      expect(byColor.blue).toBe(1);
      expect(byColor.white).toBe(1);
      expect(byColor.navy).toBe(1);
      expect(byColor.red).toBe(1);
    });

    test('should group items by season', async () => {
      const response = await request(app).get('/api/analytics/stats');

      const bySeason = response.body.data.bySeason;
      expect(bySeason['all-season']).toBeGreaterThan(0);
      expect(bySeason.summer).toBeGreaterThan(0);
    });

    test('should include most worn items', async () => {
      const response = await request(app).get('/api/analytics/stats');

      expect(response.body.data.mostWorn).toBeDefined();
      expect(Array.isArray(response.body.data.mostWorn)).toBe(true);
      
      if (response.body.data.mostWorn.length > 0) {
        const topItem = response.body.data.mostWorn[0];
        expect(topItem).toHaveProperty('item');
        expect(topItem).toHaveProperty('count');
        expect(topItem.count).toBe(25); // White sneakers
      }
    });

    test('should include least worn items', async () => {
      const response = await request(app).get('/api/analytics/stats');

      expect(response.body.data.leastWorn).toBeDefined();
      expect(Array.isArray(response.body.data.leastWorn)).toBe(true);
      
      if (response.body.data.leastWorn.length > 0) {
        const leastItem = response.body.data.leastWorn[0];
        expect(leastItem).toHaveProperty('item');
        expect(leastItem).toHaveProperty('count');
        expect(leastItem.count).toBeLessThanOrEqual(5);
      }
    });

    test('should return empty stats for user with no items', async () => {
      // Delete all items
      await ClothingItem.deleteMany({});

      const response = await request(app).get('/api/analytics/stats');

      expect(response.status).toBe(200);
      expect(response.body.data.totalItems).toBe(0);
      expect(response.body.data.byCategory).toEqual({});
    });

    test('should only return stats for authenticated user', async () => {
      // Add items for another user
      await ClothingItem.create({
        userId: 'other-user-id',
        category: 'tops',
        subcategory: 'shirt',
        color: { primary: 'green' },
        wearCount: 30
      });

      const response = await request(app).get('/api/analytics/stats');

      // Should still only return 6 items (not including the other user's item)
      expect(response.body.data.totalItems).toBe(6);
    });
  });

  describe('GET /api/analytics/color-analysis - Color Analysis', () => {
    test('should return color distribution analysis', async () => {
      const response = await request(app).get('/api/analytics/color-analysis');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('colorDistribution');
      expect(response.body.data).toHaveProperty('dominantColors');
    });

    test('should identify dominant colors', async () => {
      const response = await request(app).get('/api/analytics/color-analysis');

      const dominant = response.body.data.dominantColors;
      expect(Array.isArray(dominant)).toBe(true);
      expect(dominant.length).toBeGreaterThan(0);
      expect(dominant[0]).toHaveProperty('color');
      expect(dominant[0]).toHaveProperty('count');
      expect(dominant[0]).toHaveProperty('percentage');
    });

    test('should include color recommendations', async () => {
      const response = await request(app).get('/api/analytics/color-analysis');

      expect(response.body.data.recommendations).toBeDefined();
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });

    test('should suggest complementary colors', async () => {
      const response = await request(app).get('/api/analytics/color-analysis');

      expect(response.body.data.complementaryColors).toBeDefined();
      expect(Array.isArray(response.body.data.complementaryColors)).toBe(true);
    });

    test('should calculate color diversity score', async () => {
      const response = await request(app).get('/api/analytics/color-analysis');

      expect(response.body.data.diversityScore).toBeDefined();
      expect(typeof response.body.data.diversityScore).toBe('number');
      expect(response.body.data.diversityScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.diversityScore).toBeLessThanOrEqual(100);
    });
  });

  describe('GET /api/analytics/wear-frequency - Wear Frequency', () => {
    test('should return wear frequency analysis', async () => {
      const response = await request(app).get('/api/analytics/wear-frequency');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('byItem');
    });

    test('should sort items by wear count', async () => {
      const response = await request(app).get('/api/analytics/wear-frequency');

      const items = response.body.data.byItem;
      expect(Array.isArray(items)).toBe(true);
      
      // Check if sorted in descending order
      for (let i = 0; i < items.length - 1; i++) {
        expect(items[i].wearCount).toBeGreaterThanOrEqual(items[i + 1].wearCount);
      }
    });

    test('should identify underutilized items', async () => {
      const response = await request(app).get('/api/analytics/wear-frequency');

      expect(response.body.data.underutilized).toBeDefined();
      expect(Array.isArray(response.body.data.underutilized)).toBe(true);
      
      // Items with low wear count should be in this list
      if (response.body.data.underutilized.length > 0) {
        const underused = response.body.data.underutilized[0];
        expect(underused.wearCount).toBeLessThanOrEqual(5);
      }
    });

    test('should include last worn dates', async () => {
      const response = await request(app).get('/api/analytics/wear-frequency');

      const items = response.body.data.byItem;
      items.forEach(item => {
        expect(item).toHaveProperty('lastWorn');
      });
    });

    test('should calculate average wear count', async () => {
      const response = await request(app).get('/api/analytics/wear-frequency');

      expect(response.body.data.averageWearCount).toBeDefined();
      expect(typeof response.body.data.averageWearCount).toBe('number');
      
      // Should be approximately (10+15+20+25+5+2)/6 = 12.83
      expect(response.body.data.averageWearCount).toBeCloseTo(12.83, 0);
    });

    test('should filter by time period if specified', async () => {
      const response = await request(app)
        .get('/api/analytics/wear-frequency')
        .query({ period: '30days' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/analytics/recommendations - Wardrobe Recommendations', () => {
    test('should return personalized recommendations', async () => {
      const response = await request(app).get('/api/analytics/recommendations');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('missingCategories');
      expect(response.body.data).toHaveProperty('suggestions');
    });

    test('should identify missing categories', async () => {
      const response = await request(app).get('/api/analytics/recommendations');

      expect(response.body.data.missingCategories).toBeDefined();
      expect(Array.isArray(response.body.data.missingCategories)).toBe(true);
    });

    test('should suggest items to add', async () => {
      const response = await request(app).get('/api/analytics/recommendations');

      expect(response.body.data.suggestions).toBeDefined();
      expect(Array.isArray(response.body.data.suggestions)).toBe(true);
      
      if (response.body.data.suggestions.length > 0) {
        const suggestion = response.body.data.suggestions[0];
        expect(suggestion).toHaveProperty('item');
        expect(suggestion).toHaveProperty('reason');
      }
    });

    test('should recommend versatile colors', async () => {
      const response = await request(app).get('/api/analytics/recommendations');

      expect(response.body.data.versatileColors).toBeDefined();
      expect(Array.isArray(response.body.data.versatileColors)).toBe(true);
    });

    test('should suggest items to declutter', async () => {
      const response = await request(app).get('/api/analytics/recommendations');

      expect(response.body.data.declutterSuggestions).toBeDefined();
      expect(Array.isArray(response.body.data.declutterSuggestions)).toBe(true);
    });

    test('should include wardrobe health score', async () => {
      const response = await request(app).get('/api/analytics/recommendations');

      expect(response.body.data.wardrobeHealthScore).toBeDefined();
      expect(typeof response.body.data.wardrobeHealthScore).toBe('number');
      expect(response.body.data.wardrobeHealthScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.wardrobeHealthScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Close connection to simulate error
      await mongoose.connection.close();

      const response = await request(app).get('/api/analytics/stats');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);

      // Reconnect for other tests
      const mongoUri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/closetx_wardrobe_test?directConnection=true';
      await mongoose.connect(mongoUri);
    });

    test('should handle missing user ID', async () => {
      // Create app without auth middleware
      const testApp = express();
      testApp.use(express.json());
      testApp.get('/test', (req, res, next) => {
        req.user = null;
        next();
      }, analyticsController.getWardrobeStats);

      const response = await request(testApp).get('/test');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Edge Cases', () => {
    test('should handle wardrobe with single item', async () => {
      await ClothingItem.deleteMany({});
      await ClothingItem.create({
        userId: 'test-user-id',
        category: 'tops',
        subcategory: 'shirt',
        color: { primary: 'blue' },
        wearCount: 1
      });

      const response = await request(app).get('/api/analytics/stats');

      expect(response.status).toBe(200);
      expect(response.body.data.totalItems).toBe(1);
    });

    test('should handle items with zero wear count', async () => {
      await ClothingItem.create({
        userId: 'test-user-id',
        category: 'tops',
        subcategory: 'shirt',
        color: { primary: 'yellow' },
        wearCount: 0
      });

      const response = await request(app).get('/api/analytics/wear-frequency');

      expect(response.status).toBe(200);
      const items = response.body.data.byItem;
      const zeroWearItem = items.find(item => item.wearCount === 0);
      expect(zeroWearItem).toBeDefined();
    });

    test('should handle items without lastWorn date', async () => {
      await ClothingItem.create({
        userId: 'test-user-id',
        category: 'tops',
        subcategory: 'shirt',
        color: { primary: 'purple' },
        wearCount: 5
        // No lastWorn field
      });

      const response = await request(app).get('/api/analytics/wear-frequency');

      expect(response.status).toBe(200);
    });

    test('should handle items with multiple seasons', async () => {
      const response = await request(app).get('/api/analytics/stats');

      expect(response.status).toBe(200);
      expect(response.body.data.bySeason).toBeDefined();
    });
  });

  describe('Performance', () => {
    test('should handle large wardrobe efficiently', async () => {
      // Add 100 more items
      const bulkItems = [];
      for (let i = 0; i < 100; i++) {
        bulkItems.push({
          userId: 'test-user-id',
          category: ['tops', 'bottoms', 'shoes'][i % 3],
          subcategory: 'item',
          color: { primary: ['red', 'blue', 'green', 'black'][i % 4] },
          wearCount: i
        });
      }
      await ClothingItem.insertMany(bulkItems);

      const startTime = Date.now();
      const response = await request(app).get('/api/analytics/stats');
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(response.body.data.totalItems).toBe(106); // 6 original + 100 new
      
      // Should complete in reasonable time (< 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });
});
