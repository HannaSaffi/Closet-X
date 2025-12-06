// tests/utils/testHelpers.js
/**
 * Centralized test utilities and helpers for all test suites
 */

/**
 * Mock MongoDB connection for tests
 */
const setupMockMongoose = () => {
  const mockSchema = function() {
    this.pre = jest.fn().mockReturnThis();
    this.post = jest.fn().mockReturnThis();
    this.methods = {};
    this.statics = {};
    this.index = jest.fn().mockReturnThis();
    this.virtual = jest.fn().mockReturnValue({
      get: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    });
    this.plugin = jest.fn().mockReturnThis();
    this.set = jest.fn().mockReturnThis();
  };
  
  mockSchema.Types = {
    ObjectId: 'ObjectId'
  };
  
  return {
    Schema: mockSchema,
    model: jest.fn(() => {
      return class MockModel {
        constructor(data) { 
          Object.assign(this, data);
          this._id = data._id || 'mock-id-' + Math.random();
        }
        save = jest.fn().mockResolvedValue(this);
        static find = jest.fn().mockReturnThis();
        static findOne = jest.fn().mockReturnThis();
        static findById = jest.fn().mockReturnThis();
        static findByIdAndUpdate = jest.fn().mockReturnThis();
        static findByIdAndDelete = jest.fn().mockReturnThis();
        static findOneAndUpdate = jest.fn().mockReturnThis();
        static deleteOne = jest.fn().mockReturnThis();
        static countDocuments = jest.fn().mockResolvedValue(0);
        static aggregate = jest.fn().mockResolvedValue([]);
        static create = jest.fn().mockResolvedValue({});
        lean = jest.fn().mockReturnThis();
        sort = jest.fn().mockReturnThis();
        limit = jest.fn().mockReturnThis();
        skip = jest.fn().mockReturnThis();
        exec = jest.fn().mockResolvedValue([]);
      };
    }),
    connect: jest.fn().mockResolvedValue({}),
    connection: { 
      close: jest.fn(),
      db: {
        collection: jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([])
          })
        })
      }
    },
    Types: {
      ObjectId: jest.fn().mockImplementation((id) => id || 'mock-object-id-' + Math.random())
    }
  };
};

/**
 * Mock Express request object
 */
const mockRequest = (overrides = {}) => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: { userId: 'test-user-id', email: 'test@example.com' },
    file: null,
    files: null,
    ...overrides
  };
};

/**
 * Mock Express response object
 */
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Mock Express next function
 */
const mockNext = () => jest.fn();

/**
 * Create mock file upload
 */
const mockFileUpload = (overrides = {}) => {
  return {
    fieldname: 'image',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024000,
    buffer: Buffer.from('mock-image-data'),
    ...overrides
  };
};

/**
 * Mock RabbitMQ connection
 */
const mockRabbitMQ = () => {
  return {
    connect: jest.fn().mockResolvedValue({
      createChannel: jest.fn().mockResolvedValue({
        assertQueue: jest.fn().mockResolvedValue({}),
        sendToQueue: jest.fn().mockReturnValue(true),
        consume: jest.fn(),
        ack: jest.fn(),
        nack: jest.fn(),
        close: jest.fn()
      }),
      close: jest.fn()
    })
  };
};

/**
 * Mock JWT operations
 */
const mockJWT = () => {
  return {
    sign: jest.fn().mockReturnValue('mock.jwt.token.12345'),
    verify: jest.fn().mockReturnValue({ 
      id: 'user-id-123', 
      email: 'test@example.com',
      exp: Date.now() + 3600000 
    }),
    decode: jest.fn().mockReturnValue({ 
      id: 'user-id-123', 
      email: 'test@example.com' 
    })
  };
};

/**
 * Mock bcrypt operations
 */
const mockBcrypt = () => {
  return {
    hash: jest.fn().mockResolvedValue('$2a$10$mockhashedpassword123456789'),
    compare: jest.fn().mockResolvedValue(true),
    genSalt: jest.fn().mockResolvedValue('mocksalt12345')
  };
};

/**
 * Create mock user data
 */
