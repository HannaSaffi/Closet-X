const request = require('supertest');
const USER_SERVICE = 'http://localhost:3001';

(async () => {
  const testEmail = `test-${Date.now()}@closetx.com`;
  
  console.log('Sending:');
  const payload = {
    email: testEmail,
    password: 'Test123!@#',
    username: 'TestUser',
    name: 'Test User'
  };
  console.log(JSON.stringify(payload, null, 2));
  
  const response = await request(USER_SERVICE)
    .post('/api/auth/register')
    .send(payload);
  
  console.log('\nReceived:');
  console.log('Status:', response.statusCode);
  console.log('Body:', JSON.stringify(response.body, null, 2));
})();
