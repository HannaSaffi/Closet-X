const fs = require('fs');

// Read the test file
let content = fs.readFileSync('complete-workflow.test.js', 'utf8');

// Find the registration payload and replace it
const oldPayload = `        .send({
          email: testEmail,
          password: 'Test123!@#',
          username: 'Test User'
        });`;

const newPayload = `        .send({
          email: testEmail,
          password: 'Test123!@#',
          username: 'TestUser',
          name: 'Test User'
        });`;

content = content.replace(oldPayload, newPayload);

// Also fix any other occurrences with 'name' field
content = content.replace(
  /username: 'Test User'/g,
  "username: 'TestUser',\n          name: 'Test User'"
);

fs.writeFileSync('complete-workflow.test.js', content);
console.log('✅ Fixed registration payload!');
