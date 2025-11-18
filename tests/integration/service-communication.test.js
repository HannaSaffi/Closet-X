const request = require('supertest');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const WARDROBE_SERVICE_URL = process.env.WARDROBE_SERVICE_URL || 'http://localhost:3003';
const OUTFIT_SERVICE_URL = process.env.OUTFIT_SERVICE_URL || 'http://localhost:3002';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

describe('Service-to-Service Integration Tests', () => {
  let authToken;
  let userId;

  describe('User Registration and Authentication Flow', () => {
    test('should register user and receive token', async () => {
      const response = await request(USER_SERVICE_URL)
        .post('/api/auth/register')
        .send({
          email: `integration-test-${Date.now()}@example.com`,
          password: 'SecurePass123!',
          name: 'Integration Test User'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      
      authToken = response.body.data.token;
      userId = response.body.data.user.id;
    });
  });

  describe('Wardrobe Service with Authentication', () => {
    test('should add clothing item with valid token', async () => {
      const response = await request(WARDROBE_SERVICE_URL)
        .post('/api/wardrobe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category: 'tops',
          color: { primary: 'blue', secondary: 'white' },
          season: ['summer', 'spring']
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should reject request without authentication', async () => {
      const response = await request(WARDROBE_SERVICE_URL)
        .post('/api/wardrobe')
        .send({
          category: 'tops',
          color: { primary: 'red' }
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Complete "What Should I Wear Today" Workflow', () => {
    let wardrobeItems = [];

    beforeAll(async () => {
      // Add multiple clothing items
      const items = [
        { category: 'tops', color: { primary: 'blue' }, season: ['summer'] },
        { category: 'bottoms', color: { primary: 'black' }, season: ['all-season'] },
        { category: 'shoes', color: { primary: 'white' }, season: ['summer'] }
      ];

      for (const item of items) {
        const response = await request(WARDROBE_SERVICE_URL)
          .post('/api/wardrobe')
          .set('Authorization', `Bearer ${authToken}`)
          .send(item);
        
        wardrobeItems.push(response.body.data._id);
      }
    });

    test('should generate outfit recommendation', async () => {
      const response = await request(OUTFIT_SERVICE_URL)
        .post('/api/outfits/what-to-wear-today')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          location: 'East Hartford,CT,US',
          occasion: 'casual'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('weather');
      expect(response.body).toHaveProperty('outfits');
      expect(Array.isArray(response.body.outfits)).toBe(true);
    });

    test('should get fashion advice from AI service', async () => {
      const response = await request(AI_SERVICE_URL)
        .post('/api/ai/fashion-advice')
        .send({
          user_id: userId,
          question: 'What should I wear for a summer picnic?',
          context: { weather: '75°F, sunny', occasion: 'casual' }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('advice');
      expect(response.body).toHaveProperty('suggestions');
    });
  });

  describe('Service Health Checks', () => {
    test('all services should be healthy', async () => {
      const services = [
        { name: 'User Service', url: USER_SERVICE_URL },
        { name: 'Wardrobe Service', url: WARDROBE_SERVICE_URL },
        { name: 'Outfit Service', url: OUTFIT_SERVICE_URL },
        { name: 'AI Service', url: AI_SERVICE_URL }
      ];

      for (const service of services) {
        const response = await request(service.url).get('/health');
        expect(response.status).toBe(200);
        expect(response.body.status).toMatch(/healthy|alive/i);
      }
    });
  });
});
