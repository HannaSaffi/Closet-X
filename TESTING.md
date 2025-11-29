# Closet-X Testing Guide

## Overview

Closet-X uses a comprehensive testing strategy with three test layers:
1. **Unit/Service Tests** - Test individual services without external dependencies
2. **Integration Tests** - Test service-to-service communication
3. **End-to-End (E2E) Tests** - Test complete user workflows with all services running

## Test Coverage Summary

### Services Test Status

| Service | Unit Tests | Coverage | Status |
|---------|------------|----------|--------|
| **User Service** | ✅ Yes | ~80% | Passing |
| **Wardrobe Service** | ✅ Yes | ~80% | Passing |
| **Outfit Service** | ✅ Yes | ~60% | 92% Passing |
| **Workers** | ❌ No | 0% | Not implemented |

### Test Files Overview

```
Closet-X/
├── services/
│   ├── user-service/tests/
│   │   └── auth.test.js                    # Authentication tests
│   ├── wardrobe-service/tests/
│   │   └── wardrobe.test.js                # Wardrobe management tests
│   └── outfit-service/tests/
│       ├── colorMatching.test.js           # Color algorithm tests (51 tests)
│       ├── styleMatching.test.js           # Style algorithm tests (48 tests)
│       └── outfitController.test.js        # Controller tests
├── tests/
│   ├── integration/
│   │   └── service-communication.test.js   # Service integration tests
│   └── e2e/
│       └── complete-workflow.test.js       # Full user journey tests
```

## Running Tests

### Per-Service Unit Tests

Each service has its own test suite that can be run independently:

#### User Service
```bash
cd services/user-service
npm test                    # Run all tests with coverage
npm run test:watch          # Run in watch mode
npm run test:ci             # Run for CI/CD
```

**Coverage Goals**: 80% statements, branches, functions, lines

**Test Coverage:**
- ✅ User registration (success, duplicate email, validation)
- ✅ User login (success, wrong password, non-existent user)
- ✅ Protected routes (valid token, missing token, invalid token)
- ✅ Health check endpoint

#### Wardrobe Service
```bash
cd services/wardrobe-service
npm test                    # Run all tests with coverage
npm run test:watch          # Run in watch mode
npm run test:ci             # Run for CI/CD
```

**Coverage Goals**: 80% statements, branches, functions, lines

**Test Coverage:**
- ✅ Create clothing item
- ✅ List all items for user
- ✅ Filter by category
- ✅ Filter by season
- ✅ Get wardrobe statistics
- ✅ Delete clothing item
- ✅ Authentication middleware (mocked)

#### Outfit Service
```bash
cd services/outfit-service
npm test                    # Run all tests with coverage
npm run test:watch          # Run in watch mode
npm run test:ci             # Run for CI/CD
```

**Run specific test suites:**
```bash
# Run only algorithm tests (no database required)
npx jest tests/colorMatching.test.js tests/styleMatching.test.js

# Run only controller tests
npx jest tests/outfitController.test.js
```

**Coverage Goals**: 60% statements, branches, functions, lines

**Test Coverage:**
- ✅ Color Matching Algorithm (51 tests)
  - Color compatibility calculations
  - Neutral color handling
  - Color harmony scoring
  - Complementary color suggestions
  - Color temperature analysis
- ✅ Style Matching Algorithm (48 tests)
  - Style compatibility calculations
  - Style coherence scoring
  - Occasion appropriateness
  - Dominant style detection
  - Outfit strategy building
- ⚠️ Daily Outfit Controller (Requires database setup)
  - Weather integration
  - AI service integration
  - Outfit generation
  - User preferences

**Current Status**: 
- Algorithm tests: 91/99 passing (92%)
- Controller tests: Require database configuration

### Integration Tests

Integration tests require all services to be running.

```bash
# Start all services with Docker
docker-compose up -d

# Wait for services to be ready (check health endpoints)
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:5001/health

# Run integration tests
npm run test:integration
```

**Test Coverage:**
- ✅ User registration and authentication flow
- ✅ Wardrobe service with authentication
- ✅ Complete "What Should I Wear Today" workflow
- ✅ Service health checks

### End-to-End Tests

E2E tests simulate complete user journeys and require all services running.

```bash
# Ensure all services are running
docker-compose up -d

# Run E2E tests
npm run test:e2e
```

