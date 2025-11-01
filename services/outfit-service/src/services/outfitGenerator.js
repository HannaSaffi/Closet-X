// services/outfit-service/src/services/outfitGenerator.js

const Clothing = require('../../../wardrobe-service/src/models/Clothing'); // Cross-service model access
const weatherService = require('./weatherService');
const { colorMatching } = require('../algorithms/colorMatching');
const { styleMatching } = require('../algorithms/styleMatching');

class OutfitGeneratorService {
  /**
   * Generate outfit suggestions for a user
   * @param {string} userId - User ID
   * @param {Object} options - Generation options
   * @returns {Promise<Array>} Array of outfit suggestions
   */
  async generateOutfits(userId, options = {}) {
    try {
      const {
        occasion = 'casual',
        weather = null,
        maxSuggestions = 5,
        includeWeather = true
      } = options;

      // Get user's clothing items
      const userClothing = await this.getUserClothing(userId);
      
      if (userClothing.length < 2) {
        throw new Error('Not enough clothing items to generate outfits');
      }

      // Get weather data if needed
      let weatherData = null;
      let weatherRecommendations = null;
      
      if (includeWeather) {
        weatherData = weather || await weatherService.getCurrentWeather();
        weatherRecommendations = weatherService.getClothingRecommendations(weatherData);
      }

      // Generate outfit combinations
      const outfits = [];
      const attempts = maxSuggestions * 10; // Try more to find good matches
      
      for (let i = 0; i < attempts && outfits.length < maxSuggestions; i++) {
        const outfit = await this.createOutfitCombination(
          userClothing,
          occasion,
          weatherRecommendations
        );
        
        if (outfit && this.isValidOutfit(outfit, outfits)) {
          outfits.push(outfit);
        }
      }

      // Score and sort outfits
      const scoredOutfits = outfits.map(outfit => ({
        ...outfit,
        score: this.calculateOutfitScore(outfit, weatherRecommendations)
      })).sort((a, b) => b.score - a.score);

      return scoredOutfits.slice(0, maxSuggestions);
    } catch (error) {
      console.error('Outfit Generation Error:', error.message);
      throw error;
    }
  }

  /**
   * Get user's clothing items
   */
  async getUserClothing(userId) {
    // In production, this would call the wardrobe service API
    // For now, direct database access
    const clothing = await Clothing.find({
      userId,
      isActive: true
    }).lean();

    return clothing;
  }

  /**
   * Create a single outfit combination
   */
  async createOutfitCombination(allClothing, occasion, weatherRecommendations) {
    try {
      // Separate clothing by category
      const categories = {
        tops: allClothing.filter(c => c.category === 'tops'),
        bottoms: allClothing.filter(c => c.category === 'bottoms'),
        outerwear: allClothing.filter(c => c.category === 'outerwear'),
        shoes: allClothing.filter(c => c.category === 'shoes'),
        dresses: allClothing.filter(c => c.category === 'dresses'),
        accessories: allClothing.filter(c => c.category === 'accessories')
      };

      let outfit = {
        items: [],
        categories: [],
        colors: [],
        styles: []
      };

      // Strategy 1: Dress-based outfit
      if (categories.dresses.length > 0 && Math.random() > 0.5) {
        const dress = this.selectRandomItem(categories.dresses, occasion, weatherRecommendations);
        outfit.items.push(dress);
        outfit.categories.push('dresses');
        
        // Add shoes
        if (categories.shoes.length > 0) {
          const shoes = this.selectMatchingItem(categories.shoes, dress, weatherRecommendations);
          outfit.items.push(shoes);
          outfit.categories.push('shoes');
        }
      } 
      // Strategy 2: Top + Bottom outfit
      else {
        // Select top
        if (categories.tops.length > 0) {
          const top = this.selectRandomItem(categories.tops, occasion, weatherRecommendations);
          outfit.items.push(top);
          outfit.categories.push('tops');
          
          // Select matching bottom
          if (categories.bottoms.length > 0) {
            const bottom = this.selectMatchingItem(categories.bottoms, top, weatherRecommendations);
            outfit.items.push(bottom);
            outfit.categories.push('bottoms');
          }
          
          // Add shoes
          if (categories.shoes.length > 0) {
            const shoes = this.selectMatchingItem(categories.shoes, top, weatherRecommendations);
            outfit.items.push(shoes);
            outfit.categories.push('shoes');
          }
        }
      }

      // Add outerwear based on weather
      if (weatherRecommendations && this.needsOuterwear(weatherRecommendations)) {
        if (categories.outerwear.length > 0) {
          const outerwear = this.selectMatchingItem(categories.outerwear, outfit.items[0], weatherRecommendations);
          outfit.items.push(outerwear);
          outfit.categories.push('outerwear');
        }
      }

      // Add accessories (optional)
      if (categories.accessories.length > 0 && Math.random() > 0.6) {
        const accessory = this.selectRandomItem(categories.accessories, occasion, null);
        outfit.items.push(accessory);
        outfit.categories.push('accessories');
      }

      // Extract outfit metadata
      outfit.colors = [...new Set(outfit.items.map(i => i.color.primary))];
      outfit.styles = [...new Set(outfit.items.flatMap(i => i.aiMetadata?.style || ['casual']))];

      return outfit.items.length >= 2 ? outfit : null;
    } catch (error) {
      console.error('Combination creation error:', error.message);
      return null;
    }
  }

