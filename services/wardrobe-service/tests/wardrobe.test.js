const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/index');
const Clothing = require('../src/models/Clothing');

// Mock authentication middleware
jest.mock('../src/middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { userId: 'test-user-123' };
    next();
  }
}));

describe('Wardrobe Service - Clothing Management', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/closetx_wardrobe_test';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await Clothing.deleteMany({});
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await Clothing.deleteMany({});
  });

  describe('POST /api/wardrobe', () => {
    test('should create new clothing item', async () => {
      const clothingData = {
        category: 'tops',
        color: { primary: 'blue', secondary: 'white' },
        season: ['summer', 'spring'],
        brand: 'Nike'
      };

      const response = await request(app)
        .post('/api/wardrobe')
        .set('Authorization', 'Bearer mock-token')
        .send(clothingData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('tops');
      expect(response.body.data.userId).toBe('test-user-123');
    });

    test('should reject invalid category', async () => {
      const response = await request(app)
        .post('/api/wardrobe')
        .set('Authorization', 'Bearer mock-token')
        .send({
          category: 'invalid-category',
          color: { primary: 'blue' }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/wardrobe', () => {
    beforeEach(async () => {
      await Clothing.create([
        {
          userId: 'test-user-123',
          category: 'tops',
          color: { primary: 'blue' },
          season: ['summer']
        },
        {
          userId: 'test-user-123',
          category: 'bottoms',
          color: { primary: 'black' },
          season: ['all-season']
        },
        {
          userId: 'different-user',
          category: 'tops',
          color: { primary: 'red' },
          season: ['winter']
        }
      ]);
    });

    test('should get all clothing items for user', async () => {
      const response = await request(app)
        .get('/api/wardrobe')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.data).toHaveLength(2);
    });

    test('should filter by category', async () => {
      const response = await request(app)
        .get('/api/wardrobe?category=tops')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('tops');
    });

    test('should filter by season', async () => {
      const response = await request(app)
        .get('/api/wardrobe?season=summer')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].season).toContain('summer');
    });
  });

  describe('GET /api/wardrobe/stats', () => {
    beforeEach(async () => {
      await Clothing.create([
        { userId: 'test-user-123', category: 'tops', color: { primary: 'blue' } },
        { userId: 'test-user-123', category: 'tops', color: { primary: 'red' } },
        { userId: 'test-user-123', category: 'bottoms', color: { primary: 'black' } }
      ]);
    });

    test('should return wardrobe statistics', async () => {
      const response = await request(app)
        .get('/api/wardrobe/stats')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalItems).toBe(3);
      expect(response.body.data.byCategory.tops).toBe(2);
      expect(response.body.data.byCategory.bottoms).toBe(1);
    });
  });

  describe('DELETE /api/wardrobe/:id', () => {
    let itemId;

    beforeEach(async () => {
      const item = await Clothing.create({
        userId: 'test-user-123',
        category: 'tops',
        color: { primary: 'blue' }
      });
      itemId = item._id;
    });

    test('should delete clothing item', async () => {
      const response = await request(app)
        .delete(`/api/wardrobe/${itemId}`)
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const deleted = await Clothing.findById(itemId);
      expect(deleted).toBeNull();
    });

    test('should return 404 for non-existent item', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/wardrobe/${fakeId}`)
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(404);
    });
  });
});
