/**
 * Centralized mock data and utilities for testing
 * This file provides reusable test data and mock functions across all test files
 */

// Mock User Data
const mockUsers = {
  validUser: {
    _id: 'user-123',
    email: 'test@example.com',
    password: '$2a$10$hashedpassword',
    fullName: 'Test User',
    preferences: {
      style: 'casual',
      defaultCity: 'New York'
    },
    outfitsGenerated: 0
  },
  secondUser: {
    _id: 'user-456',
    email: 'user2@example.com',
    password: '$2a$10$hashedpassword2',
    fullName: 'Second User',
    preferences: {
      style: 'formal',
      defaultCity: 'Los Angeles'
    },
    outfitsGenerated: 5
  }
};

// Mock Clothing Items
const mockClothingItems = {
  blueShirt: {
    _id: 'item-1',
    userId: 'user-123',
    category: 'tops',
    subcategory: 'shirt',
    color: { primary: 'blue', secondary: ['white'] },
    brand: 'Nike',
    season: ['spring', 'summer'],
    style: 'casual',
    imageURL: 'http://example.com/shirt.jpg',
    wearCount: 10
  },
  blackJeans: {
    _id: 'item-2',
    userId: 'user-123',
    category: 'bottoms',
    subcategory: 'jeans',
    color: { primary: 'black', secondary: [] },
    brand: 'Levis',
    season: ['all-season'],
    style: 'casual',
    imageURL: 'http://example.com/jeans.jpg',
    wearCount: 15
  },
  whiteSneakers: {
    _id: 'item-3',
    userId: 'user-123',
    category: 'shoes',
    subcategory: 'sneakers',
    color: { primary: 'white', secondary: [] },
    brand: 'Adidas',
    season: ['all-season'],
    style: 'casual',
    imageURL: 'http://example.com/shoes.jpg',
    wearCount: 20
  },
  navyBlazer: {
    _id: 'item-4',
    userId: 'user-123',
    category: 'outerwear',
    subcategory: 'blazer',
    color: { primary: 'navy', secondary: [] },
    brand: 'Hugo Boss',
    season: ['fall', 'winter', 'spring'],
    style: 'formal',
    imageURL: 'http://example.com/blazer.jpg',
    wearCount: 5
  },
  redDress: {
    _id: 'item-5',
    userId: 'user-123',
    category: 'dresses',
    subcategory: 'cocktail-dress',
    color: { primary: 'red', secondary: [] },
    brand: 'Zara',
    season: ['summer', 'spring'],
    style: 'trendy',
    imageURL: 'http://example.com/dress.jpg',
    wearCount: 3
  }
};

// Mock Outfits
const mockOutfits = {
  casualOutfit: {
    items: [
      mockClothingItems.blueShirt,
      mockClothingItems.blackJeans,
      mockClothingItems.whiteSneakers
    ],
    colors: ['blue', 'black', 'white'],
    styles: ['casual', 'casual', 'casual'],
    score: 90,
    weatherScore: 95
  },
  formalOutfit: {
    items: [
      mockClothingItems.navyBlazer,
      mockClothingItems.blackJeans,
      mockClothingItems.whiteSneakers
    ],
    colors: ['navy', 'black', 'white'],
    styles: ['formal', 'casual', 'casual'],
    score: 85,
    weatherScore: 90
  }
};

// Mock Weather Data
const mockWeather = {
  sunny: {
    location: { city: 'New York', region: 'NY', country: 'US' },
    current: {
      temperature: { value: 72, feelsLike: 70, category: 'comfortable' },
      condition: { description: 'Sunny', icon: 'sunny' },
      humidity: 50,
      wind: { speed: 10 }
    }
  },
  rainy: {
    location: { city: 'Seattle', region: 'WA', country: 'US' },
    current: {
      temperature: { value: 55, feelsLike: 52, category: 'cool' },
      condition: { description: 'Rainy', icon: 'rain' },
      humidity: 85,
      wind: { speed: 15 }
    }
  },
  cold: {
    location: { city: 'Boston', region: 'MA', country: 'US' },
    current: {
      temperature: { value: 35, feelsLike: 30, category: 'cold' },
      condition: { description: 'Clear', icon: 'clear' },
      humidity: 40,
      wind: { speed: 20 }
    }
  },
  hot: {
    location: { city: 'Miami', region: 'FL', country: 'US' },
    current: {
      temperature: { value: 90, feelsLike: 95, category: 'hot' },
      condition: { description: 'Sunny', icon: 'sunny' },
      humidity: 70,
      wind: { speed: 8 }
    }
  }
};

