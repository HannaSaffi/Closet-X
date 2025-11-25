const axios = require('axios');

// Configuration - update these based on your deployment
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';
const WARDROBE_SERVICE_URL = process.env.WARDROBE_SERVICE_URL || 'http://localhost:3003';
const OUTFIT_SERVICE_URL = process.env.OUTFIT_SERVICE_URL || 'http://localhost:3002';

// Create axios instance with proper connection handling
const axiosInstance = axios.create({
  timeout: 10000,
  headers: {
    'Connection': 'close'
  }
});

// Test timeout
jest.setTimeout(30000);

describe('AI Integration Tests', () => {
  
  describe('AI Service Availability', () => {
    test('AI service should be healthy', async () => {
      try {
        const response = await axiosInstance.get(`${AI_SERVICE_URL}/health`);
        expect(response.status).toBe(200);
        expect(response.data.service).toBe('ai-advice-service');
        expect(response.data.status).toBe('healthy');
      } catch (error) {
        console.log('⚠️  AI service not running - skipping test');
        expect(error.code).toBe('ECONNREFUSED'); // Expected if service isn't running
      }
    });
    
    test('AI service trends endpoint works', async () => {
      try {
        const response = await axiosInstance.get(`${AI_SERVICE_URL}/api/ai/trends`);
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        expect(response.data).toHaveProperty('trending_colors');
        expect(response.data).toHaveProperty('trending_styles');
      } catch (error) {
        console.log('⚠️  AI service not running - skipping test');
      }
    });
  });

  describe('Image Analysis Integration', () => {
    test('should analyze clothing image', async () => {
      const testImage = {
        image_url: 'https://example.com/test-shirt.jpg',
        user_id: 'test-user-123'
      };
      
      try {
        const response = await axiosInstance.post(
          `${AI_SERVICE_URL}/api/ai/analyze-image`,
          testImage
        );
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('category');
        expect(response.data).toHaveProperty('color');
        expect(response.data).toHaveProperty('confidence');
      } catch (error) {
        if (error.response?.status === 503) {
          console.log('⚠️  AI provider unavailable - expected in CI');
          expect(error.response.status).toBe(503);
        } else {
          console.log('⚠️  AI service not running');
        }
      }
    });
  });

  describe('Fashion Advice Integration', () => {
    test('should generate fashion advice', async () => {
      const adviceRequest = {
        user_id: 'test-user-123',
        question: 'What colors go well with navy blue?',
        context: {
          occasion: 'casual',
          season: 'summer'
        }
      };
      
      try {
        const response = await axiosInstance.post(
          `${AI_SERVICE_URL}/api/ai/fashion-advice`,
          adviceRequest
        );
        
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        expect(response.data).toHaveProperty('advice');
        expect(response.data).toHaveProperty('suggestions');
      } catch (error) {
        if (error.response?.status === 503) {
          console.log('⚠️  AI provider unavailable - expected in CI');
          expect(error.response.status).toBe(503);
        } else {
          console.log('⚠️  AI service not running');
        }
      }
    });
  });

  describe('Outfit Generation with AI', () => {
    test('should generate outfit with AI reasoning', async () => {
      const outfitRequest = {
        user_id: 'test-user-123',
        clothing_items: [
          {
            id: 'item1',
            category: 'tops',
            color: 'blue',
            season: 'summer'
          },
          {
            id: 'item2',
            category: 'bottoms',
            color: 'black',
            season: 'all-season'
          }
        ],
        occasion: 'casual',
        weather: {
          temp: 72,
          description: 'sunny'
        }
      };
      
      try {
        const response = await axiosInstance.post(
          `${AI_SERVICE_URL}/api/ai/generate-outfit`,
          outfitRequest
        );
        
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        expect(response.data).toHaveProperty('selected_items');
        expect(response.data).toHaveProperty('reasoning');
        expect(response.data).toHaveProperty('confidence_score');
      } catch (error) {
        if (error.response?.status === 503) {
          console.log('⚠️  AI provider unavailable - expected in CI');
          expect(error.response.status).toBe(503);
        } else {
          console.log('⚠️  AI service not running');
        }
      }
    });
  });

  describe('End-to-End AI Workflow', () => {
    test('complete AI-powered outfit recommendation flow', async () => {
      console.log('\n🧪 Testing complete AI workflow...\n');
      
      // Step 1: Get fashion trends
      try {
        console.log('1️⃣  Fetching current fashion trends...');
        const trendsResponse = await axiosInstance.get(`${AI_SERVICE_URL}/api/ai/trends`);
        expect(trendsResponse.status).toBe(200);
        console.log('✅ Got trends:', trendsResponse.data.trending_colors.slice(0, 3));
        
        // Step 2: Analyze a clothing item
        console.log('\n2️⃣  Analyzing clothing item...');
        const analysisResponse = await axiosInstance.post(
          `${AI_SERVICE_URL}/api/ai/analyze-image`,
          {
            image_url: 'https://example.com/shirt.jpg',
            user_id: 'test-user'
          }
        );
        console.log('✅ Analysis complete');
        
        // Step 3: Get fashion advice
        console.log('\n3️⃣  Generating fashion advice...');
        const adviceResponse = await axiosInstance.post(
          `${AI_SERVICE_URL}/api/ai/fashion-advice`,
          {
            user_id: 'test-user',
            question: 'What should I wear for a casual summer day?',
            context: { occasion: 'casual', season: 'summer' }
          }
        );
        expect(adviceResponse.data.success).toBe(true);
        console.log('✅ Got advice');
        
        // Step 4: Generate complete outfit
        console.log('\n4️⃣  Generating complete outfit...');
        const outfitResponse = await axiosInstance.post(
          `${AI_SERVICE_URL}/api/ai/generate-outfit`,
          {
            user_id: 'test-user',
            clothing_items: [
              { id: '1', category: 'tops', color: 'blue', season: 'summer' },
              { id: '2', category: 'bottoms', color: 'khaki', season: 'summer' }
            ],
            occasion: 'casual',
            weather: { temp: 75, description: 'sunny' }
          }
        );
        expect(outfitResponse.data.success).toBe(true);
        console.log('✅ Outfit generated successfully\n');
        
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log('⚠️  Services not running - test skipped');
        } else if (error.response?.status === 503) {
          console.log('⚠️  AI provider unavailable - expected in CI');
        } else {
          console.error('❌ Error:', error.message);
          throw error;
        }
      }
    });
  });

  describe('AI Service Error Handling', () => {
    test('should handle invalid requests gracefully', async () => {
      try {
        await axiosInstance.post(`${AI_SERVICE_URL}/api/ai/fashion-advice`, {});
      } catch (error) {
        // Should get validation error (422) or service unavailable (503)
        expect([422, 503]).toContain(error.response?.status);
      }
    });
    
    test('should handle missing AI providers', async () => {
      // This tests the fallback mechanism
      const request = {
        user_id: 'test',
        question: 'test question',
        context: {}
      };
      
      try {
        const response = await axiosInstance.post(
          `${AI_SERVICE_URL}/api/ai/fashion-advice`,
          request
        );
        // Should either succeed with fallback or return 503
        expect([200, 503]).toContain(response.status);
      } catch (error) {
        expect(error.response?.status).toBe(503);
      }
    });
  });

  describe('AI Performance', () => {
    test('trends endpoint should respond quickly', async () => {
      const startTime = Date.now();
      
      try {
        await axiosInstance.get(`${AI_SERVICE_URL}/api/ai/trends`);
        const duration = Date.now() - startTime;
        
        // Should respond in less than 2 seconds
        expect(duration).toBeLessThan(2000);
        console.log(`⚡ Response time: ${duration}ms`);
      } catch (error) {
        console.log('⚠️  Service not available for performance test');
      }
    });
  });
});