**Test Coverage:**
- ✅ Complete user journey (10 steps):
  1. User registration
  2. Upload clothing photos
  3. View wardrobe
  4. Check wardrobe stats
  5. Ask "What should I wear today?"
  6. Get AI fashion advice
  7. Check fashion trends
  8. Filter wardrobe by category
  9. Delete clothing item
  10. Verify deletion

### Run All Tests

```bash
# Run all tests (unit + integration + E2E)
npm run test:all
```

**⚠️ Warning**: This requires all services to be running via Docker Compose.

## Test Configuration

### Jest Configuration

Each service has its own `jest` configuration in `package.json`:

```json
{
  "jest": {
    "testEnvironment": "node",
    "coverageDirectory": "coverage",
    "collectCoverageFrom": [
      "src/**/*.js",
      "!src/index.js",
      "!**/node_modules/**"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    },
    "testMatch": [
      "**/tests/**/*.test.js"
    ]
  }
}
```

### Environment Variables for Testing

Tests use separate test databases to avoid affecting development data:

```bash
# User Service
MONGO_URI_TEST=mongodb://localhost:27017/closetx_users_test

# Wardrobe Service
MONGO_URI_TEST=mongodb://localhost:27017/closetx_wardrobe_test

# Outfit Service
MONGO_URI_TEST=mongodb://127.0.0.1:27017/closetx_outfits_test?directConnection=true
```

## Test Types Explained

### Unit/Service Tests

**Purpose**: Test individual components in isolation
**Requirements**: No external services needed (uses mocks)
**Speed**: Fast (< 5 seconds)

**Example**:
```javascript
// Mock external dependencies
jest.mock('../src/middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { userId: 'test-user-123' };
    next();
  }
}));

// Test the service directly
test('should create clothing item', async () => {
  const response = await request(app)
    .post('/api/wardrobe')
    .send({ category: 'tops', color: { primary: 'blue' } });
  
  expect(response.status).toBe(201);
});
```

### Integration Tests

**Purpose**: Test service-to-service communication
**Requirements**: All services must be running
**Speed**: Medium (10-30 seconds)

**Example**:
```javascript
test('should register user and receive token', async () => {
  const response = await request(USER_SERVICE_URL)
    .post('/api/auth/register')
    .send({ email: 'test@example.com', password: 'SecurePass123!' });
  
  expect(response.status).toBe(201);
  expect(response.body.data).toHaveProperty('token');
});
```

### End-to-End Tests

**Purpose**: Test complete user workflows
**Requirements**: All services must be running
**Speed**: Slow (30-60 seconds)

**Example**:
```javascript
test('Complete user journey', async () => {
  // Step 1: Register
  const authResponse = await request(USER_SERVICE)
    .post('/api/auth/register')
    .send({ email: 'e2e@test.com', password: 'Test123!' });
  
  const token = authResponse.body.data.token;
  
  // Step 2: Upload clothing
  const uploadResponse = await request(WARDROBE_SERVICE)
    .post('/api/wardrobe')
    .set('Authorization', `Bearer ${token}`)
    .send({ category: 'tops', color: { primary: 'blue' } });
  
  // Step 3: Generate outfit
  const outfitResponse = await request(OUTFIT_SERVICE)
    .post('/api/outfits/what-to-wear-today')
    .set('Authorization', `Bearer ${token}`)
    .send({ location: 'New York' });
  
  expect(outfitResponse.status).toBe(200);
});
```

## Mocking Strategies

### Authentication Middleware

For services that require authentication, we mock the middleware:

```javascript
jest.mock('../src/middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { userId: 'test-user-123', email: 'test@example.com' };
    next();
  }
}));
```

### External APIs

For external services (weather, AI), we mock the service modules:

```javascript
jest.mock('../src/services/weatherService');

weatherService.getCurrentWeather.mockResolvedValue({
  temperature: { value: 72, category: 'comfortable' },
  condition: { description: 'Sunny' }
});
```

### Database

Tests use separate test databases:
- Connects to test database before tests
- Clears database between tests
- Closes connection after tests

## Coverage Reports

After running tests with coverage, view the HTML report:

```bash
# User Service
cd services/user-service
npm test
open coverage/lcov-report/index.html

# Wardrobe Service
cd services/wardrobe-service
npm test
open coverage/lcov-report/index.html

# Outfit Service
cd services/outfit-service
npm test
open coverage/lcov-report/index.html
```

## Continuous Integration

Tests are designed to run in CI/CD pipelines:

```bash
# CI-friendly test command
npm run test:ci
```

This command:
- Runs tests once (no watch mode)
- Generates coverage reports
- Outputs results in CI-friendly format (jest-junit)
- Detects open handles and exits cleanly