  /**
   * Select a random item from category
   */
  selectRandomItem(items, occasion, weatherRecommendations) {
    // Filter by occasion if specified
    let filtered = items.filter(item => 
      !item.occasion || item.occasion.length === 0 || item.occasion.includes(occasion)
    );

    // Filter by weather if available
    if (weatherRecommendations) {
      filtered = this.filterByWeather(filtered, weatherRecommendations);
    }

    // If no matches, use all items
    if (filtered.length === 0) filtered = items;

    // Select random item
    return filtered[Math.floor(Math.random() * filtered.length)];
  }

  /**
   * Select item that matches with existing item
   */
  selectMatchingItem(items, existingItem, weatherRecommendations) {
    // Score each item for compatibility
    const scored = items.map(item => ({
      item,
      score: this.calculateCompatibilityScore(item, existingItem)
    }));

    // Filter by weather
    let candidates = scored;
    if (weatherRecommendations) {
      candidates = candidates.filter(s => 
        this.isWeatherAppropriate(s.item, weatherRecommendations)
      );
    }

    // If no weather-appropriate items, use all
    if (candidates.length === 0) candidates = scored;

    // Sort by score and pick from top matches
    candidates.sort((a, b) => b.score - a.score);
    const topCandidates = candidates.slice(0, Math.min(5, candidates.length));
    
    return topCandidates[Math.floor(Math.random() * topCandidates.length)].item;
  }

  /**
   * Calculate compatibility score between two items
   */
  calculateCompatibilityScore(item1, item2) {
    let score = 0;

    // Color compatibility (40 points)
    const colorScore = colorMatching.getColorCompatibility(
      item1.color.primary,
      item2.color.primary
    );
    score += colorScore * 40;

    // Style compatibility (30 points)
    const style1 = item1.aiMetadata?.style || ['casual'];
    const style2 = item2.aiMetadata?.style || ['casual'];
    const styleOverlap = style1.filter(s => style2.includes(s)).length;
    score += (styleOverlap / Math.max(style1.length, style2.length)) * 30;

    // Occasion compatibility (20 points)
    if (item1.occasion && item2.occasion) {
      const occasionOverlap = item1.occasion.filter(o => item2.occasion.includes(o)).length;
      score += (occasionOverlap / Math.max(item1.occasion.length, item2.occasion.length)) * 20;
    }

    // Wear count bonus (10 points) - favor less-worn items
    const avgWearCount = (item1.wearCount + item2.wearCount) / 2;
    score += Math.max(0, 10 - avgWearCount);

    return score;
  }

  /**
   * Check if outfit needs outerwear based on weather
   */
  needsOuterwear(weatherRecommendations) {
    return weatherRecommendations.required.includes('outerwear') ||
           weatherRecommendations.temperature === 'cold' ||
           weatherRecommendations.temperature === 'freezing';
  }

  /**
   * Filter items by weather appropriateness
   */
  filterByWeather(items, weatherRecommendations) {
    return items.filter(item => this.isWeatherAppropriate(item, weatherRecommendations));
  }

  /**
   * Check if item is weather appropriate
   */
  isWeatherAppropriate(item, weatherRecommendations) {
    // Check if item category is in avoid list
    if (weatherRecommendations.avoid.some(a => 
      item.subcategory?.includes(a) || item.category.includes(a)
    )) {
      return false;
    }

    // Check season match
    if (item.season && item.season.length > 0) {
      const currentSeason = this.getCurrentSeason();
      if (!item.season.includes(currentSeason) && !item.season.includes('all-season')) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get current season
   */
  getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  }

  /**
   * Check if outfit is valid and not duplicate
   */
  isValidOutfit(outfit, existingOutfits) {
    // Must have at least 2 items
    if (!outfit || outfit.items.length < 2) return false;

    // Check for duplicates
    const itemIds = outfit.items.map(i => i._id.toString()).sort().join(',');
    const isDuplicate = existingOutfits.some(existing => {
      const existingIds = existing.items.map(i => i._id.toString()).sort().join(',');
      return existingIds === itemIds;
    });

    return !isDuplicate;
  }

  /**
   * Calculate overall outfit score
   */
  calculateOutfitScore(outfit, weatherRecommendations) {
    let score = 50; // Base score

    // Color harmony (25 points)
    const colorHarmony = colorMatching.calculateColorHarmony(outfit.colors);
    score += colorHarmony * 25;

    // Style coherence (25 points)
    const styleCoherence = this.calculateStyleCoherence(outfit.styles);
    score += styleCoherence * 25;

    // Weather appropriateness (20 points)
    if (weatherRecommendations) {
      const weatherScore = outfit.items.every(item => 
        this.isWeatherAppropriate(item, weatherRecommendations)
      ) ? 20 : 0;
      score += weatherScore;
    }

    // Variety bonus (10 points) - reward different categories
    const categoryCount = new Set(outfit.items.map(i => i.category)).size;
    score += Math.min(categoryCount * 3, 10);

    return Math.min(100, score);
  }

  /**
   * Calculate style coherence
   */
  calculateStyleCoherence(styles) {
    if (styles.length === 0) return 0;
    if (styles.length === 1) return 1;
    
    // More overlap = better coherence
    const uniqueStyles = new Set(styles);
    return 1 - (uniqueStyles.size - 1) / styles.length;
  }
}

module.exports = new OutfitGeneratorService();