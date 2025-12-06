const request = require('supertest');
const USER_SERVICE = 'http://localhost:3001';

(async () => {
  const timestamp = Date.now();
  const payload = {
    email: `test-${timestamp}@closetx.com`,
    password: 'Test123!@#',
    username: `testuser${timestamp}`,
    name: 'Test User'
  };
  
  console.log('Testing with:', payload);
  
  const response = await request(USER_SERVICE)
    .post('/api/auth/register')
    .send(payload);
  
  console.log('\nStatus:', response.statusCode);
  console.log('Body:', response.body);
})();