## Troubleshooting

### MongoDB Connection Issues

**Problem**: `MongoServerError: Command requires authentication`

**Solution**: Use direct connection for tests:
```javascript
mongodb://127.0.0.1:27017/test_db?directConnection=true
```

### Port Already in Use

**Problem**: Test server won't start because port is in use

**Solution**: Kill the process or use a different port:
```bash
# Find process on port 3001
lsof -ti:3001

# Kill it
kill -9 $(lsof -ti:3001)
```

### Tests Hanging

**Problem**: Jest doesn't exit after tests complete

**Solution**: Use `--detectOpenHandles` flag to identify the issue:
```bash
jest --detectOpenHandles
```

Common causes:
- Database connection not closed
- Active HTTP connections
- Timers not cleared

### Mock Not Working

**Problem**: Mocked function is being called but returns undefined

**Solution**: Ensure mock is set up before importing the module that uses it:
```javascript
// ✅ Correct order
jest.mock('../src/services/weatherService');
const weatherService = require('../src/services/weatherService');

// ❌ Wrong order
const weatherService = require('../src/services/weatherService');
jest.mock('../src/services/weatherService');
```

## Best Practices

### 1. Test Structure

Use the **Arrange-Act-Assert** pattern:

```javascript
test('should create user', async () => {
  // Arrange
  const userData = { email: 'test@example.com', password: 'Pass123!' };
  
  // Act
  const response = await request(app)
    .post('/api/users')
    .send(userData);
  
  // Assert
  expect(response.status).toBe(201);
  expect(response.body.email).toBe(userData.email);
});
```

### 2. Database Cleanup

Always clean up between tests:

```javascript
beforeEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});
```

### 3. Descriptive Test Names

Use clear, descriptive test names:

```javascript
// ✅ Good
test('should return 401 when token is missing', async () => {});

// ❌ Bad
test('auth test', async () => {});
```

### 4. Test Independence

Each test should be independent:

```javascript
// ✅ Good - Creates its own data
test('should delete item', async () => {
  const item = await Clothing.create({ /* ... */ });
  await deleteItem(item._id);
  // ...
});

// ❌ Bad - Depends on other tests
let sharedItem;
test('creates item', async () => {
  sharedItem = await Clothing.create({ /* ... */ });
});
test('deletes item', async () => {
  await deleteItem(sharedItem._id); // Fails if first test fails
});
```

### 5. Use beforeEach/afterEach

Set up and tear down common test fixtures:

```javascript
let testUser;

beforeEach(async () => {
  testUser = await User.create({ email: 'test@example.com' });
});

afterEach(async () => {
  await User.deleteMany({});
});
```

## Future Improvements

### Planned Test Additions

1. **Worker Tests**
   - [ ] Image processor worker tests
   - [ ] Fashion advice worker tests
   - [ ] Outfit generator worker tests

2. **Additional Coverage**
   - [ ] Error handling edge cases
   - [ ] Rate limiting tests
   - [ ] File upload tests with actual files
   - [ ] WebSocket tests (if implemented)

3. **Performance Tests**
   - [ ] Load testing with k6 or Artillery
   - [ ] Database query performance
   - [ ] API response time benchmarks

4. **Security Tests**
   - [ ] SQL injection prevention
   - [ ] XSS prevention
   - [ ] CSRF protection
   - [ ] Rate limiting effectiveness

## Quick Reference

### Common Commands

```bash
# Install all dependencies
npm run install:all

# Run all service tests
npm run test:services

# Run integration tests (requires services running)
npm run test:integration

# Run E2E tests (requires services running)
npm run test:e2e

# Start services for testing
docker-compose up -d

# Check service health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health

# Stop services
docker-compose down
```

### Test Statistics

- **Total Test Files**: 5
- **Total Tests**: ~150+
- **Unit Tests**: ~120
- **Integration Tests**: ~15
- **E2E Tests**: ~10
- **Average Execution Time**: 5-10 seconds (unit), 30-60 seconds (integration/E2E)

## Contributing

When adding new features:

1. ✅ Write tests first (TDD approach)
2. ✅ Ensure tests pass before committing
3. ✅ Maintain >80% coverage for critical services
4. ✅ Add tests to appropriate directory
5. ✅ Update this documentation if needed

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server) (for faster tests)
- [Testing Best Practices](https://testingjavascript.com/)

---

**Last Updated**: November 2025
**Maintained By**: Team Kates
