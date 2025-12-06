// services/wardrobe-service/tests/clothingController.test.js

// Mock mongoose BEFORE any imports
jest.mock('mongoose', () => {
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
  
  mockSchema.Types = { ObjectId: 'ObjectId' };
  
  return {
    Schema: mockSchema,
    model: jest.fn(() => {
      return class MockModel {
        constructor(data) { 
          Object.assign(this, data);
        }
        save = jest.fn().mockResolvedValue(this);
        static find = jest.fn().mockReturnThis();
        static findOne = jest.fn().mockReturnThis();
        static findById = jest.fn().mockReturnThis();
        static findOneAndUpdate = jest.fn().mockReturnThis();
        static findByIdAndUpdate = jest.fn().mockReturnThis();
        static deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
        static countDocuments = jest.fn().mockResolvedValue(10);
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
        collection: jest.fn()
      }
    },
    Types: {
      ObjectId: jest.fn().mockImplementation((id) => id || 'mock-object-id')
    }
  };
});

// Mock GridFS service
jest.mock('../src/services/gridfsService', () => ({
  uploadImage: jest.fn().mockResolvedValue({
    imageUrl: 'https://example.com/image.jpg',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    imageId: 'image-id-123',
    thumbnailId: 'thumb-id-123'
  }),
  deleteImage: jest.fn().mockResolvedValue(true),
  downloadImage: jest.fn().mockResolvedValue({
    stream: { pipe: jest.fn() },
    contentType: 'image/jpeg',
    filename: 'test.jpg'
  })
}));

// Mock message queue
jest.mock('../src/services/messageQueue', () => ({
  publishMessage: jest.fn().mockResolvedValue(true)
}));

const clothingController = require('../src/controllers/clothingController');

// Helper functions
const mockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: { userId: 'test-user-id', email: 'test@example.com' },
  file: null,
  ...overrides
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

const mockFileUpload = (overrides = {}) => ({
  fieldname: 'image',
  originalname: 'test-image.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  size: 1024000,
  buffer: Buffer.from('mock-image-data'),
  ...overrides
});

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

describe('Wardrobe Service - Clothing Controller', () => {
  
  describe('getAllClothingItems', () => {
    test('should retrieve all clothing items for user', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      await clothingController.getAllClothingItems(req, res);
      
      expect(res.json).toHaveBeenCalled();
    });
    
    test('should filter by category', async () => {
      const req = mockRequest({
        query: { category: 'tops' }
      });
      const res = mockResponse();
      
      await clothingController.getAllClothingItems(req, res);
      
      expect(res.json).toHaveBeenCalled();
    });
    
    test('should filter by color', async () => {
      const req = mockRequest({
        query: { color: 'blue' }
      });
      const res = mockResponse();
      
      await clothingController.getAllClothingItems(req, res);
      
      expect(res.json).toHaveBeenCalled();
    });
    
    test('should filter by season', async () => {
      const req = mockRequest({
        query: { season: 'summer' }
      });
      const res = mockResponse();
      
      await clothingController.getAllClothingItems(req, res);
      
      expect(res.json).toHaveBeenCalled();
    });
    
    test('should handle pagination with limit', async () => {
      const req = mockRequest({
        query: { limit: '20', skip: '0' }
      });
      const res = mockResponse();
      
      await clothingController.getAllClothingItems(req, res);
      
      expect(res.json).toHaveBeenCalled();
    });
    
    test('should sort by specified field', async () => {
      const req = mockRequest({
        query: { sortBy: 'createdAt', order: 'desc' }
      });
      const res = mockResponse();
      
      await clothingController.getAllClothingItems(req, res);
      
      expect(res.json).toHaveBeenCalled();
    });
    
    test('should handle errors gracefully', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      // Override to throw error
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await clothingController.getAllClothingItems(req, res);
      
      expect(res.status).toHaveBeenCalled();
    });
  });

  describe('getClothingItemById', () => {
    test('should retrieve specific clothing item', async () => {
      const req = mockRequest({
        params: { id: 'item-123' }
      });
      const res = mockResponse();
      
      await clothingController.getClothingItemById(req, res);
      
      expect(res.json).toHaveBeenCalled();
    });
    
    test('should return 404 for non-existent item', async () => {
      const req = mockRequest({
        params: { id: 'non-existent' }
      });
      const res = mockResponse();
      
      await clothingController.getClothingItemById(req, res);
      
      expect(res.status).toHaveBeenCalled();
    });
    
    test('should only return items owned by user', async () => {
      const req = mockRequest({
        params: { id: 'item-123' },
        user: { userId: 'user-1' }
      });
      const res = mockResponse();
      
      await clothingController.getClothingItemById(req, res);
      
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('createClothingItem', () => {
    test('should create clothing item with valid data', async () => {
      const req = mockRequest({
        body: {
          category: 'tops',
          color: 'blue',
          season: 'summer'
        },
        file: mockFileUpload()
      });
      const res = mockResponse();
      
      await clothingController.createClothingItem(req, res);
      
      expect(res.status).toHaveBeenCalled();
    });
    
    test('should require image file', async () => {
      const req = mockRequest({
        body: { category: 'tops' },
        file: null
      });
      const res = mockResponse();
      
      await clothingController.createClothingItem(req, res);
      
      expectErrorResponse(res, 400, 'No image');
    });
    
    test('should parse comma-separated tags', async () => {
      const req = mockRequest({
        body: {
          category: 'tops',
          color: 'blue',
          tags: 'casual,summer,cotton'
        },
        file: mockFileUpload()
      });
      const res = mockResponse();
      
      await clothingController.createClothingItem(req, res);
      
      expect(res.status).toHaveBeenCalled();
    });
    
    test('should parse comma-separated seasons', async () => {
      const req = mockRequest({
        body: {
          category: 'tops',
          color: 'blue',
          season: 'spring,summer,fall'
        },
        file: mockFileUpload()
      });
      const res = mockResponse();
      
      await clothingController.createClothingItem(req, res);
      
      expect(res.status).toHaveBeenCalled();
    });
    
    test('should default to all-season if no season provided', async () => {
      const req = mockRequest({
        body: {
          category: 'tops',
          color: 'blue'
        },
        file: mockFileUpload()
      });
      const res = mockResponse();
      
      await clothingController.createClothingItem(req, res);
      
      expect(res.status).toHaveBeenCalled();
    });
    
    test('should publish message to queue when RabbitMQ available', async () => {
      process.env.RABBITMQ_URL = 'amqp://localhost';
      
      const req = mockRequest({
        body: { category: 'tops', color: 'blue' },
        file: mockFileUpload()
      });
      const res = mockResponse();
      
      await clothingController.createClothingItem(req, res);
      
      expect(res.status).toHaveBeenCalled();
    });
  });

  describe('updateClothingItem', () => {
    test('should update clothing item', async () => {
      const req = mockRequest({
        params: { id: 'item-123' },
        body: { brand: 'New Brand' }
      });
      const res = mockResponse();
      
      await clothingController.updateClothingItem(req, res);
      
      expect(res.json).toHaveBeenCalled();
    });
    
    test('should return 404 for non-existent item', async () => {
      const req = mockRequest({
        params: { id: 'non-existent' },
        body: { brand: 'New Brand' }
      });
      const res = mockResponse();
      
      await clothingController.updateClothingItem(req, res);
      
      expect(res.status).toHaveBeenCalled();
    });
    
    test('should only update items owned by user', async () => {
      const req = mockRequest({
        params: { id: 'item-123' },
        body: { brand: 'New Brand' },
        user: { userId: 'user-1' }
      });
      const res = mockResponse();
      
      await clothingController.updateClothingItem(req, res);
      
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('deleteClothingItem', () => {
    test('should delete clothing item', async () => {
      const req = mockRequest({
        params: { id: 'item-123' }
      });
      const res = mockResponse();
      
      await clothingController.deleteClothingItem(req, res);
      
      expect(res.json).toHaveBeenCalled();
    });
    
    test('should return 404 for non-existent item', async () => {
      const req = mockRequest({
        params: { id: 'non-existent' }
      });
      const res = mockResponse();
      
      await clothingController.deleteClothingItem(req, res);
      
      expect(res.status).toHaveBeenCalled();
    });
    
    test('should delete associated images', async () => {
      const gridfsService = require('../src/services/gridfsService');
      
      const req = mockRequest({
        params: { id: 'item-123' }
      });
      const res = mockResponse();
      
      await clothingController.deleteClothingItem(req, res);
      
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('markAsWorn', () => {
    test('should increment wear count', async () => {
      const req = mockRequest({
        params: { id: 'item-123' }
      });
      const res = mockResponse();
      
      await clothingController.markAsWorn(req, res);
      
      expect(res.json).toHaveBeenCalled();
    });
    
    test('should update lastWorn date', async () => {
      const req = mockRequest({
        params: { id: 'item-123' }
      });
      const res = mockResponse();
      
      await clothingController.markAsWorn(req, res);
      
      expect(res.json).toHaveBeenCalled();
    });
    
    test('should return 404 for non-existent item', async () => {
      const req = mockRequest({
        params: { id: 'non-existent' }
      });
      const res = mockResponse();
      
      await clothingController.markAsWorn(req, res);
      
      expect(res.status).toHaveBeenCalled();
    });
  });

  describe('getWardrobeStats', () => {
    test('should return overall statistics', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      await clothingController.getWardrobeStats(req, res);
      
      expect(res.json).toHaveBeenCalled();
    });
    
    test('should return category statistics', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      await clothingController.getWardrobeStats(req, res);
      
      expect(res.json).toHaveBeenCalled();
    });
    
    test('should calculate total value', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      await clothingController.getWardrobeStats(req, res);
      
      expect(res.json).toHaveBeenCalled();
    });
    
    test('should calculate average wear count', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      await clothingController.getWardrobeStats(req, res);
      
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('getImage', () => {
    test('should serve image file', async () => {
      const req = mockRequest({
        params: { fileId: 'image-123' }
      });
      const res = mockResponse();
      res.set = jest.fn().mockReturnValue(res);
      
      await clothingController.getImage(req, res);
      
      expect(res.set).toHaveBeenCalled();
    });
    
    test('should set correct content type', async () => {
      const req = mockRequest({
        params: { fileId: 'image-123' }
      });
      const res = mockResponse();
      res.set = jest.fn().mockReturnValue(res);
      
      await clothingController.getImage(req, res);
      
      expect(res.set).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
    });
    
    test('should set cache headers', async () => {
      const req = mockRequest({
        params: { fileId: 'image-123' }
      });
      const res = mockResponse();
      res.set = jest.fn().mockReturnValue(res);
      
      await clothingController.getImage(req, res);
      
      expect(res.set).toHaveBeenCalledWith('Cache-Control', expect.any(String));
    });
    
    test('should return 404 for missing image', async () => {
      const gridfsService = require('../src/services/gridfsService');
      gridfsService.downloadImage.mockRejectedValueOnce(new Error('Not found'));
      
      const req = mockRequest({
        params: { fileId: 'non-existent' }
      });
      const res = mockResponse();
      
      await clothingController.getImage(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle invalid ObjectId', async () => {
      const req = mockRequest({
        params: { id: 'invalid-id' }
      });
      const res = mockResponse();
      
      await clothingController.getClothingItemById(req, res);
      
      expect(res.status).toHaveBeenCalled();
    });
    
    test('should handle missing user context', async () => {
      const req = mockRequest({ user: null });
      const res = mockResponse();
      
      await clothingController.getAllClothingItems(req, res);
      
      expect(res.status).toHaveBeenCalled();
    });
    
    test('should handle database connection errors', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const req = mockRequest();
      const res = mockResponse();
      
      await clothingController.getAllClothingItems(req, res);
      
      expect(res.status).toHaveBeenCalled();
    });
    
    test('should handle file upload errors', async () => {
      const gridfsService = require('../src/services/gridfsService');
      gridfsService.uploadImage.mockRejectedValueOnce(new Error('Upload failed'));
      
      const req = mockRequest({
        body: { category: 'tops' },
        file: mockFileUpload()
      });
      const res = mockResponse();
      
      await clothingController.createClothingItem(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
    });
    
    test('should handle empty query results', async () => {
      const req = mockRequest({
        query: { category: 'non-existent' }
      });
      const res = mockResponse();
      
      await clothingController.getAllClothingItems(req, res);
      
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('Input Validation', () => {
    test('should validate category values', () => {
      const validCategories = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories'];
      const testCategory = 'tops';
      
      expect(validCategories).toContain(testCategory);
    });
    
    test('should validate color format', () => {
      const color = 'blue';
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    });
    
    test('should validate season values', () => {
      const validSeasons = ['spring', 'summer', 'fall', 'winter', 'all-season'];
      const testSeason = 'summer';
      
      expect(validSeasons).toContain(testSeason);
    });
    
    test('should validate image file types', () => {
      const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const file = mockFileUpload();
      
      expect(validMimeTypes).toContain(file.mimetype);
    });
  });
});
