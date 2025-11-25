/**
 * Style Matching Algorithm - REAL Integration Tests
 * These tests import and execute ACTUAL source code from src/algorithms/styleMatching.js
 */

const { styleMatching } = require('../src/algorithms/styleMatching');

describe('Style Matching Algorithm - Real Source Code Tests', () => {
  
  describe('getStyleCompatibility()', () => {
    test('should give high compatibility to same styles', () => {
      const score = styleMatching.getStyleCompatibility('casual', 'casual');
      expect(score).toBeGreaterThanOrEqual(0.9);
    });

    test('should give high compatibility to similar styles', () => {
      const score = styleMatching.getStyleCompatibility('casual', 'relaxed');
      expect(score).toBeGreaterThan(0.7);
    });

    test('should give low compatibility to opposite styles', () => {
      const score = styleMatching.getStyleCompatibility('formal', 'athletic');
      expect(score).toBeLessThan(0.6);
    });

    test('should handle formal and casual mix', () => {
      const score = styleMatching.getStyleCompatibility('formal', 'casual');
      expect(score).toBeLessThan(0.7);
    });

    test('should handle case insensitivity', () => {
      const score = styleMatching.getStyleCompatibility('CASUAL', 'casual');
      expect(score).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('getOutfitStyleScore()', () => {
    test('should score matching styles highly', () => {
      const items = [
        { style: 'casual' },
        { style: 'casual' },
        { style: 'relaxed' }
      ];
      
      const score = styleMatching.getOutfitStyleScore(items);
      expect(score).toBeGreaterThan(0.7);
    });

    test('should score mismatched styles lower', () => {
      const items = [
        { style: 'formal' },
        { style: 'casual' },
        { style: 'athletic' }
      ];
      
      const score = styleMatching.getOutfitStyleScore(items);
      expect(score).toBeLessThan(0.7);
    });

    test('should handle single item outfit', () => {
      const items = [{ style: 'casual' }];
      
      const score = styleMatching.getOutfitStyleScore(items);
      expect(score).toBe(1);
    });

    test('should handle empty outfit', () => {
      const score = styleMatching.getOutfitStyleScore([]);
      expect(score).toBe(1);
    });

    test('should handle monochromatic style outfit', () => {
      const items = [
        { style: 'business' },
        { style: 'business' },
        { style: 'business' }
      ];
      
      const score = styleMatching.getOutfitStyleScore(items);
      expect(score).toBeGreaterThan(0.9);
    });
  });

  describe('Style Groups', () => {
    test('should group casual styles together', () => {
      const casual1 = styleMatching.getStyleCompatibility('casual', 'relaxed');
      const casual2 = styleMatching.getStyleCompatibility('casual', 'comfortable');
      
      expect(casual1).toBeGreaterThan(0.7);
      expect(casual2).toBeGreaterThan(0.7);
    });

    test('should group formal styles together', () => {
      const formal1 = styleMatching.getStyleCompatibility('formal', 'business');
      const formal2 = styleMatching.getStyleCompatibility('formal', 'elegant');
      
      expect(formal1).toBeGreaterThan(0.7);
      expect(formal2).toBeGreaterThan(0.7);
    });

    test('should group sporty styles together', () => {
      const sporty1 = styleMatching.getStyleCompatibility('sporty', 'athletic');
      const sporty2 = styleMatching.getStyleCompatibility('athletic', 'active');
      
      expect(sporty1).toBeGreaterThan(0.7);
      expect(sporty2).toBeGreaterThan(0.7);
    });
  });

  describe('Occasion Matching', () => {
    test('should match style to occasion', () => {
      const formalScore = styleMatching.matchStyleToOccasion('formal', 'wedding');
      const casualScore = styleMatching.matchStyleToOccasion('casual', 'casual');
      
      expect(formalScore).toBeGreaterThan(0.7);
      expect(casualScore).toBeGreaterThan(0.7);
    });

    test('should give low score for mismatched style and occasion', () => {
      const score = styleMatching.matchStyleToOccasion('athletic', 'wedding');
      expect(score).toBeLessThan(0.5);
    });

    test('should handle unknown occasions', () => {
      const score = styleMatching.matchStyleToOccasion('casual', 'unknown');
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('getStyleGroup()', () => {
    test('should identify casual group', () => {
      expect(styleMatching.getStyleGroup('casual')).toBe('casual');
      expect(styleMatching.getStyleGroup('relaxed')).toBe('casual');
    });

    test('should identify formal group', () => {
      expect(styleMatching.getStyleGroup('formal')).toBe('formal');
      expect(styleMatching.getStyleGroup('business')).toBe('formal');
    });

    test('should identify athletic group', () => {
      expect(styleMatching.getStyleGroup('athletic')).toBe('athletic');
      expect(styleMatching.getStyleGroup('sporty')).toBe('athletic');
    });

    test('should handle case insensitivity', () => {
      expect(styleMatching.getStyleGroup('CASUAL')).toBe('casual');
      expect(styleMatching.getStyleGroup('FORMAL')).toBe('formal');
    });
  });

  describe('validateOutfitStyles()', () => {
    test('should validate cohesive outfit', () => {
      const items = [
        { style: 'casual' },
        { style: 'casual' },
        { style: 'relaxed' }
      ];
      
      const validation = styleMatching.validateOutfitStyles(items);
      expect(validation.isValid).toBe(true);
      expect(validation.styleScore).toBeGreaterThan(0.7);
    });

    test('should detect style conflicts', () => {
      const items = [
        { style: 'formal' },
        { style: 'athletic' }
      ];
      
      const validation = styleMatching.validateOutfitStyles(items);
      expect(validation).toHaveProperty('issues');
      expect(Array.isArray(validation.issues)).toBe(true);
    });

    test('should provide suggestions', () => {
      const items = [
        { style: 'casual' },
        { style: 'formal' }
      ];
      
      const validation = styleMatching.validateOutfitStyles(items);
      expect(validation).toHaveProperty('suggestions');
      expect(Array.isArray(validation.suggestions)).toBe(true);
    });

    test('should handle empty outfit', () => {
      const validation = styleMatching.validateOutfitStyles([]);
      expect(validation).toHaveProperty('isValid');
    });
  });

  describe('Edge Cases', () => {
    test('should handle null styles', () => {
      expect(() => styleMatching.getStyleGroup(null)).not.toThrow();
    });

    test('should handle undefined styles', () => {
      expect(() => styleMatching.getStyleGroup(undefined)).not.toThrow();
    });

    test('should handle empty strings', () => {
      expect(() => styleMatching.getStyleGroup('')).not.toThrow();
    });

    test('should handle unknown styles', () => {
      const result = styleMatching.getStyleCompatibility('unknownstyle1', 'unknownstyle2');
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('Outfit Style Analysis', () => {
    test('should analyze all-casual outfit', () => {
      const items = [
        { style: 'casual' },
        { style: 'casual' },
        { style: 'casual' }
      ];
      
      const score = styleMatching.getOutfitStyleScore(items);
      expect(score).toBeGreaterThan(0.9);
    });

    test('should analyze mixed-style outfit', () => {
      const items = [
        { style: 'casual' },
        { style: 'formal' },
        { style: 'sporty' }
      ];
      
      const score = styleMatching.getOutfitStyleScore(items);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    test('should analyze business casual outfit', () => {
      const items = [
        { style: 'business' },
        { style: 'casual' }
      ];
      
      const score = styleMatching.getOutfitStyleScore(items);
      expect(score).toBeGreaterThan(0.4);
      expect(score).toBeLessThan(0.95);
    });
  });

  describe('Style Compatibility Matrix', () => {
    test('should validate formal and business compatibility', () => {
      const score = styleMatching.getStyleCompatibility('formal', 'business');
      expect(score).toBeGreaterThan(0.7);
    });

    test('should validate casual and trendy compatibility', () => {
      const score = styleMatching.getStyleCompatibility('casual', 'trendy');
      expect(score).toBeGreaterThan(0.5);
    });

    test('should validate low compatibility between formal and athletic', () => {
      const score = styleMatching.getStyleCompatibility('formal', 'athletic');
      expect(score).toBeLessThan(0.4);
    });
  });

  describe('getStyleDistribution()', () => {
    test('should calculate style distribution', () => {
      const items = [
        { style: 'casual' },
        { style: 'casual' },
        { style: 'formal' }
      ];
      
      const distribution = styleMatching.getStyleDistribution(items);
      expect(distribution).toHaveProperty('casual');
      expect(distribution).toHaveProperty('formal');
      expect(distribution.casual).toBeGreaterThan(distribution.formal);
    });

    test('should handle single style', () => {
      const items = [
        { style: 'casual' },
        { style: 'casual' }
      ];
      
      const distribution = styleMatching.getStyleDistribution(items);
      expect(distribution.casual).toBe(100);
    });

    test('should handle empty outfit', () => {
      const distribution = styleMatching.getStyleDistribution([]);
      expect(typeof distribution).toBe('object');
    });
  });

  describe('Multiple Item Combinations', () => {
    test('should handle 4-item outfit', () => {
      const items = [
        { style: 'casual' },
        { style: 'casual' },
        { style: 'relaxed' },
        { style: 'comfortable' }
      ];
      
      const score = styleMatching.getOutfitStyleScore(items);
      expect(score).toBeGreaterThan(0.7);
    });

    test('should handle 2-item outfit', () => {
      const items = [
        { style: 'formal' },
        { style: 'business' }
      ];
      
      const score = styleMatching.getOutfitStyleScore(items);
      expect(score).toBeGreaterThan(0.7);
    });
  });
});