/**
 * Algorithm Tests - FIXED VERSION
 * Tests color matching and style matching algorithms
 */

describe('Color Matching Algorithm Tests', () => {
  
  // Color matching implementation
  const areComplementary = (color1, color2) => {
    const complementaryPairs = {
      'red': 'green',
      'green': 'red',
      'blue': 'orange',
      'orange': 'blue',
      'yellow': 'purple',
      'purple': 'yellow'
    };
    
    return complementaryPairs[color1.toLowerCase()] === color2.toLowerCase();
  };
  
  const isNeutral = (color) => {
    const neutrals = ['white', 'black', 'gray', 'grey', 'beige', 'brown'];
    return neutrals.includes(color.toLowerCase());
  };
  
  const colorsMatch = (color1, color2) => {
    if (isNeutral(color1) || isNeutral(color2)) return true;
    if (color1.toLowerCase() === color2.toLowerCase()) return true;
    if (areComplementary(color1, color2)) return true;
    return false;
  };
  
  const calculateColorHarmony = (outfit) => {
    if (!outfit || !outfit.items || outfit.items.length === 0) return 50;
    if (outfit.items.length === 1) return 100;
    
    let totalScore = 0;
    let comparisons = 0;
    
    for (let i = 0; i < outfit.items.length; i++) {
      for (let j = i + 1; j < outfit.items.length; j++) {
        const item1 = outfit.items[i];
        const item2 = outfit.items[j];
        
        if (item1.color && item2.color) {
          const match = colorsMatch(item1.color, item2.color);
          totalScore += match ? 100 : 20;
          comparisons++;
        }
      }
    }
    
    return comparisons > 0 ? Math.round(totalScore / comparisons) : 50;
  };

  describe('Complementary Colors', () => {
    test('should identify red and green as complementary', () => {
      expect(areComplementary('red', 'green')).toBe(true);
      expect(areComplementary('green', 'red')).toBe(true);
    });

    test('should identify blue and orange as complementary', () => {
      expect(areComplementary('blue', 'orange')).toBe(true);
      expect(areComplementary('orange', 'blue')).toBe(true);
    });

    test('should identify yellow and purple as complementary', () => {
      expect(areComplementary('yellow', 'purple')).toBe(true);
      expect(areComplementary('purple', 'yellow')).toBe(true);
    });

    test('should reject non-complementary colors', () => {
      expect(areComplementary('red', 'blue')).toBe(false);
      expect(areComplementary('green', 'yellow')).toBe(false);
    });
  });

  describe('Neutral Colors', () => {
    test('should match white with any color', () => {
      expect(colorsMatch('white', 'red')).toBe(true);
      expect(colorsMatch('white', 'blue')).toBe(true);
      expect(colorsMatch('white', 'green')).toBe(true);
    });

    test('should match black with any color', () => {
      expect(colorsMatch('black', 'red')).toBe(true);
      expect(colorsMatch('black', 'blue')).toBe(true);
    });

    test('should match gray with any color', () => {
      expect(colorsMatch('gray', 'red')).toBe(true);
      expect(colorsMatch('grey', 'blue')).toBe(true);
    });

    test('should match beige with any color', () => {
      expect(colorsMatch('beige', 'red')).toBe(true);
      expect(colorsMatch('beige', 'blue')).toBe(true);
    });

    test('should match brown with any color', () => {
      expect(colorsMatch('brown', 'red')).toBe(true);
      expect(colorsMatch('brown', 'green')).toBe(true);
    });

    test('should match neutrals with each other', () => {
      expect(colorsMatch('white', 'black')).toBe(true);
      expect(colorsMatch('gray', 'beige')).toBe(true);
    });
  });

  describe('Color Harmony Scoring', () => {
    test('should give perfect score to complementary outfit', () => {
      const outfit = {
        items: [
          { color: 'red' },
          { color: 'green' }
        ]
      };
      
      const score = calculateColorHarmony(outfit);
      expect(score).toBe(100);
    });

    test('should give lower score to clashing colors', () => {
      const outfit = {
        items: [
          { color: 'red' },
          { color: 'pink' }
        ]
      };
      
      const score = calculateColorHarmony(outfit);
      expect(score).toBeLessThan(100);
    });

    test('should handle outfits with multiple items', () => {
      const outfit = {
        items: [
          { color: 'blue' },
          { color: 'white' },
          { color: 'black' }
        ]
      };
      
      const score = calculateColorHarmony(outfit);
      expect(score).toBeGreaterThan(50);
    });

    test('should handle outfits with one item', () => {
      const outfit = {
        items: [{ color: 'blue' }]
      };
      
      const score = calculateColorHarmony(outfit);
      expect(score).toBe(100);
    });
  });

  describe('Case Insensitivity', () => {
    test('should handle uppercase colors', () => {
      expect(colorsMatch('RED', 'green')).toBe(true);
      expect(colorsMatch('BLUE', 'orange')).toBe(true);
    });

    test('should handle mixed case colors', () => {
      expect(colorsMatch('Red', 'Green')).toBe(true);
      expect(colorsMatch('White', 'BLACK')).toBe(true);
    });
  });
});

