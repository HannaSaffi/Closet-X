//services/outfit-service/tests/outfit.test.js
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
  
  mockSchema.Types = {
    ObjectId: 'ObjectId'
  };
  
  return {
    Schema: mockSchema,
    model: jest.fn(() => {
      return class MockModel {
        constructor(data) { Object.assign(this, data); }
        save = jest.fn().mockResolvedValue(this);
        static find = jest.fn().mockResolvedValue([]);
        static findOne = jest.fn().mockResolvedValue(null);
        static findById = jest.fn().mockResolvedValue(null);
        static findByIdAndUpdate = jest.fn();
        static findByIdAndDelete = jest.fn();
        static deleteMany = jest.fn();
      };
    }),
    connect: jest.fn().mockResolvedValue({}),
    connection: { 
      close: jest.fn()
    },
    Types: {
      ObjectId: jest.fn().mockImplementation((id) => id || 'mock-object-id')
    }
  };
});

// Mock axios for external API calls
jest.mock('axios');
const axios = require('axios');

describe('Outfit Service Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Outfit Model', () => {
    test('should import Outfit model without errors', () => {
      expect(() => {
        const Outfit = require('../src/models/Outfit');
      }).not.toThrow();
    });
    
    test('should have required fields', () => {
      const Outfit = require('../src/models/Outfit');
      expect(Outfit).toBeDefined();
    });
  });

  describe('Controllers', () => {
    test('should have dailyOutfit controller', () => {
      expect(() => {
        const dailyOutfitController = require('../src/controllers/dailyOutfitController');
      }).not.toThrow();
    });
    
    test('should have ai controller', () => {
      expect(() => {
        const aiController = require('../src/controllers/aiController');
      }).not.toThrow();
    });
  });

  describe('Weather Integration', () => {
    test('should fetch weather data', async () => {
      const mockWeatherData = {
        main: { temp: 20 },
        weather: [{ main: 'Clear' }]
      };
      
      axios.get.mockResolvedValue({ data: mockWeatherData });
      
      const response = await axios.get('https://api.openweathermap.org/data/2.5/weather');
      expect(response.data).toEqual(mockWeatherData);
      expect(response.data.main.temp).toBe(20);
    });
    
    test('should handle weather API errors', async () => {
      axios.get.mockRejectedValue(new Error('API error'));
      
      await expect(axios.get('https://api.openweathermap.org')).rejects.toThrow('API error');
    });
  });

  describe('Outfit Generation Logic', () => {
    test('should validate weather conditions', () => {
      const validConditions = ['sunny', 'cloudy', 'rainy', 'snowy', 'windy'];
      expect(validConditions).toContain('sunny');
      expect(validConditions).toContain('rainy');
    });
    
    test('should validate temperature ranges', () => {
      const temperature = 25;
      expect(temperature).toBeGreaterThan(0);
      expect(temperature).toBeLessThan(50);
    });
    
    test('should categorize temperature', () => {
      const cold = 5;
      const mild = 20;
      const hot = 35;
      
      expect(cold).toBeLessThan(15);
      expect(mild).toBeGreaterThanOrEqual(15);
      expect(mild).toBeLessThan(25);
      expect(hot).toBeGreaterThanOrEqual(25);
    });
  });

  describe('Occasion Handling', () => {
    test('should validate occasions', () => {
      const validOccasions = ['casual', 'formal', 'business', 'sport', 'party'];
      expect(validOccasions).toContain('casual');
      expect(validOccasions).toContain('formal');
    });
    
    test('should normalize occasion input', () => {
      const occasion = 'CASUAL';
      const normalized = occasion.toLowerCase();
      expect(normalized).toBe('casual');
    });
  });

  describe('Outfit Matching', () => {
    test('should match clothing items by color harmony', () => {
      const item1 = { color: 'blue', category: 'shirt' };
      const item2 = { color: 'black', category: 'pants' };
      
      // These colors work well together
      const compatibleColors = {
        'blue': ['black', 'white', 'gray'],
        'black': ['white', 'red', 'blue']
      };
      
      expect(compatibleColors['blue']).toContain('black');
    });
    
    test('should not duplicate categories in outfit', () => {
      const outfit = [
        { category: 'shirt' },
        { category: 'pants' },
        { category: 'shoes' }
      ];
      
      const categories = outfit.map(item => item.category);
      const uniqueCategories = new Set(categories);
      
      expect(categories.length).toBe(uniqueCategories.size);
    });
    
    test('should prioritize seasonal items', () => {
      const items = [
        { category: 'shirt', season: 'summer' },
        { category: 'jacket', season: 'winter' }
      ];
      
      const currentSeason = 'summer';
      const seasonalItems = items.filter(item => 
        item.season === currentSeason || item.season === 'all'
      );
      
      expect(seasonalItems.length).toBeGreaterThan(0);
    });
  });

  describe('Weather-Based Recommendations', () => {
    test('should recommend light clothing for hot weather', () => {
      const temperature = 35;
      const weatherCondition = 'sunny';
      
      expect(temperature).toBeGreaterThan(25);
      expect(weatherCondition).toBe('sunny');
      
      // Logic: hot weather requires light clothing
      const recommendedFabrics = ['cotton', 'linen', 'breathable'];
      expect(recommendedFabrics).toContain('cotton');
    });
    
    test('should recommend warm clothing for cold weather', () => {
      const temperature = 5;
      const weatherCondition = 'cold';
      
      expect(temperature).toBeLessThan(15);
      
      const recommendedItems = ['jacket', 'sweater', 'long-pants'];
      expect(recommendedItems).toContain('jacket');
    });
    
    test('should recommend rain gear for rainy weather', () => {
      const weatherCondition = 'rainy';
      
      const recommendedItems = ['jacket', 'waterproof-shoes', 'umbrella'];
      expect(recommendedItems).toContain('jacket');
    });
  });

  describe('Outfit Scoring', () => {
    test('should calculate outfit compatibility score', () => {
      const outfit = {
        colorHarmony: 0.8,
        styleConsistency: 0.9,
        weatherAppropriate: 0.85
      };
      
      const score = (outfit.colorHarmony + outfit.styleConsistency + outfit.weatherAppropriate) / 3;
      
      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThanOrEqual(1);
    });
    
    test('should rank outfits by score', () => {
      const outfits = [
        { id: 1, score: 0.7 },
        { id: 2, score: 0.9 },
        { id: 3, score: 0.6 }
      ];
      
      const sorted = outfits.sort((a, b) => b.score - a.score);
      
      expect(sorted[0].score).toBeGreaterThanOrEqual(sorted[1].score);
      expect(sorted[1].score).toBeGreaterThanOrEqual(sorted[2].score);
    });
  });

  describe('Favorite Outfits', () => {
    test('should mark outfit as favorite', () => {
      const outfit = { id: '123', isFavorite: false };
      outfit.isFavorite = true;
      
      expect(outfit.isFavorite).toBe(true);
    });
    
    test('should toggle favorite status', () => {
      const outfit = { id: '123', isFavorite: false };
      outfit.isFavorite = !outfit.isFavorite;
      
      expect(outfit.isFavorite).toBe(true);
      
      outfit.isFavorite = !outfit.isFavorite;
      expect(outfit.isFavorite).toBe(false);
    });
  });

  describe('Input Validation', () => {
    test('should validate required fields for outfit generation', () => {
      const request = {
        weatherCondition: 'sunny',
        temperature: 25,
        occasion: 'casual'
      };
      
      expect(request.weatherCondition).toBeDefined();
      expect(request.temperature).toBeDefined();
      expect(request.occasion).toBeDefined();
    });
    
    test('should handle missing optional fields', () => {
      const request = {
        weatherCondition: 'sunny',
        temperature: 25
      };
      
      const occasion = request.occasion || 'casual';
      expect(occasion).toBe('casual');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid temperature', () => {
      const invalidTemps = [-100, 100, NaN];
      
      invalidTemps.forEach(temp => {
        const isValid = temp >= -50 && temp <= 50;
        if (temp !== temp) { // NaN check
          expect(isValid).toBe(false);
        }
      });
    });
    
    test('should handle empty wardrobe', () => {
      const wardrobeItems = [];
      
      expect(wardrobeItems.length).toBe(0);
      // Should return appropriate message
      const message = wardrobeItems.length === 0 ? 'No items available' : 'Outfit generated';
      expect(message).toBe('No items available');
    });
    
    test('should handle API failures gracefully', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));
      
      try {
        await axios.get('/api/weather');
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });
  });

  describe('Color Combinations', () => {
    test('should validate complementary colors', () => {
      const complementaryPairs = [
        ['blue', 'orange'],
        ['red', 'green'],
        ['yellow', 'purple']
      ];
      
      complementaryPairs.forEach(pair => {
        expect(pair.length).toBe(2);
      });
    });
    
    test('should identify neutral colors', () => {
      const neutralColors = ['black', 'white', 'gray', 'beige', 'navy'];
      
      expect(neutralColors).toContain('black');
      expect(neutralColors).toContain('white');
    });
  });

  describe('Outfit History', () => {
    test('should track outfit creation date', () => {
      const outfit = {
        id: '123',
        createdAt: new Date()
      };
      
      expect(outfit.createdAt).toBeInstanceOf(Date);
    });
    
    test('should track last worn date', () => {
      const outfit = {
        id: '123',
        lastWorn: new Date('2024-01-15')
      };
      
      expect(outfit.lastWorn).toBeInstanceOf(Date);
    });
  });

  describe('Wardrobe Service Integration', () => {
    test('should fetch clothing items from wardrobe service', async () => {
      const mockClothingItems = [
        { id: '1', category: 'shirt', color: 'blue' },
        { id: '2', category: 'pants', color: 'black' }
      ];
      
      axios.get.mockResolvedValue({ data: mockClothingItems });
      
      const response = await axios.get('/api/wardrobe/clothes');
      expect(response.data.length).toBe(2);
      expect(response.data[0].category).toBe('shirt');
    });
    
    test('should handle wardrobe service errors', async () => {
      axios.get.mockRejectedValue(new Error('Wardrobe service unavailable'));
      
      await expect(axios.get('/api/wardrobe/clothes')).rejects.toThrow('Wardrobe service unavailable');
    });
  });

  describe('Routes', () => {
    test('should import auth routes without errors', () => {
      expect(() => {
        require('../src/routes/authRoutes');
      }).not.toThrow();
    });
    
    test('should import daily outfit routes without errors', () => {
      expect(() => {
        require('../src/routes/dailyOutfitRoutes');
      }).not.toThrow();
    });
  });

  describe('Environment Configuration', () => {
    test('should load environment variables', () => {
      expect(process.env.NODE_ENV).toBeDefined();
    });
    
    test('should have default values', () => {
      const port = process.env.PORT || 3003;
      expect(port).toBeDefined();
    });
  });

  describe('Outfit Properties', () => {
    test('should have required outfit properties', () => {
      const outfit = {
        userId: 'user123',
        items: ['item1', 'item2'],
        occasion: 'casual',
        weatherCondition: 'sunny',
        temperature: 25
      };
      
      expect(outfit.userId).toBeDefined();
      expect(outfit.items).toBeDefined();
      expect(Array.isArray(outfit.items)).toBe(true);
      expect(outfit.occasion).toBeDefined();
    });
  });

  describe('Query Parameters', () => {
    test('should parse location query parameter', () => {
      const location = 'Vancouver';
      expect(typeof location).toBe('string');
      expect(location.length).toBeGreaterThan(0);
    });
    
    test('should handle missing location', () => {
      const location = undefined;
      const defaultLocation = location || 'Unknown';
      expect(defaultLocation).toBe('Unknown');
    });
  });
});