const createMockUser = (overrides = {}) => {
  return {
    _id: 'user-id-' + Math.random(),
    email: 'test@example.com',
    password: '$2a$10$hashedpassword',
    name: 'Test User',
    preferences: {
      style: 'casual',
      favoriteColors: ['blue', 'black']
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
};

/**
 * Create mock clothing item data
 */
const createMockClothingItem = (overrides = {}) => {
  return {
    _id: 'item-id-' + Math.random(),
    userId: 'user-id-123',
    category: 'tops',
    subcategory: 'shirt',
    color: {
      primary: 'blue',
      secondary: ['white']
    },
    brand: 'Test Brand',
    season: ['spring', 'summer'],
    fabric: 'cotton',
    tags: ['casual', 'work'],
    size: 'M',
    imageUrl: 'https://example.com/image.jpg',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    imageId: 'image-id-123',
    thumbnailId: 'thumb-id-123',
    wearCount: 0,
    lastWorn: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
};

/**
 * Create mock outfit data
 */
const createMockOutfit = (overrides = {}) => {
  return {
    _id: 'outfit-id-' + Math.random(),
    userId: 'user-id-123',
    name: 'Casual Friday',
    items: [
      { itemId: 'item-1', category: 'tops', color: 'blue' },
      { itemId: 'item-2', category: 'bottoms', color: 'black' }
    ],
    occasion: 'casual',
    season: 'spring',
    weather: {
      temperature: 72,
      condition: 'sunny'
    },
    styleScore: 8.5,
    colorScore: 9.0,
    createdAt: new Date(),
    ...overrides
  };
};

/**
 * Mock weather API response
 */
const mockWeatherData = (overrides = {}) => {
  return {
    temperature: {
      value: 72,
      unit: 'F',
      category: 'comfortable'
    },
    condition: {
      main: 'Clear',
      description: 'clear sky',
      icon: '01d'
    },
    humidity: 65,
    windSpeed: 5,
    precipitation: 0,
    ...overrides
  };
};

/**
 * Mock AI service response
 */
const mockAIResponse = (overrides = {}) => {
  return {
    advice: 'Great outfit choice! The colors complement each other well.',
    styleAnalysis: {
      coherence: 9,
      appropriateness: 8,
      suggestions: ['Consider adding a light jacket']
    },
    confidence: 0.92,
    ...overrides
  };
};

/**
 * Wait for async operations
 */
const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Clean up test database
 */
const cleanupDatabase = async (models) => {
  if (!models) return;
  
  const modelArray = Array.isArray(models) ? models : [models];
  
  for (const Model of modelArray) {
    if (Model && typeof Model.deleteMany === 'function') {
      await Model.deleteMany({});
    }
  }
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
const isStrongPassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Generate random test data
 */
const generateRandomString = (length = 10) => {
  return Math.random().toString(36).substring(2, length + 2);
};

/**
 * Generate random email
 */
const generateRandomEmail = () => {
  return `test-${generateRandomString()}@example.com`;
};

/**
 * Create test context with common mocks
 */
const createTestContext = () => {
  return {
    req: mockRequest(),
    res: mockResponse(),
    next: mockNext()
  };
};

/**
 * Assert error response
 */
const expectErrorResponse = (res, statusCode, message) => {
  expect(res.status).toHaveBeenCalledWith(statusCode);
  if (message) {
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining(message)
      })
    );
  }
};

/**
 * Assert success response
 */
const expectSuccessResponse = (res, statusCode = 200) => {
  expect(res.status).toHaveBeenCalledWith(statusCode);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({
      success: true
    })
  );
};

module.exports = {
  // Setup functions
  setupMockMongoose,
  
  // Mock creators
  mockRequest,
  mockResponse,
  mockNext,
  mockFileUpload,
  mockRabbitMQ,
  mockJWT,
  mockBcrypt,
  
  // Data generators
  createMockUser,
  createMockClothingItem,
  createMockOutfit,
  mockWeatherData,
  mockAIResponse,
  
  // Utilities
  waitFor,
  cleanupDatabase,
  isValidEmail,
  isStrongPassword,
  generateRandomString,
  generateRandomEmail,
  createTestContext,
  
  // Assertions
  expectErrorResponse,
  expectSuccessResponse
};
