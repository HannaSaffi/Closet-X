// services/outfit-service/src/algorithms/styleMatching.js

/**
 * Style matching algorithm for outfit coherence
 */

// Style compatibility matrix (0-1 scores)
const styleCompatibility = {
  casual: {
    casual: 1.0,
    sporty: 0.8,
    bohemian: 0.7,
    minimalist: 0.7,
    trendy: 0.6,
    formal: 0.3,
    vintage: 0.5,
    classic: 0.6
  },
  formal: {
    formal: 1.0,
    classic: 0.9,
    minimalist: 0.8,
    trendy: 0.6,
    vintage: 0.7,
    casual: 0.3,
    sporty: 0.2,
    bohemian: 0.3
  },
  sporty: {
    sporty: 1.0,
    casual: 0.8,
    minimalist: 0.6,
    trendy: 0.7,
    formal: 0.2,
    bohemian: 0.4,
    vintage: 0.3,
    classic: 0.4
  },
  bohemian: {
    bohemian: 1.0,
    vintage: 0.8,
    casual: 0.7,
    trendy: 0.6,
    minimalist: 0.4,
    formal: 0.3,
    sporty: 0.4,
    classic: 0.5
  },
  minimalist: {
    minimalist: 1.0,
    classic: 0.9,
    formal: 0.8,
    casual: 0.7,
    trendy: 0.6,
    sporty: 0.6,
    bohemian: 0.4,
    vintage: 0.5
  },
  trendy: {
    trendy: 1.0,
    casual: 0.6,
    sporty: 0.7,
    minimalist: 0.6,
    formal: 0.6,
    bohemian: 0.6,
    vintage: 0.5,
    classic: 0.5
  },
  vintage: {
    vintage: 1.0,
    bohemian: 0.8,
    classic: 0.7,
    formal: 0.7,
    trendy: 0.5,
    casual: 0.5,
    minimalist: 0.5,
    sporty: 0.3
  },
  classic: {
    classic: 1.0,
    formal: 0.9,
    minimalist: 0.9,
    vintage: 0.7,
    casual: 0.6,
    trendy: 0.5,
    bohemian: 0.5,
    sporty: 0.4
  }
};

// Occasion-style mapping
const occasionStyleFit = {
  casual: ['casual', 'sporty', 'bohemian', 'trendy', 'minimalist'],
  formal: ['formal', 'classic', 'minimalist', 'vintage'],
  work: ['formal', 'classic', 'minimalist', 'casual'],
  athletic: ['sporty', 'casual', 'minimalist'],
  party: ['trendy', 'formal', 'bohemian', 'vintage'],
  beach: ['casual', 'bohemian', 'sporty'],
  outdoor: ['casual', 'sporty', 'bohemian'],
  date: ['formal', 'trendy', 'classic', 'bohemian'],
  travel: ['casual', 'minimalist', 'sporty']
};

class StyleMatching {
  /**
   * Calculate compatibility between two styles (0-1)
   */
  getStyleCompatibility(style1, style2) {
    style1 = style1.toLowerCase();
    style2 = style2.toLowerCase();

    // Same style = perfect match
    if (style1 === style2) return 1.0;

    // Look up in compatibility matrix
    if (styleCompatibility[style1]?.[style2]) {
      return styleCompatibility[style1][style2];
    }

    // Default moderate compatibility
    return 0.5;
  }

  /**
   * Calculate overall style coherence for outfit (0-1)
   */
  calculateStyleCoherence(styles) {
    if (styles.length === 0) return 0;
    if (styles.length === 1) return 1.0;

    // Remove duplicates
    const uniqueStyles = [...new Set(styles.map(s => s.toLowerCase()))];

    // If only one unique style, perfect coherence
    if (uniqueStyles.length === 1) return 1.0;

    // Calculate pairwise compatibility
    let totalScore = 0;
    let pairCount = 0;

    for (let i = 0; i < uniqueStyles.length; i++) {
      for (let j = i + 1; j < uniqueStyles.length; j++) {
        totalScore += this.getStyleCompatibility(uniqueStyles[i], uniqueStyles[j]);
        pairCount++;
      }
    }

    // Penalty for too many different styles
    const styleCountPenalty = uniqueStyles.length > 2 ? 0.85 : 1.0;

    return (totalScore / pairCount) * styleCountPenalty;
  }

  /**
   * Check if style fits the occasion
   */
  isStyleAppropriateForOccasion(style, occasion) {
    style = style.toLowerCase();
    occasion = occasion.toLowerCase();

    const appropriateStyles = occasionStyleFit[occasion] || [];
    return appropriateStyles.includes(style);
  }