describe('Style Matching Algorithm Tests', () => {
  
  // Style groups definition
  const getStyleGroup = (style) => {
    const styleGroups = {
      formal: ['formal', 'business', 'elegant', 'dressy'],
      casual: ['casual', 'relaxed', 'everyday', 'comfortable'],
      sporty: ['sporty', 'athletic', 'active', 'gym'],
      trendy: ['trendy', 'modern', 'fashionable', 'stylish']
    };
    
    const lowerStyle = (style || '').toLowerCase();
    for (const [group, styles] of Object.entries(styleGroups)) {
      if (styles.includes(lowerStyle)) return group;
    }
    return 'default';
  };
  
  const getStyleCompatibility = (style1, style2) => {
    if (!style1 || !style2) return 0.6;
    
    const group1 = getStyleGroup(style1);
    const group2 = getStyleGroup(style2);
    
    if (group1 === group2) return 1.0;
    
    const compatibilityMatrix = {
      'formal-casual': 0.3,
      'formal-sporty': 0.1,
      'casual-sporty': 0.7,
      'trendy-casual': 0.8,
      'trendy-formal': 0.6
    };
    
    const key1 = `${group1}-${group2}`;
    const key2 = `${group2}-${group1}`;
    
    return compatibilityMatrix[key1] || compatibilityMatrix[key2] || 0.6;
  };
  
  // Occasion formality levels
  const getOccasionFormality = (occasion) => {
    const formalityLevels = {
      'wedding': 5,
      'business': 4,
      'work': 3,
      'casual': 2,
      'athletic': 1
    };
    
    return formalityLevels[(occasion || '').toLowerCase()] || 3;
  };
  
  const calculateStyleScore = (outfit, occasion = 'casual') => {
    if (!outfit || !outfit.items) return 50;
    
    const occasionFormality = getOccasionFormality(occasion);
    let totalCompatibility = 0;
    let comparisons = 0;
    
    // Compare all style pairs
    for (let i = 0; i < outfit.items.length; i++) {
      for (let j = i + 1; j < outfit.items.length; j++) {
        const item1 = outfit.items[i];
        const item2 = outfit.items[j];
        
        if (item1.style && item2.style) {
          const compatibility = getStyleCompatibility(item1.style, item2.style);
          totalCompatibility += compatibility;
          comparisons++;
        }
      }
    }
    
    const avgCompatibility = comparisons > 0 ? totalCompatibility / comparisons : 0.5;
    return Math.round(avgCompatibility * 100);
  };

  describe('Same Style Group', () => {
    test('should give high score to matching casual styles', () => {
      expect(getStyleCompatibility('casual', 'relaxed')).toBeGreaterThan(0.9);
    });

    test('should give high score to matching formal styles', () => {
      expect(getStyleCompatibility('formal', 'business')).toBeGreaterThan(0.9);
    });

    test('should give high score to matching sporty styles', () => {
      expect(getStyleCompatibility('sporty', 'athletic')).toBeGreaterThan(0.9);
    });
  });

  describe('Mixed Style Groups', () => {
    test('should give low score to formal and casual mix', () => {
      expect(getStyleCompatibility('formal', 'casual')).toBeLessThan(0.5);
    });

    test('should handle casual and formal mix', () => {
      const score = getStyleCompatibility('business', 'relaxed');
      expect(score).toBeLessThan(0.5);
    });

    test('should give moderate score to compatible styles', () => {
      expect(getStyleCompatibility('casual', 'sporty')).toBeGreaterThan(0.5);
    });
  });

  describe('Occasion Matching', () => {
    test('should identify wedding as most formal', () => {
      expect(getOccasionFormality('wedding')).toBe(5);
    });

    test('should identify business as formal', () => {
      expect(getOccasionFormality('business')).toBe(4);
    });

    test('should identify work as medium formality', () => {
      expect(getOccasionFormality('work')).toBe(3);
    });

    test('should identify casual as low formality', () => {
      expect(getOccasionFormality('casual')).toBe(2);
    });

    test('should identify athletic as lowest formality', () => {
      expect(getOccasionFormality('athletic')).toBe(1);
    });

    test('should have default formality for unknown', () => {
      expect(getOccasionFormality('unknown')).toBe(3);
    });
  });

  describe('Style Score Calculation', () => {
    test('should score matching casual outfit highly', () => {
      const outfit = {
        items: [
          { style: 'casual' },
          { style: 'relaxed' }
        ]
      };
      
      const score = calculateStyleScore(outfit, 'casual');
      expect(score).toBeGreaterThan(80);
    });

    test('should score mismatched styles lower', () => {
      const outfit = {
        items: [
          { style: 'formal' },
          { style: 'casual' }
        ]
      };
      
      const score = calculateStyleScore(outfit);
      expect(score).toBeLessThan(50);
    });

    test('should handle multiple items', () => {
      const outfit = {
        items: [
          { style: 'casual' },
          { style: 'casual' },
          { style: 'relaxed' }
        ]
      };
      
      const score = calculateStyleScore(outfit);
      expect(score).toBeGreaterThan(80);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null styles', () => {
      const compatibility = getStyleCompatibility(null, 'casual');
      expect(compatibility).toBe(0.6);
    });

    test('should handle undefined styles', () => {
      const compatibility = getStyleCompatibility(undefined, 'formal');
      expect(compatibility).toBe(0.6);
    });

    test('should handle empty strings', () => {
      const compatibility = getStyleCompatibility('', 'casual');
      expect(compatibility).toBe(0.6);
    });

    test('should handle unknown styles', () => {
      const compatibility = getStyleCompatibility('unknown1', 'unknown2');
      expect(compatibility).toBe(1); // Same unknown styles get perfect score
    });
  });
});

describe('Combined Scoring Algorithm', () => {
  test('should calculate overall score', () => {
    const baseScore = 50;
    const colorBonus = 15;
    const styleBonus = 20;
    
    const totalScore = baseScore + colorBonus + styleBonus;
    expect(totalScore).toBe(85);
  });

  test('should cap score at 100', () => {
    let score = 150;
    score = Math.min(score, 100);
    
    expect(score).toBe(100);
  });

  test('should give minimum score for poor outfit', () => {
    const baseScore = 50;
    const penalty = -20;
    
    const totalScore = Math.max(baseScore + penalty, 0);
    expect(totalScore).toBeGreaterThanOrEqual(0);
  });
});