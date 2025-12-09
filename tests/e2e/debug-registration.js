const request = require('supertest');
const USER_SERVICE = 'http://localhost:3001';

(async () => {
  const testEmail = `test-${Date.now()}@closetx.com`;
  
  // Try with ALL possible fields
  const payload = {
    email: testEmail,
    password: 'Test123!@#',
    username: 'TestUser',
    name: 'Test User',
    firstName: 'Test',
    lastName: 'User'
  };
  
  console.log('Testing registration with ALL fields:');
  console.log(payload);
  
  const response = await request(USER_SERVICE)
    .post('/api/auth/register')
    .send(payload);
  
  console.log('\nResponse:');
  console.log('Status:', response.statusCode);
  console.log('Body:', response.body);
  
  if (response.statusCode === 201 || response.statusCode === 200) {
    console.log('\n✅ Registration SUCCESS!');
  } else {
    console.log('\n❌ Still failing - check controller validation');
  }
})();
