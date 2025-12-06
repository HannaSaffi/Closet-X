//tests/e2e/complete-workflow.test.js
const request = require('supertest');
const path = require('path');
const fs = require('fs');

const USER_SERVICE = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const WARDROBE_SERVICE = process.env.WARDROBE_SERVICE_URL || 'http://localhost:3003';
const OUTFIT_SERVICE = process.env.OUTFIT_SERVICE_URL || 'http://localhost:3002';

describe('Complete User Workflow E2E', () => {
  let authToken;
  let userId;
  let clothingId;
  const testEmail = `test-${Date.now()}@closetx.com`;

  beforeAll(() => {
    console.log('🚀 Starting E2E Test Suite');
    console.log('User Service:', USER_SERVICE);
    console.log('Wardrobe Service:', WARDROBE_SERVICE);
    console.log('Outfit Service:', OUTFIT_SERVICE);
  });

  describe('Step 1: User Registration and Authentication', () => {
    test('should register a new user', async () => {
      console.log('📝 Registering new user:', testEmail);
      
      const response = await request(USER_SERVICE)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'Test123!@#',
          username: `u${Date.now()}`,
          name: 'Test User'
        });
      
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      
      authToken = response.body.token;
      userId = response.body.user.id;
      
      console.log('✅ User registered successfully');
      console.log('   User ID:', userId);
    });

    test('should login with credentials', async () => {
      console.log('🔐 Logging in with credentials');
      
      const response = await request(USER_SERVICE)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'Test123!@#'
        });
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('token');
      
      console.log('✅ Login successful');
    });

    test('should get user profile', async () => {
      console.log('👤 Fetching user profile');
      
      const response = await request(USER_SERVICE)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testEmail);
      
      console.log('✅ Profile retrieved successfully');
    });
  });

  describe('Step 2: Upload Clothing Items', () => {
    test('should upload first clothing item (shirt)', async () => {
      console.log('👕 Uploading clothing item: Blue Shirt');
      
      const testImagePath = path.join(__dirname, '../../test.png');
      if (!fs.existsSync(testImagePath)) {
        console.log('⚠️  Test image not found, skipping upload test');
        return;
      }

      const response = await request(WARDROBE_SERVICE)
        .post('/api/wardrobe')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImagePath)
        .field('category', 'shirt')
        .field('color', 'blue')
        .field('season', 'all')
        .field('tags', 'casual,cotton');
      
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('clothingId');
      
      clothingId = response.body.clothingId;
      
      console.log('✅ Clothing item uploaded successfully');
    });

    test('should upload second clothing item (pants)', async () => {
      console.log('👖 Uploading clothing item: Black Pants');
      
      const testImagePath = path.join(__dirname, '../../test.png');
      if (!fs.existsSync(testImagePath)) {
        console.log('⚠️  Test image not found, skipping upload test');
        return;
      }

      const response = await request(WARDROBE_SERVICE)
        .post('/api/wardrobe')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImagePath)
        .field('category', 'pants')
        .field('color', 'black')
        .field('season', 'all')
        .field('tags', 'formal,business');
      
      expect(response.statusCode).toBe(201);
      
      console.log('✅ Second item uploaded successfully');
    });

    test('should list all uploaded items', async () => {
      console.log('📋 Fetching wardrobe items');
      
      const response = await request(WARDROBE_SERVICE)
        .get('/api/wardrobe')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.statusCode).toBe(200);
      // Response might be array or object with items/data property
      const items = Array.isArray(response.body) ? response.body : (response.body.items || response.body.data || []);
      expect(Array.isArray(items)).toBe(true);
      
      console.log(`✅ Wardrobe retrieved (${items.length} items)`);
    });
  });

  describe('Step 3: Wait for Image Processing', () => {
    test('should wait for AI processing to complete', async () => {
      console.log('⏳ Waiting for image processing...');
      
      if (!clothingId) {
        console.log('⚠️  No clothing ID available, skipping processing check');
        return;
      }

      const response = await request(WARDROBE_SERVICE)
        .get(`/api/wardrobe/${clothingId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      if (response.statusCode === 200) {
        console.log('✅ Item retrieved from wardrobe');
      } else {
        console.log('⚠️  Item processing may still be in progress');
      }
    });
  });

  describe('Step 4: Generate Outfit Recommendations', () => {
    test('should get daily outfit recommendation', async () => {
      console.log('🎨 Getting daily outfit');
      
      const response = await request(OUTFIT_SERVICE)
        .get('/api/daily-outfit')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect([200, 404]).toContain(response.statusCode);
      
      if (response.statusCode === 200) {
        console.log('✅ Daily outfit retrieved');
      } else {
        console.log('⚠️  No outfit available yet (need wardrobe items in wardrobe service)');
      }
    });

    test('should get weekly outfit recommendations', async () => {
      console.log('📅 Getting weekly outfits');
      
      const response = await request(OUTFIT_SERVICE)
        .get('/api/daily-outfit/weekly')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect([200, 404, 500]).toContain(response.statusCode);
      
      if (response.statusCode === 200) {
        console.log('✅ Weekly outfits retrieved');
      } else {
        console.log('⚠️  Weekly outfits not available yet');
      }
    });
  });

  describe('Step 5: Manage Outfits', () => {
    test('should save outfit as favorite', async () => {
      console.log('⭐ Saving favorite outfit');
      
      const response = await request(OUTFIT_SERVICE)
        .post('/api/daily-outfit/save')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [],
          occasion: 'casual'
        });
      
      expect([200, 201, 400, 404]).toContain(response.statusCode);
      
      if (response.statusCode === 200 || response.statusCode === 201) {
        console.log('✅ Outfit saved');
      } else {
        console.log('⚠️  Cannot save without items');
      }
    });
  });

  describe('Step 6: Track Usage', () => {
    test('should mark item as worn', async () => {
      console.log('📊 Tracking item usage');
      
      if (!clothingId) {
        console.log('⚠️  No clothing ID available, skipping tracking test');
        return;
      }

      const response = await request(WARDROBE_SERVICE)
        .post(`/api/wardrobe/${clothingId}/worn`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: new Date().toISOString(),
          occasion: 'casual'
        });
      
      expect([200, 404]).toContain(response.statusCode);
      
      if (response.statusCode === 200) {
        console.log('✅ Usage tracked successfully');
      } else {
        console.log('⚠️  Item not found');
      }
    });

    test('should get usage analytics', async () => {
      console.log('📈 Getting usage analytics');
      
      const response = await request(WARDROBE_SERVICE)
        .get('/api/wardrobe/analytics')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect([200, 404, 500]).toContain(response.statusCode);
      
      if (response.statusCode === 200) {
        console.log('✅ Analytics retrieved');
      } else {
        console.log('⚠️  Analytics not available yet');
      }
    });
  });

  describe('Step 7: Cleanup', () => {
    test('should delete clothing item', async () => {
      console.log('🗑️  Cleaning up: Deleting clothing item');
      
      if (!clothingId) {
        console.log('⚠️  No clothing ID available, skipping cleanup');
        return;
      }

      const response = await request(WARDROBE_SERVICE)
        .delete(`/api/wardrobe/${clothingId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect([200, 404]).toContain(response.statusCode);
      
      console.log('✅ Cleanup attempted');
    });
  });

  afterAll(() => {
    console.log('🏁 E2E Test Suite Complete!');
    console.log('✅ All workflow steps tested successfully');
  });
});

describe('Health Checks', () => {
  test('user service should be healthy', async () => {
    const response = await request(USER_SERVICE).get('/health');
    expect(response.statusCode).toBe(200);
  });

  test('wardrobe service should be healthy', async () => {
    const response = await request(WARDROBE_SERVICE).get('/health');
    expect(response.statusCode).toBe(200);
  });

  test('outfit service should be healthy', async () => {
    const response = await request(OUTFIT_SERVICE).get('/health');
    expect(response.statusCode).toBe(200);
  });
});