  /**
   * Get style score for occasion (0-1)
   */
  getOccasionStyleScore(styles, occasion) {
    if (styles.length === 0) return 0;

    const appropriateCount = styles.filter(style => 
      this.isStyleAppropriateForOccasion(style, occasion)
    ).length;

    return appropriateCount / styles.length;
  }

  /**
   * Suggest compatible styles for a given style
   */
  suggestCompatibleStyles(baseStyle) {
    baseStyle = baseStyle.toLowerCase();
    
    const compat = styleCompatibility[baseStyle];
    if (!compat) {
      return {
        perfect: ['casual'],
        good: ['minimalist', 'trendy'],
        avoid: []
      };
    }

    const perfect = [];
    const good = [];
    const avoid = [];

    for (const [style, score] of Object.entries(compat)) {
      if (style === baseStyle) continue;
      
      if (score >= 0.8) perfect.push(style);
      else if (score >= 0.6) good.push(style);
      else if (score < 0.4) avoid.push(style);
    }

    return { perfect, good, avoid };
  }

  /**
   * Determine dominant style from multiple items
   */
  determineDominantStyle(styles) {
    if (styles.length === 0) return 'casual';

    // Count frequency
    const frequency = {};
    styles.forEach(style => {
      style = style.toLowerCase();
      frequency[style] = (frequency[style] || 0) + 1;
    });

    // Get most frequent
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)[0][0];
  }

  /**
   * Validate outfit styles
   */
  validateOutfitStyles(styles, occasion = null) {
    const issues = [];
    const suggestions = [];

    // Check style coherence
    const coherence = this.calculateStyleCoherence(styles);
    if (coherence < 0.5) {
      issues.push('Styles may not work well together');
      const dominant = this.determineDominantStyle(styles);
      const compatible = this.suggestCompatibleStyles(dominant);
      suggestions.push(`Consider ${compatible.perfect[0] || 'minimalist'} pieces to improve coherence`);
    }

    // Check occasion fit
    if (occasion) {
      const occasionScore = this.getOccasionStyleScore(styles, occasion);
      if (occasionScore < 0.5) {
        issues.push(`Styles may not be appropriate for ${occasion}`);
        const appropriateStyles = occasionStyleFit[occasion] || [];
        suggestions.push(`Consider ${appropriateStyles[0]} style for ${occasion}`);
      }
    }

    // Check for conflicting styles
    const uniqueStyles = [...new Set(styles)];
    if (uniqueStyles.length > 3) {
      issues.push('Too many different styles in one outfit');
      suggestions.push('Stick to 2-3 complementary styles maximum');
    }

    return {
      isValid: issues.length === 0,
      coherenceScore: coherence,
      occasionScore: occasion ? this.getOccasionStyleScore(styles, occasion) : null,
      issues,
      suggestions
    };
  }

  /**
   * Get style personality description
   */
  getStyleDescription(style) {
    const descriptions = {
      casual: 'Relaxed, comfortable, and effortless everyday wear',
      formal: 'Sophisticated, elegant, and polished for special occasions',
      sporty: 'Athletic, active, and performance-oriented pieces',
      bohemian: 'Free-spirited, artistic, and eclectic with natural elements',
      minimalist: 'Simple, clean lines with focus on quality and functionality',
      trendy: 'Fashion-forward, current, and statement-making styles',
      vintage: 'Classic pieces from past eras with timeless appeal',
      classic: 'Traditional, refined, and enduring wardrobe staples'
    };

    return descriptions[style.toLowerCase()] || 'Unique personal style';
  }

  /**
   * Build outfit strategy based on style mixing rules
   */
  buildOutfitStrategy(primaryStyle, occasion) {
    const strategy = {
      primary: primaryStyle,
      occasion,
      allowedMixing: [],
      recommended: [],
      avoid: []
    };

    // Get compatible styles
    const compatible = this.suggestCompatibleStyles(primaryStyle);
    strategy.allowedMixing = compatible.perfect.concat(compatible.good);
    strategy.avoid = compatible.avoid;

    // Filter by occasion
    if (occasion) {
      const occasionStyles = occasionStyleFit[occasion] || [];
      strategy.recommended = strategy.allowedMixing.filter(s => 
        occasionStyles.includes(s)
      );
    } else {
      strategy.recommended = compatible.perfect;
    }

    return strategy;
  }

  /**
   * Calculate mixing ratio for styles
   * Returns optimal balance (e.g., 70% casual, 30% formal)
   */
  calculateOptimalMixing(styles) {
    const total = styles.length;
    const counts = {};
    
    styles.forEach(style => {
      style = style.toLowerCase();
      counts[style] = (counts[style] || 0) + 1;
    });

    const ratios = {};
    for (const [style, count] of Object.entries(counts)) {
      ratios[style] = Math.round((count / total) * 100);
    }

    return ratios;
  }
}

module.exports = {
  styleMatching: new StyleMatching(),
  StyleMatching
};