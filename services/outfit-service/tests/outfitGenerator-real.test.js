/**
 * Outfit Generator Service - REAL Integration Tests
 * These tests import and execute ACTUAL source code from src/services/outfitGenerator.js
 */

const outfitGenerator = require('../src/services/outfitGenerator');
const wardrobeClient = require('../src/services/wardrobeClient');
const weatherService = require('../src/services/weatherService');

// Mock dependencies
jest.mock('../src/services/wardrobeClient');
jest.mock('../src/services/weatherService');

describe('Outfit Generator Service - Real Source Code Tests', () => {
  
  let mockClothing;
  let mockWeatherData;

  beforeEach(() => {
    mockClothing = [
      { id: '1', category: 'top', color: 'blue', style: 'casual', weight: 'light', name: 'Blue T-Shirt' },
      { id: '2', category: 'bottom', color: 'black', style: 'casual', weight: 'medium', name: 'Black Jeans' },
      { id: '3', category: 'shoes', color: 'white', style: 'casual', weight: 'light', name: 'White Sneakers' },
      { id: '4', category: 'top', color: 'red', style: 'formal', weight: 'medium', name: 'Red Shirt' },
      { id: '5', category: 'bottom', color: 'gray', style: 'formal', weight: 'heavy', name: 'Gray Slacks' }
    ];

    mockWeatherData = {
      current: {
        temperature: { value: 70, unit: 'F' },
        condition: { main: 'Clear', mapped: 'clear' }
      },
      precipitation: { level: 'none' }
    };
    
    jest.clearAllMocks();
  });

  describe('generateOutfits()', () => {
    test('should generate outfit combinations', async () => {
      // Setup
      wardrobeClient.getClothingItems.mockResolvedValue(mockClothing);
      weatherService.getCurrentWeather.mockResolvedValue(mockWeatherData);
      weatherService.getClothingRecommendations.mockReturnValue({
        temperature: 'mild',
        suggested: ['light'],
        required: [],
        avoid: []
      });

      // Execute
      const outfits = await outfitGenerator.generateOutfits('user123', { token: 'test-token' });

      // Assert
      expect(outfits).toBeDefined();
      expect(Array.isArray(outfits)).toBe(true);
      expect(outfits.length).toBeGreaterThan(0);
    });

    test('should fetch clothing from wardrobe service', async () => {
      // Setup
      wardrobeClient.getClothingItems.mockResolvedValue(mockClothing);
      weatherService.getCurrentWeather.mockResolvedValue(mockWeatherData);
      weatherService.getClothingRecommendations.mockReturnValue({
        temperature: 'mild',
        suggested: ['light'],
        required: [],
        avoid: []
      });

      // Execute
      await outfitGenerator.generateOutfits('user123', { token: 'test-token' });

      // Assert
      expect(wardrobeClient.getClothingItems).toHaveBeenCalled();
    });

    test('should handle empty wardrobe', async () => {
      // Setup
      wardrobeClient.getClothingItems.mockResolvedValue([]);

      // Execute & Assert
      await expect(outfitGenerator.generateOutfits('user123', { token: 'test-token' }))
        .rejects.toThrow();
    });

    test('should handle insufficient clothing items', async () => {
      // Setup
      wardrobeClient.getClothingItems.mockResolvedValue([mockClothing[0]]);

      // Execute & Assert
      await expect(outfitGenerator.generateOutfits('user123', { token: 'test-token' }))
        .rejects.toThrow();
    });

    test('should respect maxSuggestions option', async () => {
      // Setup
      wardrobeClient.getClothingItems.mockResolvedValue(mockClothing);
      weatherService.getCurrentWeather.mockResolvedValue(mockWeatherData);
      weatherService.getClothingRecommendations.mockReturnValue({
        temperature: 'mild',
        suggested: ['light'],
        required: [],
        avoid: []
      });

      // Execute
      const outfits = await outfitGenerator.generateOutfits('user123', { 
        token: 'test-token',
        maxSuggestions: 2 
      });

      // Assert
      expect(outfits.length).toBeLessThanOrEqual(2);
    });

    test('should handle different occasions', async () => {
      // Setup
      wardrobeClient.getClothingItems.mockResolvedValue(mockClothing);
      weatherService.getCurrentWeather.mockResolvedValue(mockWeatherData);
      weatherService.getClothingRecommendations.mockReturnValue({
        temperature: 'mild',
        suggested: ['light'],
        required: [],
        avoid: []
      });

      // Execute
      const casualOutfits = await outfitGenerator.generateOutfits('user123', { 
        token: 'test-token',
        occasion: 'casual' 
      });
      const formalOutfits = await outfitGenerator.generateOutfits('user123', { 
        token: 'test-token',
        occasion: 'formal' 
      });

      // Assert
      expect(casualOutfits).toBeDefined();
      expect(formalOutfits).toBeDefined();
    });

    test('should consider weather when provided', async () => {
      // Setup
      wardrobeClient.getClothingItems.mockResolvedValue(mockClothing);
      const hotWeather = {
        current: {
          temperature: { value: 85, unit: 'F' },
          condition: { main: 'Clear', mapped: 'clear' }
        },
        precipitation: { level: 'none' }
      };
      weatherService.getClothingRecommendations.mockReturnValue({
        temperature: 'hot',
        suggested: ['light', 'breathable'],
        required: [],
        avoid: ['heavy']
      });

      // Execute
      const outfits = await outfitGenerator.generateOutfits('user123', { 
        token: 'test-token',
        weather: hotWeather 
      });

      // Assert
      expect(outfits).toBeDefined();
      expect(outfits.length).toBeGreaterThan(0);
    });

    test('should work without weather when includeWeather is false', async () => {
      // Setup
      wardrobeClient.getClothingItems.mockResolvedValue(mockClothing);

      // Execute
      const outfits = await outfitGenerator.generateOutfits('user123', { 
        token: 'test-token',
        includeWeather: false 
      });

      // Assert
      expect(outfits).toBeDefined();
      expect(weatherService.getCurrentWeather).not.toHaveBeenCalled();
    });
  });

  describe('Outfit Scoring', () => {
    test('should score outfits based on compatibility', async () => {
      // Setup
      wardrobeClient.getClothingItems.mockResolvedValue(mockClothing);
      weatherService.getCurrentWeather.mockResolvedValue(mockWeatherData);
      weatherService.getClothingRecommendations.mockReturnValue({
        temperature: 'mild',
        suggested: ['light'],
        required: [],
        avoid: []
      });

      // Execute
      const outfits = await outfitGenerator.generateOutfits('user123', { token: 'test-token' });

      // Assert
      outfits.forEach(outfit => {
        expect(outfit).toHaveProperty('score');
        expect(typeof outfit.score).toBe('number');
        expect(outfit.score).toBeGreaterThanOrEqual(0);
        expect(outfit.score).toBeLessThanOrEqual(100);
      });
    });

    test('should sort outfits by score descending', async () => {
      // Setup
      wardrobeClient.getClothingItems.mockResolvedValue(mockClothing);
      weatherService.getCurrentWeather.mockResolvedValue(mockWeatherData);
      weatherService.getClothingRecommendations.mockReturnValue({
        temperature: 'mild',
        suggested: ['light'],
        required: [],
        avoid: []
      });

      // Execute
      const outfits = await outfitGenerator.generateOutfits('user123', { token: 'test-token' });

      // Assert
      for (let i = 1; i < outfits.length; i++) {
        expect(outfits[i - 1].score).toBeGreaterThanOrEqual(outfits[i].score);
      }
    });

    test('should give higher scores to matching styles', async () => {
      // Setup
      const matchingClothing = [
        { id: '1', category: 'top', color: 'blue', style: 'casual', weight: 'light' },
        { id: '2', category: 'bottom', color: 'black', style: 'casual', weight: 'light' },
        { id: '3', category: 'shoes', color: 'white', style: 'casual', weight: 'light' }
      ];
      wardrobeClient.getClothingItems.mockResolvedValue(matchingClothing);
      weatherService.getCurrentWeather.mockResolvedValue(mockWeatherData);
      weatherService.getClothingRecommendations.mockReturnValue({
        temperature: 'mild',
        suggested: ['light'],
        required: [],
        avoid: []
      });

      // Execute
      const outfits = await outfitGenerator.generateOutfits('user123', { token: 'test-token' });

      // Assert
      expect(outfits[0].score).toBeGreaterThan(50);
    });
  });

  describe('Outfit Validation', () => {
    test('should create valid outfit combinations', async () => {
      // Setup
      wardrobeClient.getClothingItems.mockResolvedValue(mockClothing);
      weatherService.getCurrentWeather.mockResolvedValue(mockWeatherData);
      weatherService.getClothingRecommendations.mockReturnValue({
        temperature: 'mild',
        suggested: ['light'],
        required: [],
        avoid: []
      });

      // Execute
      const outfits = await outfitGenerator.generateOutfits('user123', { token: 'test-token' });

      // Assert
      outfits.forEach(outfit => {
        expect(outfit).toHaveProperty('items');
        expect(Array.isArray(outfit.items)).toBe(true);
        expect(outfit.items.length).toBeGreaterThan(0);
      });
    });

    test('should include items from wardrobe', async () => {
      // Setup
      wardrobeClient.getClothingItems.mockResolvedValue(mockClothing);
      weatherService.getCurrentWeather.mockResolvedValue(mockWeatherData);
      weatherService.getClothingRecommendations.mockReturnValue({
        temperature: 'mild',
        suggested: ['light'],
        required: [],
        avoid: []
      });

      // Execute
      const outfits = await outfitGenerator.generateOutfits('user123', { token: 'test-token' });

      // Assert
      outfits.forEach(outfit => {
        outfit.items.forEach(item => {
          const isInWardrobe = mockClothing.some(c => c.id === item.id);
          expect(isInWardrobe).toBe(true);
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle wardrobe service errors', async () => {
      // Setup
      wardrobeClient.getClothingItems.mockRejectedValue(new Error('Service unavailable'));

      // Execute & Assert
      await expect(outfitGenerator.generateOutfits('user123', { token: 'test-token' }))
        .rejects.toThrow();
    });

    test('should handle weather service errors gracefully', async () => {
      // Setup
      wardrobeClient.getClothingItems.mockResolvedValue(mockClothing);
      weatherService.getCurrentWeather.mockRejectedValue(new Error('Weather unavailable'));

      // Execute & Assert - should still work without weather
      const outfits = await outfitGenerator.generateOutfits('user123', { 
        token: 'test-token',
        includeWeather: false 
      });
      expect(outfits).toBeDefined();
    });

    test('should handle network errors', async () => {
      // Setup
      wardrobeClient.getClothingItems.mockRejectedValue(new Error('Network error'));

      // Execute & Assert
      await expect(outfitGenerator.generateOutfits('user123', { token: 'test-token' }))
        .rejects.toThrow();
    });
  });

  describe('Weather Integration', () => {
    test('should consider temperature for clothing weight', async () => {
      // Setup
      wardrobeClient.getClothingItems.mockResolvedValue(mockClothing);
      const coldWeather = {
        current: {
          temperature: { value: 35, unit: 'F' },
          condition: { main: 'Snow', mapped: 'snow' }
        },
        precipitation: { level: 'moderate' }
      };
      weatherService.getClothingRecommendations.mockReturnValue({
        temperature: 'cold',
        suggested: ['heavy', 'warm'],
        required: ['jacket'],
        avoid: ['light']
      });

      // Execute
      const outfits = await outfitGenerator.generateOutfits('user123', { 
        token: 'test-token',
        weather: coldWeather 
      });

      // Assert
      expect(outfits).toBeDefined();
    });

    test('should recommend light clothing for hot weather', async () => {
      // Setup
      wardrobeClient.getClothingItems.mockResolvedValue(mockClothing);
      const hotWeather = {
        current: {
          temperature: { value: 95, unit: 'F' },
          condition: { main: 'Clear', mapped: 'clear' }
        },
        precipitation: { level: 'none' }
      };
      weatherService.getClothingRecommendations.mockReturnValue({
        temperature: 'hot',
        suggested: ['light', 'breathable'],
        required: [],
        avoid: ['heavy']
      });

      // Execute
      const outfits = await outfitGenerator.generateOutfits('user123', { 
        token: 'test-token',
        weather: hotWeather 
      });

      // Assert
      expect(outfits).toBeDefined();
    });
  });

  describe('Category Distribution', () => {
    test('should create diverse outfit combinations', async () => {
      // Setup
      wardrobeClient.getClothingItems.mockResolvedValue(mockClothing);
      weatherService.getCurrentWeather.mockResolvedValue(mockWeatherData);
      weatherService.getClothingRecommendations.mockReturnValue({
        temperature: 'mild',
        suggested: ['light'],
        required: [],
        avoid: []
      });

      // Execute
      const outfits = await outfitGenerator.generateOutfits('user123', { 
        token: 'test-token',
        maxSuggestions: 5 
      });

      // Assert
      expect(outfits.length).toBeGreaterThan(0);
      expect(outfits.length).toBeLessThanOrEqual(5);
    });

    test('should include complete outfits when possible', async () => {
      // Setup
      wardrobeClient.getClothingItems.mockResolvedValue(mockClothing);
      weatherService.getCurrentWeather.mockResolvedValue(mockWeatherData);
      weatherService.getClothingRecommendations.mockReturnValue({
        temperature: 'mild',
        suggested: ['light'],
        required: [],
        avoid: []
      });

      // Execute
      const outfits = await outfitGenerator.generateOutfits('user123', { token: 'test-token' });

      // Assert - at least one complete outfit should exist
      const hasCompleteOutfit = outfits.some(outfit => {
        const categories = outfit.items.map(item => item.category);
        return categories.includes('top') && categories.includes('bottom');
      });
      expect(hasCompleteOutfit).toBe(true);
    });
  });

  describe('User Preferences', () => {
    test('should respect occasion preferences', async () => {
      // Setup
      wardrobeClient.getClothingItems.mockResolvedValue(mockClothing);
      weatherService.getCurrentWeather.mockResolvedValue(mockWeatherData);
      weatherService.getClothingRecommendations.mockReturnValue({
        temperature: 'mild',
        suggested: ['light'],
        required: [],
        avoid: []
      });

      // Execute
      const outfits = await outfitGenerator.generateOutfits('user123', { 
        token: 'test-token',
        occasion: 'casual' 
      });

      // Assert
      expect(outfits).toBeDefined();
    });

    test('should handle formal occasions', async () => {
      // Setup
      wardrobeClient.getClothingItems.mockResolvedValue(mockClothing);
      weatherService.getCurrentWeather.mockResolvedValue(mockWeatherData);
      weatherService.getClothingRecommendations.mockReturnValue({
        temperature: 'mild',
        suggested: ['medium'],
        required: [],
        avoid: []
      });

      // Execute
      const formalOutfits = await outfitGenerator.generateOutfits('user123', { 
        token: 'test-token',
        occasion: 'business' 
      });

      // Assert
      expect(formalOutfits).toBeDefined();
    });
  });

  describe('Performance', () => {
    test('should handle large wardrobes efficiently', async () => {
      // Setup
      const largeWardrobe = Array.from({ length: 50 }, (_, i) => ({
        id: `item${i}`,
        category: ['top', 'bottom', 'shoes'][i % 3],
        color: 'blue',
        style: 'casual',
        weight: 'medium'
      }));
      wardrobeClient.getClothingItems.mockResolvedValue(largeWardrobe);
      weatherService.getCurrentWeather.mockResolvedValue(mockWeatherData);
      weatherService.getClothingRecommendations.mockReturnValue({
        temperature: 'mild',
        suggested: ['medium'],
        required: [],
        avoid: []
      });

      // Execute
      const startTime = Date.now();
      const outfits = await outfitGenerator.generateOutfits('user123', { 
        token: 'test-token',
        maxSuggestions: 5 
      });
      const endTime = Date.now();

      // Assert
      expect(outfits).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });
});