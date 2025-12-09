const { styleMatching, StyleMatching } = require('../src/algorithms/styleMatching');

describe('StyleMatching Algorithm', () => {
  describe('getStyleCompatibility', () => {
    test('should return 1.0 for identical styles', () => {
      expect(styleMatching.getStyleCompatibility('casual', 'casual')).toBe(1.0);
      expect(styleMatching.getStyleCompatibility('formal', 'formal')).toBe(1.0);
    });

    test('should return high score for compatible styles', () => {
      expect(styleMatching.getStyleCompatibility('formal', 'classic')).toBe(0.9);
      expect(styleMatching.getStyleCompatibility('minimalist', 'classic')).toBe(0.9);
    });

    test('should return low score for incompatible styles', () => {
      expect(styleMatching.getStyleCompatibility('formal', 'sporty')).toBe(0.2);
      expect(styleMatching.getStyleCompatibility('formal', 'casual')).toBe(0.3);
    });

    test('should be case insensitive', () => {
      expect(styleMatching.getStyleCompatibility('CASUAL', 'casual')).toBe(1.0);
      expect(styleMatching.getStyleCompatibility('Formal', 'FORMAL')).toBe(1.0);
    });

    test('should return 0.5 for unknown styles', () => {
      expect(styleMatching.getStyleCompatibility('unknown', 'style')).toBe(0.5);
    });

    test('should be symmetric', () => {
      const score1 = styleMatching.getStyleCompatibility('casual', 'formal');
      const score2 = styleMatching.getStyleCompatibility('formal', 'casual');
      expect(score1).toBe(score2);
    });
  });

  describe('calculateStyleCoherence', () => {
    test('should return 0 for empty array', () => {
      expect(styleMatching.calculateStyleCoherence([])).toBe(0);
    });

    test('should return 1.0 for single style', () => {
      expect(styleMatching.calculateStyleCoherence(['casual'])).toBe(1.0);
    });

    test('should return 1.0 for all same style', () => {
      expect(styleMatching.calculateStyleCoherence(['casual', 'casual', 'casual'])).toBe(1.0);
    });

    test('should calculate coherence for compatible styles', () => {
      const coherence = styleMatching.calculateStyleCoherence(['formal', 'classic']);
      expect(coherence).toBeGreaterThan(0.8);
    });

    test('should return low score for incompatible styles', () => {
      const coherence = styleMatching.calculateStyleCoherence(['formal', 'sporty']);
      expect(coherence).toBeLessThan(0.5);
    });

    test('should penalize too many different styles', () => {
      const coherenceFew = styleMatching.calculateStyleCoherence(['casual', 'minimalist']);
      const coherenceMany = styleMatching.calculateStyleCoherence(['casual', 'formal', 'sporty']);
      expect(coherenceMany).toBeLessThan(coherenceFew);
    });

    test('should handle duplicates correctly', () => {
      const coherence = styleMatching.calculateStyleCoherence(['casual', 'casual', 'formal', 'formal']);
      expect(coherence).toBeGreaterThan(0);
    });
  });

  describe('isStyleAppropriateForOccasion', () => {
    test('should return true for appropriate casual occasion styles', () => {
      expect(styleMatching.isStyleAppropriateForOccasion('casual', 'casual')).toBe(true);
      expect(styleMatching.isStyleAppropriateForOccasion('sporty', 'casual')).toBe(true);
    });

    test('should return true for appropriate formal occasion styles', () => {
      expect(styleMatching.isStyleAppropriateForOccasion('formal', 'formal')).toBe(true);
      expect(styleMatching.isStyleAppropriateForOccasion('classic', 'formal')).toBe(true);
    });

    test('should return false for inappropriate styles', () => {
      expect(styleMatching.isStyleAppropriateForOccasion('sporty', 'formal')).toBe(false);
      expect(styleMatching.isStyleAppropriateForOccasion('formal', 'athletic')).toBe(false);
    });

    test('should be case insensitive', () => {
      expect(styleMatching.isStyleAppropriateForOccasion('CASUAL', 'CASUAL')).toBe(true);
      expect(styleMatching.isStyleAppropriateForOccasion('Formal', 'FORMAL')).toBe(true);
    });

    test('should return false for unknown occasion', () => {
      expect(styleMatching.isStyleAppropriateForOccasion('casual', 'unknown')).toBe(false);
    });
  });

  describe('getOccasionStyleScore', () => {
    test('should return 0 for empty styles', () => {
      expect(styleMatching.getOccasionStyleScore([], 'casual')).toBe(0);
    });

    test('should return 1.0 when all styles fit occasion', () => {
      const score = styleMatching.getOccasionStyleScore(['casual', 'sporty'], 'casual');
      expect(score).toBe(1.0);
    });

    test('should return 0.5 when half styles fit occasion', () => {
      const score = styleMatching.getOccasionStyleScore(['casual', 'formal'], 'casual');
      expect(score).toBe(0.5);
    });

    test('should return 0 when no styles fit occasion', () => {
      const score = styleMatching.getOccasionStyleScore(['formal', 'classic'], 'athletic');
      expect(score).toBe(0);
    });

    test('should handle mixed appropriate and inappropriate styles', () => {
      const score = styleMatching.getOccasionStyleScore(['formal', 'classic', 'sporty'], 'formal');
      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThan(1.0);
    });
  });

  describe('suggestCompatibleStyles', () => {
    test('should return perfect, good, and avoid categories', () => {
      const suggestions = styleMatching.suggestCompatibleStyles('casual');
      expect(suggestions).toHaveProperty('perfect');
      expect(suggestions).toHaveProperty('good');
      expect(suggestions).toHaveProperty('avoid');
      expect(Array.isArray(suggestions.perfect)).toBe(true);
      expect(Array.isArray(suggestions.good)).toBe(true);
      expect(Array.isArray(suggestions.avoid)).toBe(true);
    });

    test('should not include the base style in suggestions', () => {
      const suggestions = styleMatching.suggestCompatibleStyles('casual');
      expect(suggestions.perfect).not.toContain('casual');
      expect(suggestions.good).not.toContain('casual');
    });

    test('should suggest highly compatible styles in perfect', () => {
      const suggestions = styleMatching.suggestCompatibleStyles('formal');
      expect(suggestions.perfect).toContain('classic');
    });

    test('should suggest incompatible styles in avoid', () => {
      const suggestions = styleMatching.suggestCompatibleStyles('formal');
      expect(suggestions.avoid).toContain('sporty');
    });

    test('should handle unknown style', () => {
      const suggestions = styleMatching.suggestCompatibleStyles('unknownstyle');
      expect(suggestions.perfect).toContain('casual');
    });
  });

  describe('determineDominantStyle', () => {
    test('should return casual for empty array', () => {
      expect(styleMatching.determineDominantStyle([])).toBe('casual');
    });

    test('should return the most frequent style', () => {
      expect(styleMatching.determineDominantStyle(['casual', 'casual', 'formal'])).toBe('casual');
      expect(styleMatching.determineDominantStyle(['formal', 'formal', 'formal', 'casual'])).toBe('formal');
    });

    test('should handle single style', () => {
      expect(styleMatching.determineDominantStyle(['minimalist'])).toBe('minimalist');
    });

    test('should handle all unique styles', () => {
      const dominant = styleMatching.determineDominantStyle(['casual', 'formal', 'sporty']);
      expect(['casual', 'formal', 'sporty']).toContain(dominant);
    });

    test('should be case insensitive', () => {
      expect(styleMatching.determineDominantStyle(['CASUAL', 'casual', 'Casual'])).toBe('casual');
    });
  });

  describe('validateOutfitStyles', () => {
    test('should validate coherent styles', () => {
      const result = styleMatching.validateOutfitStyles(['casual', 'minimalist'], 'casual');
      expect(result.isValid).toBe(true);
      expect(result.coherenceScore).toBeGreaterThan(0.5);
      expect(result.issues).toHaveLength(0);
    });

    test('should flag poor coherence', () => {
      const result = styleMatching.validateOutfitStyles(['formal', 'sporty']);
      expect(result.isValid).toBe(false);
      expect(result.coherenceScore).toBeLessThan(0.5);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    test('should flag inappropriate occasion styles', () => {
      const result = styleMatching.validateOutfitStyles(['sporty', 'casual'], 'formal');
      expect(result.isValid).toBe(false);
      expect(result.occasionScore).toBeLessThan(0.5);
    });

    test('should flag too many styles', () => {
      const result = styleMatching.validateOutfitStyles(['casual', 'formal', 'sporty', 'bohemian']);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(issue => issue.includes('Too many'))).toBe(true);
    });

    test('should provide suggestions for improvement', () => {
      const result = styleMatching.validateOutfitStyles(['formal', 'sporty']);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    test('should work without occasion parameter', () => {
      const result = styleMatching.validateOutfitStyles(['casual', 'minimalist']);
      expect(result.occasionScore).toBeNull();
      expect(result).toHaveProperty('coherenceScore');
    });

    test('should return all required properties', () => {
      const result = styleMatching.validateOutfitStyles(['casual'], 'casual');
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('coherenceScore');
      expect(result).toHaveProperty('occasionScore');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('suggestions');
    });
  });

  describe('getStyleDescription', () => {
    test('should return description for known styles', () => {
      expect(styleMatching.getStyleDescription('casual')).toContain('Relaxed');
      expect(styleMatching.getStyleDescription('formal')).toContain('Sophisticated');
      expect(styleMatching.getStyleDescription('sporty')).toContain('Athletic');
    });

    test('should return default for unknown style', () => {
      expect(styleMatching.getStyleDescription('unknownstyle')).toBe('Unique personal style');
    });

    test('should be case insensitive', () => {
      expect(styleMatching.getStyleDescription('CASUAL')).toContain('Relaxed');
      expect(styleMatching.getStyleDescription('Formal')).toContain('Sophisticated');
    });
  });

  describe('buildOutfitStrategy', () => {
    test('should return strategy with all required properties', () => {
      const strategy = styleMatching.buildOutfitStrategy('casual', 'casual');
      expect(strategy).toHaveProperty('primary');
      expect(strategy).toHaveProperty('occasion');
      expect(strategy).toHaveProperty('allowedMixing');
      expect(strategy).toHaveProperty('recommended');
      expect(strategy).toHaveProperty('avoid');
    });

    test('should set primary style correctly', () => {
      const strategy = styleMatching.buildOutfitStrategy('formal', 'work');
      expect(strategy.primary).toBe('formal');
      expect(strategy.occasion).toBe('work');
    });

    test('should include compatible styles in allowedMixing', () => {
      const strategy = styleMatching.buildOutfitStrategy('formal', 'work');
      expect(strategy.allowedMixing.length).toBeGreaterThan(0);
      expect(strategy.allowedMixing).toContain('classic');
    });

    test('should filter recommendations by occasion', () => {
      const strategy = styleMatching.buildOutfitStrategy('casual', 'formal');
      expect(Array.isArray(strategy.recommended)).toBe(true);
    });

    test('should work without occasion', () => {
      const strategy = styleMatching.buildOutfitStrategy('casual', null);
      expect(strategy.recommended.length).toBeGreaterThan(0);
    });
  });

  describe('calculateOptimalMixing', () => {
    test('should calculate percentages correctly', () => {
      const ratios = styleMatching.calculateOptimalMixing(['casual', 'casual', 'formal', 'casual']);
      expect(ratios.casual).toBe(75);
      expect(ratios.formal).toBe(25);
    });

    test('should handle single style', () => {
      const ratios = styleMatching.calculateOptimalMixing(['formal', 'formal']);
      expect(ratios.formal).toBe(100);
    });

    test('should handle equal distribution', () => {
      const ratios = styleMatching.calculateOptimalMixing(['casual', 'formal']);
      expect(ratios.casual).toBe(50);
      expect(ratios.formal).toBe(50);
    });

    test('should sum to approximately 100', () => {
      const ratios = styleMatching.calculateOptimalMixing(['casual', 'formal', 'sporty']);
      const sum = Object.values(ratios).reduce((a, b) => a + b, 0);
      expect(sum).toBeGreaterThanOrEqual(99);
      expect(sum).toBeLessThanOrEqual(101);
    });

    test('should be case insensitive', () => {
      const ratios = styleMatching.calculateOptimalMixing(['CASUAL', 'casual', 'Casual']);
      expect(ratios.casual).toBe(100);
    });

    test('should handle empty array', () => {
      const ratios = styleMatching.calculateOptimalMixing([]);
      expect(Object.keys(ratios).length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long style arrays', () => {
      const longArray = new Array(100).fill('casual');
      expect(() => styleMatching.calculateStyleCoherence(longArray)).not.toThrow();
    });
  });
});
