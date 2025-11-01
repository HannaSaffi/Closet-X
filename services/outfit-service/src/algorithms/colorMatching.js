// services/outfit-service/src/algorithms/colorMatching.js

/**
 * Color theory-based matching algorithm for outfit generation
 */

// Color wheel positions (0-360 degrees)
const colorWheel = {
  red: 0,
  orange: 30,
  yellow: 60,
  'yellow-green': 90,
  green: 120,
  'blue-green': 150,
  cyan: 180,
  blue: 240,
  purple: 270,
  magenta: 300,
  pink: 330,
  // Neutrals (special handling)
  white: null,
  black: null,
  gray: null,
  grey: null,
  beige: null,
  brown: null,
  navy: 240  // Treat as dark blue
};

// Color harmony rules
const harmonyRules = {
  // Colors that work well together
  complementary: 180,      // Opposite on color wheel
  analogous: 30,           // Adjacent colors
  triadic: 120,            // Three evenly spaced colors
  splitComplementary: 150, // Base + two adjacent to complement
  tetradic: 90            // Four colors, two complementary pairs
};

// Neutral colors that go with everything
const neutralColors = ['white', 'black', 'gray', 'grey', 'beige', 'brown', 'navy'];

class ColorMatching {
  /**
   * Calculate compatibility score between two colors (0-1)
   */
  getColorCompatibility(color1, color2) {
    // Normalize color names
    color1 = color1.toLowerCase();
    color2 = color2.toLowerCase();

    // Same color = perfect match
    if (color1 === color2) return 1.0;

    // Neutral colors work with everything
    if (this.isNeutral(color1) || this.isNeutral(color2)) return 0.9;

    // Both neutrals = good but not perfect
    if (this.isNeutral(color1) && this.isNeutral(color2)) return 0.85;

    // Get color wheel positions
    const pos1 = colorWheel[color1];
    const pos2 = colorWheel[color2];

    // If colors not in wheel, use moderate compatibility
    if (pos1 === undefined || pos2 === undefined) return 0.5;

    // Calculate angle difference
    let diff = Math.abs(pos1 - pos2);
    if (diff > 180) diff = 360 - diff;

    // Check against harmony rules
    for (const [rule, angle] of Object.entries(harmonyRules)) {
      if (Math.abs(diff - angle) < 15) { // Within 15 degrees
        return this.getRuleScore(rule);
      }
    }

    // No specific harmony, return based on distance
    // Closer = worse, farther = better (up to a point)
    if (diff < 30) return 0.3;  // Too close, clash
    if (diff < 60) return 0.5;  // Moderate
    if (diff < 120) return 0.7; // Good
    return 0.6; // Decent but not perfect
  }

  /**
   * Get score for harmony rule
   */
  getRuleScore(rule) {
    const scores = {
      complementary: 0.95,
      analogous: 0.9,
      triadic: 0.85,
      splitComplementary: 0.8,
      tetradic: 0.75
    };
    return scores[rule] || 0.5;
  }

  /**
   * Check if color is neutral
   */
  isNeutral(color) {
    return neutralColors.includes(color.toLowerCase());
  }

  /**
   * Calculate color harmony for entire outfit (0-1)
   */
  calculateColorHarmony(colors) {
    if (colors.length < 2) return 1.0;

    // Remove duplicates
    const uniqueColors = [...new Set(colors.map(c => c.toLowerCase()))];
    
    // Count neutrals
    const neutralCount = uniqueColors.filter(c => this.isNeutral(c)).length;
    
    // If all neutrals, perfect harmony
    if (neutralCount === uniqueColors.length) return 1.0;

    // If mostly neutrals with 1-2 accent colors, great
    const accentColors = uniqueColors.filter(c => !this.isNeutral(c));
    if (accentColors.length <= 2 && neutralCount > 0) return 0.95;

    // Calculate pairwise compatibility
    let totalScore = 0;
    let pairCount = 0;

    for (let i = 0; i < uniqueColors.length; i++) {
      for (let j = i + 1; j < uniqueColors.length; j++) {
        totalScore += this.getColorCompatibility(uniqueColors[i], uniqueColors[j]);
        pairCount++;
      }
    }

    // Penalty for too many colors
    const colorCountPenalty = uniqueColors.length > 3 ? 0.9 : 1.0;

    return (totalScore / pairCount) * colorCountPenalty;
  }

