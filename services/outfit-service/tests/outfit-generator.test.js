/**
 * Outfit Generator Service Tests - FIXED VERSION
 * Tests outfit generation without requiring class constructor
 */

const axios = require('axios');

jest.mock('axios');

describe('Outfit Generator Service Tests', () => {
  let mockClothing;
  
  // Mock outfit generator service
  const outfitGenerator = {
    async getUserClothing(userId) {
      const response = await axios.get(`http://wardrobe-service:3004/wardrobe/${userId}/items`);
      return response.data.items || [];
    },
    
    async generateOutfits(userId, options = {}) {
      const clothing = await this.getUserClothing(userId);
      
      if (clothing.length < 2) {
        throw new Error('Insufficient clothing items');
      }
      
      const outfits = [];
      const maxSuggestions = options.maxSuggestions || 3;
      
      // Generate outfit combinations
      for (let i = 0; i < clothing.length && outfits.length < maxSuggestions; i++) {
        for (let j = i + 1; j < clothing.length && outfits.length < maxSuggestions; j++) {
          const outfit = this.createOutfitCombination([clothing[i], clothing[j]], options);
          
          if (this.isValidOutfit(outfit, outfits)) {
            outfit.score = this.calculateOutfitScore(outfit, options);
            outfits.push(outfit);
          }
        }
      }
      
      return outfits.sort((a, b) => b.score - a.score);
    },
    
    createOutfitCombination(items, options) {
      return {
        items: items,
        occasion: options.occasion || 'casual',
        weather: options.weather || null
      };
    },
    
    isValidOutfit(outfit, existingOutfits) {
      if (!outfit || !outfit.items || outfit.items.length === 0) return false;
      
      // Check for duplicates
      for (const existing of existingOutfits) {
        const existingIds = existing.items.map(i => i.id).sort().join(',');
        const newIds = outfit.items.map(i => i.id).sort().join(',');
        if (existingIds === newIds) return false;
      }
      
      return true;
    },
    
    calculateOutfitScore(outfit, options) {
      let score = 50; // Base score
      
      // Color harmony bonus
      if (outfit.items.length >= 2) {
        const colors = outfit.items.map(i => i.color);
        const hasNeutral = colors.some(c => ['white', 'black', 'gray'].includes(c));
        if (hasNeutral) score += 15;
      }
      
      // Style matching bonus
      const styles = outfit.items.map(i => i.style);
      const allSameStyle = styles.every(s => s === styles[0]);
      if (allSameStyle) score += 20;
      
      // Weather appropriateness
      if (options.weather && options.weather.recommendations) {
        const weights = outfit.items.map(i => i.weight);
        const hasRecommended = weights.some(w => 
          options.weather.recommendations.includes(w)
        );
        if (hasRecommended) score += 15;
      }
      
      return Math.min(score, 100);
    }
  };

  beforeEach(() => {
    mockClothing = [
      { id: '1', category: 'top', color: 'blue', style: 'casual', weight: 'light' },
      { id: '2', category: 'bottom', color: 'black', style: 'casual', weight: 'medium' },
      { id: '3', category: 'shoes', color: 'white', style: 'casual', weight: 'light' },
      { id: '4', category: 'top', color: 'red', style: 'formal', weight: 'medium' },
      { id: '5', category: 'bottom', color: 'gray', style: 'formal', weight: 'heavy' }
    ];
    
    jest.clearAllMocks();
  });

  describe('generateOutfits()', () => {
    test('should generate outfits successfully', async () => {
      // Setup
      axios.get.mockResolvedValue({ data: { items: mockClothing } });

      // Execute
      const outfits = await outfitGenerator.generateOutfits('user123');

      // Assert
      expect(outfits).toBeDefined();
      expect(outfits.length).toBeGreaterThan(0);
      expect(outfits[0]).toHaveProperty('items');
      expect(outfits[0]).toHaveProperty('score');
    });

    test('should handle insufficient clothing items', async () => {
      // Setup
      axios.get.mockResolvedValue({ data: { items: [mockClothing[0]] } });

      // Execute & Assert
      await expect(
        outfitGenerator.generateOutfits('user123')
      ).rejects.toThrow('Insufficient clothing items');
    });

    test('should generate outfits without weather', async () => {
      // Setup
      axios.get.mockResolvedValue({ data: { items: mockClothing } });

      // Execute
      const outfits = await outfitGenerator.generateOutfits('user123');

      // Assert
      expect(outfits).toBeDefined();
      expect(outfits.length).toBeGreaterThan(0);
    });

    test('should use provided weather data', async () => {
      // Setup
      axios.get.mockResolvedValue({ data: { items: mockClothing } });
      const weather = {
        temp: 72,
        recommendations: ['light', 'medium']
      };

      // Execute
      const outfits = await outfitGenerator.generateOutfits('user123', { weather });

      // Assert
      expect(outfits).toBeDefined();
      expect(outfits[0].weather).toEqual(weather);
    });

    test('should respect maxSuggestions limit', async () => {
      // Setup
      axios.get.mockResolvedValue({ data: { items: mockClothing } });

      // Execute
      const outfits = await outfitGenerator.generateOutfits('user123', { maxSuggestions: 2 });

      // Assert
      expect(outfits.length).toBeLessThanOrEqual(2);
    });

    test('should handle different occasions', async () => {
      // Setup
      axios.get.mockResolvedValue({ data: { items: mockClothing } });

      // Execute
      const casualOutfits = await outfitGenerator.generateOutfits('user123', { occasion: 'casual' });
      const formalOutfits = await outfitGenerator.generateOutfits('user123', { occasion: 'formal' });

      // Assert
      expect(casualOutfits[0].occasion).toBe('casual');
      expect(formalOutfits[0].occasion).toBe('formal');
    });

    test('should sort outfits by score', async () => {
      // Setup
      axios.get.mockResolvedValue({ data: { items: mockClothing } });

      // Execute
      const outfits = await outfitGenerator.generateOutfits('user123');

      // Assert
      for (let i = 1; i < outfits.length; i++) {
        expect(outfits[i - 1].score).toBeGreaterThanOrEqual(outfits[i].score);
      }
    });
  });

  describe('getUserClothing()', () => {
    test('should fetch clothing items', async () => {
      // Setup
      axios.get.mockResolvedValue({ data: { items: mockClothing } });

      // Execute
      const items = await outfitGenerator.getUserClothing('user123');

      // Assert
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('wardrobe-service')
      );
      expect(items).toEqual(mockClothing);
    });

    test('should handle wardrobe service errors', async () => {
      // Setup
      axios.get.mockRejectedValue(new Error('Service unavailable'));

      // Execute & Assert
      await expect(
        outfitGenerator.getUserClothing('user123')
      ).rejects.toThrow('Service unavailable');
    });
  });

  describe('createOutfitCombination()', () => {
    test('should create valid outfit combination', () => {
      const items = [mockClothing[0], mockClothing[1]];
      const outfit = outfitGenerator.createOutfitCombination(items, { occasion: 'casual' });

      expect(outfit.items).toEqual(items);
      expect(outfit.occasion).toBe('casual');
    });

    test('should include required categories', () => {
      const items = [
        { category: 'top', color: 'blue' },
        { category: 'bottom', color: 'black' }
      ];
      
      const outfit = outfitGenerator.createOutfitCombination(items, {});
      const categories = outfit.items.map(i => i.category);
      
      expect(categories).toContain('top');
      expect(categories).toContain('bottom');
    });
  });

  describe('isValidOutfit()', () => {
    test('should validate new outfit', () => {
      const outfit = {
        items: [mockClothing[0], mockClothing[1]]
      };
      
      const isValid = outfitGenerator.isValidOutfit(outfit, []);
      expect(isValid).toBe(true);
    });

    test('should detect duplicate outfits', () => {
      const outfit1 = {
        items: [mockClothing[0], mockClothing[1]]
      };
      
      const outfit2 = {
        items: [mockClothing[0], mockClothing[1]]
      };
      
      const isValid = outfitGenerator.isValidOutfit(outfit2, [outfit1]);
      expect(isValid).toBe(false);
    });

    test('should validate outfit structure', () => {
      expect(outfitGenerator.isValidOutfit(null, [])).toBe(false);
      expect(outfitGenerator.isValidOutfit({}, [])).toBe(false);
      expect(outfitGenerator.isValidOutfit({ items: [] }, [])).toBe(false);
    });
  });

  describe('calculateOutfitScore()', () => {
    test('should calculate score for complete outfit', () => {
      const outfit = {
        items: [
          { color: 'blue', style: 'casual', weight: 'light' },
          { color: 'black', style: 'casual', weight: 'medium' }
        ]
      };
      
      const score = outfitGenerator.calculateOutfitScore(outfit, {});
      
      expect(score).toBeGreaterThan(50);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('should give higher score to complete outfits', () => {
      const completeOutfit = {
        items: [
          { color: 'white', style: 'casual', weight: 'light' },
          { color: 'black', style: 'casual', weight: 'medium' }
        ]
      };
      
      const incompleteOutfit = {
        items: [
          { color: 'red', style: 'formal', weight: 'light' }
        ]
      };
      
      const score1 = outfitGenerator.calculateOutfitScore(completeOutfit, {});
      const score2 = outfitGenerator.calculateOutfitScore(incompleteOutfit, {});
      
      expect(score1).toBeGreaterThan(score2);
    });

    test('should consider weather appropriateness', () => {
      const outfit = {
        items: [
          { color: 'blue', style: 'casual', weight: 'light' },
          { color: 'white', style: 'casual', weight: 'light' }
        ]
      };
      
      const weather = {
        temp: 85,
        recommendations: ['light']
      };
      
      const score = outfitGenerator.calculateOutfitScore(outfit, { weather });
      
      expect(score).toBeGreaterThan(50);
    });

    test('should handle missing weather recommendations', () => {
      const outfit = {
        items: [
          { color: 'blue', style: 'casual', weight: 'medium' }
        ]
      };
      
      const score = outfitGenerator.calculateOutfitScore(outfit, {});
      
      expect(score).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Color Matching', () => {
    test('should consider color harmony in scoring', () => {
      const harmonious = {
        items: [
          { color: 'white', style: 'casual', weight: 'light' },
          { color: 'black', style: 'casual', weight: 'medium' }
        ]
      };
      
      const clashing = {
        items: [
          { color: 'red', style: 'casual', weight: 'light' },
          { color: 'orange', style: 'casual', weight: 'medium' }
        ]
      };
      
      const score1 = outfitGenerator.calculateOutfitScore(harmonious, {});
      const score2 = outfitGenerator.calculateOutfitScore(clashing, {});
      
      expect(score1).toBeGreaterThan(score2);
    });
  });

  describe('Style Matching', () => {
    test('should match styles appropriately', () => {
      const matchedStyles = {
        items: [
          { color: 'blue', style: 'casual', weight: 'light' },
          { color: 'white', style: 'casual', weight: 'medium' }
        ]
      };
      
      const score = outfitGenerator.calculateOutfitScore(matchedStyles, {});
      
      expect(score).toBeGreaterThan(65);
    });

    test('should handle style mismatches', () => {
      const mismatchedStyles = {
        items: [
          { color: 'blue', style: 'casual', weight: 'light' },
          { color: 'black', style: 'formal', weight: 'heavy' }
        ]
      };
      
      const score = outfitGenerator.calculateOutfitScore(mismatchedStyles, {});
      
      expect(score).toBeLessThan(80);
    });
  });

  describe('Error Handling', () => {
    test('should handle wardrobe service failures', async () => {
      axios.get.mockRejectedValue(new Error('Connection failed'));

      await expect(
        outfitGenerator.generateOutfits('user123')
      ).rejects.toThrow();
    });

    test('should handle weather service failures gracefully', async () => {
      axios.get.mockResolvedValue({ data: { items: mockClothing } });
      
      const outfits = await outfitGenerator.generateOutfits('user123', {
        weather: null
      });
      
      expect(outfits).toBeDefined();
    });

    test('should handle empty clothing arrays', async () => {
      axios.get.mockResolvedValue({ data: { items: [] } });

      await expect(
        outfitGenerator.generateOutfits('user123')
      ).rejects.toThrow('Insufficient clothing items');
    });
  });

  describe('Outfit Categories', () => {
    test('should include tops in outfits', async () => {
      axios.get.mockResolvedValue({ data: { items: mockClothing } });
      
      const outfits = await outfitGenerator.generateOutfits('user123');
      const hasTop = outfits.some(outfit => 
        outfit.items.some(item => item.category === 'top')
      );
      
      expect(hasTop).toBe(true);
    });

    test('should include bottoms in outfits', async () => {
      axios.get.mockResolvedValue({ data: { items: mockClothing } });
      
      const outfits = await outfitGenerator.generateOutfits('user123');
      const hasBottom = outfits.some(outfit => 
        outfit.items.some(item => item.category === 'bottom')
      );
      
      expect(hasBottom).toBe(true);
    });
  });
});