// services/outfit-service/src/services/outfitGenerator.js

const wardrobeClient = require('./wardrobeClient');
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
      const userClothing = await this.getUserClothing(userId, options.token);
      
      if (userClothing.length < 2) {
        throw new Error('Not enough clothing items to generate outfits');
      }

      // Get weather data if needed
      let weatherData = null;
      let weatherRecommendations = null;

      if (includeWeather && weather) {
        try {
          weatherData = weather;
          
          // Create our own simple recommendations instead of relying on weatherService
          const temp = weather.current.temperature.value;
          const tempCategory = weather.current.temperature.category;
          const precipLevel = weather.precipitation?.level || 'none';
          const precipType = weather.precipitation?.type || 'none';
          
          weatherRecommendations = {
            temperature: tempCategory,
            weatherCondition: weather.current.condition.main,
            precipitation: {
              level: precipLevel,
              type: precipType
            },
            required: temp < 50 ? ['outerwear', 'layers'] : [],
            avoid: temp < 40 ? ['shorts', 'tank tops', 'sandals'] : []
          };
          
          console.log('✅ Weather recommendations:', JSON.stringify(weatherRecommendations));
        } catch (error) {
          console.error('Weather recommendations failed:', error.message);
          weatherRecommendations = null;
        }
      }
      
      // Generate outfit combinations
      const outfits = [];
      const attempts = maxSuggestions * 10; // Try more to find good matches
      
      for (let i = 0; i < attempts && outfits.length < maxSuggestions; i++) {
        const outfit = await this.createOutfitCombination(
         userClothing,
         occasion,
         weatherRecommendations,
         options.userPreference || ''
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
  async getUserClothing(userId, token) {
    // Call wardrobe service API to get clothing items
    try {
      const clothing = await wardrobeClient.getClothingItems(token, {
        isActive: true
      });
      return clothing;
    } catch (error) {
      console.error('Failed to fetch user clothing:', error);
      throw new Error('Could not retrieve wardrobe items');
    }
  }

  /**
   * Create a single outfit combination
   */
  async createOutfitCombination(allClothing, occasion, weatherRecommendations, userPreference = '') {
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
        if (!dress) return null; // No suitable dress found
        
        outfit.items.push(dress);
        outfit.categories.push('dresses');
        
        // Add shoes
        if (categories.shoes.length > 0) {
          const shoes = this.selectMatchingItem(categories.shoes, dress, weatherRecommendations);
          if (shoes) {
            outfit.items.push(shoes);
            outfit.categories.push('shoes');
          }
        }
      } 
      // Strategy 2: Top + Bottom outfit
      else {
        // Select top
        if (categories.tops.length > 0) {
          const top = this.selectRandomItem(categories.tops, occasion, weatherRecommendations);
          if (!top) return null; // No suitable top found
          
          outfit.items.push(top);
          outfit.categories.push('tops');
          
          // Select matching bottom
          if (categories.bottoms.length > 0) {
            const bottom = this.selectMatchingItem(categories.bottoms, top, weatherRecommendations, outfit.items);
            if (bottom) {
              outfit.items.push(bottom);
              outfit.categories.push('bottoms');
            }
          }
          
          // Add shoes
          if (categories.shoes.length > 0) {
            const shoes = this.selectMatchingItem(categories.shoes, top, weatherRecommendations, outfit.items);
            if (shoes) {
              outfit.items.push(shoes);
              outfit.categories.push('shoes');
            }
          }
        }
      }

      // Add outerwear - REQUIRED for cold weather OUTDOOR occasions only
      const isIndoor = ['home', 'comfy', 'comfortable', 'relaxed', 'cozy', 'working from home'].some(word =>
       userPreference.toLowerCase().includes(word)
      );
      if (this.needsOuterwear(weatherRecommendations) && !isIndoor) {
        if (categories.outerwear.length > 0) {
          const outerwear = this.selectMatchingItem(categories.outerwear, outfit.items[0], weatherRecommendations, outfit.items);
          if (outerwear) {
            outfit.items.push(outerwear);
            outfit.categories.push('outerwear');
            console.log('🧥 Added outerwear for outdoor occasion in cold weather');
          } else {
            console.warn('⚠️  No suitable outerwear found for cold weather');
          }
        } else {
          console.log('⚠️  No outerwear available for outdoor cold weather');
        }
      } else if (isIndoor) {
        console.log('🏠 Indoor occasion - skipping outerwear');
      }
      
      // Add accessories (optional)
      if (categories.accessories.length > 0 && Math.random() > 0.6) {
        const accessory = this.selectRandomItem(categories.accessories, occasion, null);
        if (accessory) {
          outfit.items.push(accessory);
          outfit.categories.push('accessories');
        }
      }

      // Extract outfit metadata
      outfit.colors = [...new Set(outfit.items.map(i => i.color.primary))];
      outfit.styles = [...new Set(outfit.items.map(i => i.aiAnalysis?.style || 'casual'))];

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
    // Filter by occasion using aiAnalysis data
    let filtered = items.filter(item => {
      const itemOccasions = item.aiAnalysis?.occasion || [];
      const itemStyle = item.aiAnalysis?.style || 'casual';
      
      // For professional/meeting/interview - REQUIRE work/formal occasions
      if (['professional', 'meeting', 'interview', 'formal'].includes(occasion)) {
        const hasWorkOccasion = itemOccasions.includes('work') || itemOccasions.includes('formal');
        const isNotTooCasual = itemStyle !== 'casual' || hasWorkOccasion;
        return hasWorkOccasion && isNotTooCasual;
      }
      
      // For other occasions, be more lenient
      const occasionMap = {
        'casual': ['everyday', 'casual'],
        'date': ['casual', 'formal', 'everyday'],
        'party': ['casual', 'formal'],
        'work': ['work', 'formal', 'everyday']
      };
      
      const matchingOccasions = occasionMap[occasion] || ['everyday'];
      return itemOccasions.length === 0 || 
             itemOccasions.some(o => matchingOccasions.includes(o));
    });

    // Filter by weather if available
    if (weatherRecommendations) {
      filtered = this.filterByWeather(filtered, weatherRecommendations);
    }

    // If no matches, return null instead of using all items
    if (filtered.length === 0) {
      console.log(`⚠️  No items found for occasion: ${occasion}`);
      return null;
    }

    // Select random item
    return filtered[Math.floor(Math.random() * filtered.length)];
  }

  /**
   * Select item that matches with existing item
   */
  selectMatchingItem(items, existingItem, weatherRecommendations, excludeItems = []) {
    // Filter out already-selected items
    const availableItems = items.filter(item => 
      !excludeItems.some(existing => existing._id.toString() === item._id.toString())
    );
    
    if (availableItems.length === 0) return null;
    
    // Score each item for compatibility
    const scored = availableItems.map(item => ({
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
    const style1 = item1.aiAnalysis?.style ? [item1.aiAnalysis.style] : ['casual'];
    const style2 = item2.aiAnalysis?.style ? [item2.aiAnalysis.style] : ['casual'];
    const styleMatch = style1[0] === style2[0] ? 1 : 0.5;
    score += styleMatch * 30;

    // Occasion compatibility (20 points)
    const occasions1 = item1.aiAnalysis?.occasion || [];
    const occasions2 = item2.aiAnalysis?.occasion || [];
    if (occasions1.length > 0 && occasions2.length > 0) {
      const occasionOverlap = occasions1.filter(o => occasions2.includes(o)).length;
      score += (occasionOverlap / Math.max(occasions1.length, occasions2.length)) * 20;
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
    if (!weatherRecommendations) return false;
    
    const temp = weatherRecommendations.temperature;
    
    // Require outerwear for cold, freezing, cool weather, OR any precipitation
    return temp === 'cold' || 
           temp === 'freezing' || 
           temp === 'cool' ||
           weatherRecommendations.precipitation?.level !== 'none' ||
           weatherRecommendations.required?.includes('outerwear');
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
  /**
 * Check if item is weather appropriate
 */
isWeatherAppropriate(item, weatherRecommendations) {
  if (!weatherRecommendations) return true;
  
  const temp = weatherRecommendations.temperature;
  const season = item.season || [];
  const subcategory = (item.subcategory || '').toLowerCase();
  const category = (item.category || '').toLowerCase();
  
  // SPECIAL RULE: Outerwear should ALWAYS be allowed in cold weather regardless of season
  // A fall jacket is still useful in freezing temps!
  if (category === 'outerwear' && (temp === 'freezing' || temp === 'cold' || temp === 'cool')) {
    console.log(`🧥 Allowing outerwear in ${temp} weather regardless of season`);
    return true;
  }
  
  // Block summer items in cold weather (but allow tops that can be layered)
  if ((temp === 'freezing' || temp === 'cold') && 
      season.includes('summer') && 
      !season.includes('all-season')) {
    // CRITICAL: Block ALL summer bottoms in cold weather (likely shorts/skirts without subcategory data)
    if (category === 'bottoms') {
      console.log(`❄️ Blocking summer bottoms in ${temp} weather (likely shorts/skirts)`);
      return false;
    }
    // For other items, only block specific subcategories
    if (subcategory.includes('tank') || 
        subcategory.includes('sleeveless') ||
        subcategory.includes('sandals') ||
        subcategory.includes('flip-flop')) {
      console.log(`❄️ Blocking summer ${subcategory} in ${temp} weather`);
      return false;
    }
    // Allow summer tops/dresses (can be layered)
    console.log(`✅ Allowing summer ${category} - can be layered in ${temp} weather`);
    return true;
  }
  
  // Block winter items in hot weather
  if (temp === 'hot' && 
      season.includes('winter') && 
      !season.includes('all-season')) {
    return false;
  }
  
  // CRITICAL: Shorts/skirts not allowed in cold/freezing weather (if we have subcategory data)
  if ((temp === 'cold' || temp === 'freezing') && 
      (subcategory.includes('shorts') || 
       subcategory.includes('short') ||
       subcategory.includes('skirt'))) {
    console.log(`❄️ Blocking ${subcategory} in ${temp} weather`);
    return false;
  }
  
  // CRITICAL: Tank tops/sleeveless not allowed in cold weather
  if ((temp === 'cold' || temp === 'freezing') &&
      (subcategory.includes('tank') ||
       subcategory.includes('sleeveless') ||
       subcategory.includes('cami'))) {
    return false;
  }
  
  // Check if item category is in avoid list
  if (weatherRecommendations.avoid?.some(a => 
    subcategory?.includes(a) || category.includes(a)
  )) {
    return false;
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