  /**
   * Suggest complementary colors for a given color
   */
  suggestComplementaryColors(color) {
    color = color.toLowerCase();
    
    // Neutrals work with almost everything
    if (this.isNeutral(color)) {
      return {
        perfect: ['any color'],
        good: ['red', 'blue', 'green', 'purple'],
        avoid: []
      };
    }

    const position = colorWheel[color];
    if (position === undefined) {
      return {
        perfect: neutralColors,
        good: [],
        avoid: []
      };
    }

    // Calculate complementary position
    const complementary = (position + 180) % 360;
    const analogous1 = (position + 30) % 360;
    const analogous2 = (position - 30 + 360) % 360;

    // Find colors at these positions
    const perfect = this.findColorsNearPosition(complementary, 15);
    const good = [
      ...this.findColorsNearPosition(analogous1, 15),
      ...this.findColorsNearPosition(analogous2, 15),
      ...neutralColors
    ];

    // Colors to avoid (too similar)
    const avoid = this.findColorsNearPosition(position, 30).filter(c => c !== color);

    return {
      perfect: [...new Set(perfect)],
      good: [...new Set(good)],
      avoid: [...new Set(avoid)]
    };
  }

  /**
   * Find colors near a position on color wheel
   */
  findColorsNearPosition(targetPosition, tolerance) {
    const matches = [];
    
    for (const [colorName, position] of Object.entries(colorWheel)) {
      if (position === null) continue;
      
      let diff = Math.abs(position - targetPosition);
      if (diff > 180) diff = 360 - diff;
      
      if (diff <= tolerance) {
        matches.push(colorName);
      }
    }
    
    return matches;
  }

  /**
   * Create a monochromatic color scheme
   */
  createMonochromaticScheme(baseColor) {
    baseColor = baseColor.toLowerCase();
    
    if (this.isNeutral(baseColor)) {
      return [baseColor, 'white', 'black'];
    }

    // Different shades/tints of same color
    return [baseColor, `light ${baseColor}`, `dark ${baseColor}`];
  }

  /**
   * Get color temperature (warm/cool)
   */
  getColorTemperature(color) {
    const warmColors = ['red', 'orange', 'yellow', 'pink', 'brown', 'beige'];
    const coolColors = ['blue', 'green', 'purple', 'cyan', 'navy'];
    
    color = color.toLowerCase();
    
    if (warmColors.some(c => color.includes(c))) return 'warm';
    if (coolColors.some(c => color.includes(c))) return 'cool';
    return 'neutral';
  }

  /**
   * Check if two colors have compatible temperatures
   */
  areTemperaturesCompatible(color1, color2) {
    const temp1 = this.getColorTemperature(color1);
    const temp2 = this.getColorTemperature(color2);
    
    // Neutral goes with everything
    if (temp1 === 'neutral' || temp2 === 'neutral') return true;
    
    // Same temperature = compatible
    return temp1 === temp2;
  }

  /**
   * Validate outfit color scheme
   */
  validateOutfitColors(colors) {
    const issues = [];
    const suggestions = [];
    
    // Check number of colors
    if (colors.length > 4) {
      issues.push('Too many colors - limit to 3-4 for best results');
    }

    // Check color harmony
    const harmony = this.calculateColorHarmony(colors);
    if (harmony < 0.5) {
      issues.push('Colors may clash - consider using more neutrals');
      suggestions.push('Add black, white, or beige to balance the outfit');
    }

    // Check temperature mixing
    const temps = colors.map(c => this.getColorTemperature(c));
    const warmCount = temps.filter(t => t === 'warm').length;
    const coolCount = temps.filter(t => t === 'cool').length;
    
    if (warmCount > 0 && coolCount > 0 && warmCount === coolCount) {
      suggestions.push('Consider choosing either warm or cool tones for better cohesion');
    }

    return {
      isValid: issues.length === 0,
      harmonyScore: harmony,
      issues,
      suggestions
    };
  }
}

module.exports = {
  colorMatching: new ColorMatching(),
  ColorMatching
};