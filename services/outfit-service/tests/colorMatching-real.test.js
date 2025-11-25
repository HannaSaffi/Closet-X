/**
 * Color Matching Algorithm - REAL Integration Tests
 * These tests import and execute ACTUAL source code from src/algorithms/colorMatching.js
 */

const { colorMatching } = require('../src/algorithms/colorMatching');

describe('Color Matching Algorithm - Real Source Code Tests', () => {
  
  describe('getColorCompatibility()', () => {
    test('should give high compatibility to complementary colors', () => {
      const score = colorMatching.getColorCompatibility('red', 'green');
      expect(score).toBeGreaterThan(0.7);
    });

    test('should give high compatibility to analogous colors', () => {
      const score = colorMatching.getColorCompatibility('red', 'orange');
      expect(score).toBeGreaterThan(0.6);
    });

    test('should give high compatibility to neutral combinations', () => {
      const score1 = colorMatching.getColorCompatibility('white', 'red');
      const score2 = colorMatching.getColorCompatibility('black', 'blue');
      
      expect(score1).toBeGreaterThan(0.8);
      expect(score2).toBeGreaterThan(0.8);
    });

    test('should give same color perfect compatibility', () => {
      const score = colorMatching.getColorCompatibility('blue', 'blue');
      expect(score).toBe(1);
    });

    test('should handle case insensitivity', () => {
      const score = colorMatching.getColorCompatibility('RED', 'Green');
      expect(score).toBeGreaterThan(0.5);
    });
  });

  describe('isNeutralColor()', () => {
    test('should identify white as neutral', () => {
      expect(colorMatching.isNeutralColor('white')).toBe(true);
      expect(colorMatching.isNeutralColor('WHITE')).toBe(true);
    });

    test('should identify black as neutral', () => {
      expect(colorMatching.isNeutralColor('black')).toBe(true);
    });

    test('should identify gray as neutral', () => {
      expect(colorMatching.isNeutralColor('gray')).toBe(true);
      expect(colorMatching.isNeutralColor('grey')).toBe(true);
    });

    test('should identify beige and brown as neutral', () => {
      expect(colorMatching.isNeutralColor('beige')).toBe(true);
      expect(colorMatching.isNeutralColor('brown')).toBe(true);
    });

    test('should reject non-neutral colors', () => {
      expect(colorMatching.isNeutralColor('red')).toBe(false);
      expect(colorMatching.isNeutralColor('blue')).toBe(false);
    });
  });

  describe('getOutfitColorHarmony()', () => {
    test('should calculate harmony for complementary outfit', () => {
      const items = [
        { color: 'red' },
        { color: 'green' }
      ];
      
      const harmony = colorMatching.getOutfitColorHarmony(items);
      expect(harmony).toBeGreaterThan(0.7);
      expect(harmony).toBeLessThanOrEqual(1);
    });

    test('should give high harmony to neutral combinations', () => {
      const items = [
        { color: 'white' },
        { color: 'black' },
        { color: 'red' }
      ];
      
      const harmony = colorMatching.getOutfitColorHarmony(items);
      expect(harmony).toBeGreaterThan(0.7);
    });

    test('should handle single item', () => {
      const items = [{ color: 'blue' }];
      
      const harmony = colorMatching.getOutfitColorHarmony(items);
      expect(harmony).toBe(1);
    });

    test('should handle empty array', () => {
      const harmony = colorMatching.getOutfitColorHarmony([]);
      expect(harmony).toBe(1);
    });

    test('should handle monochromatic outfit', () => {
      const items = [
        { color: 'blue' },
        { color: 'blue' },
        { color: 'blue' }
      ];
      
      const harmony = colorMatching.getOutfitColorHarmony(items);
      expect(harmony).toBe(1);
    });
  });

  describe('matchWithNeutral()', () => {
    test('should match any color with neutral', () => {
      const score1 = colorMatching.matchWithNeutral('red', 'white');
      const score2 = colorMatching.matchWithNeutral('blue', 'black');
      
      expect(score1).toBeGreaterThan(0.8);
      expect(score2).toBeGreaterThan(0.8);
    });

    test('should match neutral with neutral', () => {
      const score = colorMatching.matchWithNeutral('white', 'black');
      expect(score).toBeGreaterThan(0.8);
    });
  });

  describe('getColorTemperature()', () => {
    test('should identify warm colors', () => {
      expect(colorMatching.getColorTemperature('red')).toBe('warm');
      expect(colorMatching.getColorTemperature('orange')).toBe('warm');
      expect(colorMatching.getColorTemperature('yellow')).toBe('warm');
    });

    test('should identify cool colors', () => {
      expect(colorMatching.getColorTemperature('blue')).toBe('cool');
      expect(colorMatching.getColorTemperature('green')).toBe('cool');
    });

    test('should identify neutral as neutral', () => {
      expect(colorMatching.getColorTemperature('white')).toBe('neutral');
      expect(colorMatching.getColorTemperature('black')).toBe('neutral');
      expect(colorMatching.getColorTemperature('gray')).toBe('neutral');
    });

    test('should handle case insensitivity', () => {
      expect(colorMatching.getColorTemperature('RED')).toBe('warm');
      expect(colorMatching.getColorTemperature('BLUE')).toBe('cool');
    });
  });

  describe('validateOutfitColors()', () => {
    test('should validate good color combinations', () => {
      const items = [
        { color: 'white' },
        { color: 'black' },
        { color: 'blue' }
      ];
      
      const validation = colorMatching.validateOutfitColors(items);
      expect(validation.isValid).toBe(true);
      expect(validation.harmonyScore).toBeGreaterThan(0.7);
    });

    test('should provide suggestions for improvements', () => {
      const items = [
        { color: 'red' },
        { color: 'pink' },
        { color: 'orange' }
      ];
      
      const validation = colorMatching.validateOutfitColors(items);
      expect(validation).toHaveProperty('suggestions');
      expect(Array.isArray(validation.suggestions)).toBe(true);
    });

    test('should handle empty outfit', () => {
      const validation = colorMatching.validateOutfitColors([]);
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('harmonyScore');
    });
  });

  describe('Edge Cases', () => {
    test('should handle null/undefined colors gracefully', () => {
      expect(() => colorMatching.isNeutralColor(null)).not.toThrow();
      expect(() => colorMatching.isNeutralColor(undefined)).not.toThrow();
    });

    test('should handle empty strings', () => {
      expect(() => colorMatching.getColorTemperature('')).not.toThrow();
    });

    test('should handle unknown colors', () => {
      const result = colorMatching.getColorCompatibility('unknowncolor1', 'unknowncolor2');
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('Color Harmony Analysis', () => {
    test('should analyze large outfits', () => {
      const items = [
        { color: 'white' },
        { color: 'black' },
        { color: 'blue' },
        { color: 'red' },
        { color: 'green' }
      ];
      
      const harmony = colorMatching.getOutfitColorHarmony(items);
      expect(harmony).toBeGreaterThan(0);
      expect(harmony).toBeLessThanOrEqual(1);
    });

    test('should handle all neutral outfit', () => {
      const items = [
        { color: 'white' },
        { color: 'black' },
        { color: 'gray' }
      ];
      
      const harmony = colorMatching.getOutfitColorHarmony(items);
      expect(harmony).toBeGreaterThan(0.9);
    });

    test('should analyze mixed temperature outfit', () => {
      const items = [
        { color: 'red' },   // warm
        { color: 'blue' },  // cool
        { color: 'white' }  // neutral
      ];
      
      const harmony = colorMatching.getOutfitColorHarmony(items);
      expect(harmony).toBeGreaterThan(0);
      expect(harmony).toBeLessThanOrEqual(1);
    });
  });

  describe('Color Validation', () => {
    test('should validate complementary scheme', () => {
      const items = [
        { color: 'red' },
        { color: 'green' }
      ];
      
      const validation = colorMatching.validateOutfitColors(items);
      expect(validation.harmonyScore).toBeGreaterThan(0.6);
    });

    test('should detect poor color combinations', () => {
      const items = [
        { color: 'red' },
        { color: 'pink' },
        { color: 'orange' },
        { color: 'yellow' }
      ];
      
      const validation = colorMatching.validateOutfitColors(items);
      expect(validation).toHaveProperty('issues');
      expect(validation).toHaveProperty('suggestions');
    });
  });
});