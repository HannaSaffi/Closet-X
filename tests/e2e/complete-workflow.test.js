const request = require('supertest');

const USER_SERVICE = 'http://localhost:3001';
const WARDROBE_SERVICE = 'http://localhost:3003';
const OUTFIT_SERVICE = 'http://localhost:3002';
const AI_SERVICE = 'http://localhost:5001';

describe('E2E: Complete User Journey', () => {
  let token;
  let userId;
  let clothingItems = [];

  test('Step 1: User registers account', async () => {
    const response = await request(USER_SERVICE)
      .post('/api/auth/register')
      .send({
        email: `e2e-${Date.now()}@closetx.com`,
        password: 'E2ETest123!',
        name: 'E2E Test User'
      });

    expect(response.status).toBe(201);
    token = response.body.data.token;
    userId = response.body.data.user.id;
  });

  test('Step 2: User uploads clothing photos', async () => {
    const items = [
      { category: 'tops', color: { primary: 'navy' }, season: ['fall', 'spring'] },
      { category: 'tops', color: { primary: 'white' }, season: ['summer'] },
      { category: 'bottoms', color: { primary: 'khaki' }, season: ['spring', 'summer'] },
      { category: 'bottoms', color: { primary: 'black' }, season: ['all-season'] },
      { category: 'shoes', color: { primary: 'brown' }, season: ['fall', 'spring'] }
    ];

    for (const item of items) {
      const response = await request(WARDROBE_SERVICE)
        .post('/api/wardrobe')
        .set('Authorization', `Bearer ${token}`)
        .send(item);

      expect(response.status).toBe(201);
      clothingItems.push(response.body.data);
    }

    expect(clothingItems).toHaveLength(5);
  });

  test('Step 3: User views wardrobe', async () => {
    const response = await request(WARDROBE_SERVICE)
      .get('/api/wardrobe')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.count).toBeGreaterThanOrEqual(5);
  });

  test('Step 4: User checks wardrobe stats', async () => {
    const response = await request(WARDROBE_SERVICE)
      .get('/api/wardrobe/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.totalItems).toBeGreaterThanOrEqual(5);
    expect(response.body.data.byCategory).toBeDefined();
  });

  test('Step 5: User asks "What should I wear today?"', async () => {
    const response = await request(OUTFIT_SERVICE)
      .post('/api/outfits/what-to-wear-today')
      .set('Authorization', `Bearer ${token}`)
      .send({
        location: 'East Hartford,CT,US',
        occasion: 'casual'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.weather).toBeDefined();
    expect(response.body.outfits).toBeDefined();
    expect(response.body.outfits.length).toBeGreaterThan(0);

    // Verify outfit structure
    const outfit = response.body.outfits[0];
    expect(outfit).toHaveProperty('items');
    expect(outfit).toHaveProperty('score');
    expect(outfit).toHaveProperty('reasoning');
    expect(Array.isArray(outfit.items)).toBe(true);
  });

  test('Step 6: User gets AI fashion advice', async () => {
    const response = await request(AI_SERVICE)
      .post('/api/ai/fashion-advice')
      .send({
        user_id: userId,
        question: 'How can I style my navy shirt?',
        context: { season: 'spring' }
      });

    expect(response.status).toBe(200);
    expect(response.body.advice).toBeDefined();
    expect(response.body.suggestions).toBeDefined();
  });

  test('Step 7: User checks fashion trends', async () => {
    const response = await request(AI_SERVICE)
      .get('/api/ai/trends');

    expect(response.status).toBe(200);
    expect(response.body.trending_colors).toBeDefined();
    expect(response.body.trending_styles).toBeDefined();
  });

  test('Step 8: User filters wardrobe by category', async () => {
    const response = await request(WARDROBE_SERVICE)
      .get('/api/wardrobe?category=tops')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.every(item => item.category === 'tops')).toBe(true);
  });

  test('Step 9: User deletes a clothing item', async () => {
    const itemToDelete = clothingItems[0]._id;
    
    const response = await request(WARDROBE_SERVICE)
      .delete(`/api/wardrobe/${itemToDelete}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('Step 10: Verify item was deleted', async () => {
    const response = await request(WARDROBE_SERVICE)
      .get('/api/wardrobe')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(clothingItems.length - 1);
  });
});