// Mock Weather Forecast
const mockWeatherForecast = [
  {
    temperature: { value: 72, category: 'comfortable' },
    condition: { description: 'Sunny' }
  },
  {
    temperature: { value: 68, category: 'comfortable' },
    condition: { description: 'Cloudy' }
  },
  {
    temperature: { value: 75, category: 'warm' },
    condition: { description: 'Clear' }
  },
  {
    temperature: { value: 70, category: 'comfortable' },
    condition: { description: 'Partly Cloudy' }
  },
  {
    temperature: { value: 73, category: 'comfortable' },
    condition: { description: 'Sunny' }
  }
];

// Mock AI Responses
const mockAIResponses = {
  fashionAdvice: {
    success: true,
    advice: 'This outfit looks great! The colors complement each other well.',
    provider: 'ollama'
  },
  outfitAnalysis: {
    success: true,
    analysis: 'Excellent color coordination and style coherence. Perfect for the weather.',
    provider: 'ollama'
  },
  unavailable: {
    success: false,
    error: 'AI service unavailable'
  }
};

// Mock JWT Tokens
const mockTokens = {
  valid: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSJ9.signature',
  expired: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsImV4cCI6MTYwMDAwMDAwMH0.signature',
  invalid: 'invalid.token.here'
};

// Mock Wardrobe Statistics
const mockWardrobeStats = {
  totalItems: 25,
  byCategory: {
    tops: 8,
    bottoms: 6,
    shoes: 4,
    outerwear: 3,
    dresses: 2,
    accessories: 2
  },
  byColor: {
    black: 6,
    white: 5,
    blue: 4,
    navy: 3,
    gray: 3,
    red: 2,
    green: 2
  },
  bySeason: {
    summer: 8,
    winter: 6,
    spring: 7,
    fall: 7,
    'all-season': 10
  },
  mostWorn: [
    { item: mockClothingItems.whiteSneakers, count: 20 },
    { item: mockClothingItems.blackJeans, count: 15 },
    { item: mockClothingItems.blueShirt, count: 10 }
  ]
};

// Helper function to create mock Express request
function createMockRequest(options = {}) {
  return {
    user: options.user || { id: 'user-123', email: 'test@example.com' },
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || { authorization: 'Bearer ' + mockTokens.valid },
    ...options
  };
}

// Helper function to create mock Express response
function createMockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
}

// Helper function to create mock Express next
function createMockNext() {
  return jest.fn();
}

// Mock MongoDB ObjectId generator
function mockObjectId() {
  return Math.random().toString(36).substring(2, 15);
}

// Mock file upload data
const mockFileUpload = {
  file: {
    fieldname: 'image',
    originalname: 'shirt.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('mock-image-data'),
    size: 102400
  }
};

// Mock RabbitMQ Message
const mockRabbitMQMessage = {
  content: Buffer.from(JSON.stringify({
    userId: 'user-123',
    itemId: 'item-1',
    action: 'process-image'
  })),
  fields: {
    deliveryTag: 1,
    redelivered: false
  },
  properties: {
    contentType: 'application/json',
    timestamp: Date.now()
  }
};

// Mock Error Responses
const mockErrors = {
  validation: {
    success: false,
    message: 'Validation failed',
    errors: ['Email is required', 'Password must be at least 8 characters']
  },
  authentication: {
    success: false,
    message: 'Authentication failed',
    error: 'Invalid credentials'
  },
  authorization: {
    success: false,
    message: 'Authorization failed',
    error: 'Insufficient permissions'
  },
  notFound: {
    success: false,
    message: 'Resource not found'
  },
  serverError: {
    success: false,
    message: 'Internal server error'
  }
};

module.exports = {
  mockUsers,
  mockClothingItems,
  mockOutfits,
  mockWeather,
  mockWeatherForecast,
  mockAIResponses,
  mockTokens,
  mockWardrobeStats,
  mockFileUpload,
  mockRabbitMQMessage,
  mockErrors,
  createMockRequest,
  createMockResponse,
  createMockNext,
  mockObjectId
};
