// services/outfit-service/src/controllers/travelPackingController.js

const weatherService = require('../services/weatherService');
const outfitGenerator = require('../services/outfitGenerator');
const axios = require('axios');

const WARDROBE_SERVICE_URL = process.env.WARDROBE_SERVICE_URL || 'http://localhost:3003';

/**
 * Generate packing recommendations for a trip
 * POST /api/outfits/travel-plan
 * 
 * Body: {
 *   destination: "Paris",
 *   startDate: "2024-12-20",
 *   endDate: "2024-12-27",
 *   activities: ["sightseeing", "dining", "business"] (optional)
 * }
 */
exports.getTravelPackingPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const token = req.headers.authorization;
    const { destination, startDate, endDate, activities } = req.body;

    // Validate required fields
    if (!destination || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: destination, startDate, and endDate are required'
      });
    }

    // Parse and validate dates
    const tripStartDate = new Date(startDate);
    const tripEndDate = new Date(endDate);
    const today = new Date();

    if (isNaN(tripStartDate.getTime()) || isNaN(tripEndDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    if (tripEndDate <= tripStartDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    const tripDays = Math.ceil((tripEndDate - tripStartDate) / (1000 * 60 * 60 * 24));
    
    if (tripDays > 30) {
      return res.status(400).json({
        success: false,
        message: 'Trip duration cannot exceed 30 days'
      });
    }

    // Get weather forecast for destination
    let weatherForecast = [];
    try {
      const forecast = await weatherService.getWeatherForecast(destination);
      weatherForecast = forecast.slice(0, Math.min(tripDays, 7));
    } catch (error) {
      console.error('Weather forecast error:', error);
      // Continue without weather if API fails
      weatherForecast = [];
    }

    // Fetch user's wardrobe
    let wardrobeItems = [];
    try {
      const wardrobeResponse = await axios.get(`${WARDROBE_SERVICE_URL}/api/wardrobe`, {
        headers: { Authorization: token }
      });
      wardrobeItems = wardrobeResponse.data.data || [];
    } catch (error) {
      console.error('Error fetching wardrobe:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch wardrobe items'
      });
    }

    if (wardrobeItems.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Your wardrobe is empty',
        suggestion: 'Add clothing items before creating a packing plan'
      });
    }

    // Analyze weather patterns
    const weatherAnalysis = analyzeWeatherPatterns(weatherForecast);
    
    // Determine packing needs based on activities
    const packingNeeds = determinePackingNeeds(activities || [], weatherAnalysis, tripDays);

    // Generate optimal packing list
    const packingList = generatePackingList(wardrobeItems, packingNeeds, weatherAnalysis, tripDays);

    // Create day-by-day outfit suggestions
    const dailyOutfits = [];
    for (let day = 0; day < Math.min(tripDays, 7); day++) {
      const dayWeather = weatherForecast[day] || weatherAnalysis.average;
      const dayActivity = activities && activities[day % activities.length] || 'casual';
      
      const dayOutfits = await outfitGenerator.generateOutfits(userId, {
        occasion: dayActivity,
        weather: { current: dayWeather },
        maxSuggestions: 1,
        includeWeather: true
      });

      if (dayOutfits.length > 0) {
        dailyOutfits.push({
          day: day + 1,
          date: new Date(tripStartDate.getTime() + day * 24 * 60 * 60 * 1000).toLocaleDateString(),
          weather: {
            temp: `${dayWeather.temperature.value}°F`,
            condition: dayWeather.condition.description
          },
          activity: dayActivity,
          outfit: dayOutfits[0].items.map(item => ({
            id: item._id,
            category: item.category,
            name: `${item.color.primary} ${item.subcategory || item.category}`
          }))
        });
      }
    }

    // Build response
    const response = {
      success: true,
      message: 'Travel packing plan generated successfully',
      data: {
        trip: {
          destination,
          duration: `${tripDays} days`,
          startDate: tripStartDate.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          }),
          endDate: tripEndDate.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          }),
          activities: activities || ['general travel']
        },
        weather: {
          forecast: weatherForecast.map(day => ({
            temp: `${day.temperature.value}°F`,
            condition: day.condition.description
          })),
          analysis: weatherAnalysis
        },
        packingList: packingList,
        dailyOutfits: dailyOutfits,
        tips: generateTravelTips(weatherAnalysis, tripDays, activities)
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Travel Packing Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate travel packing plan',
      error: error.message
    });
  }
};

/**
 * Analyze weather patterns from forecast
 */
function analyzeWeatherPatterns(forecast) {
  if (forecast.length === 0) {
    return {
      average: {
        temperature: { value: 70, category: 'comfortable' },
        condition: { description: 'Variable' }
      },
      range: { min: 60, max: 80 },
      conditions: ['variable weather - pack layers']
    };
  }

  const temps = forecast.map(day => day.temperature.value);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;

  const conditions = [...new Set(forecast.map(day => 
    day.condition.description.toLowerCase()
  ))];

  return {
    average: {
      temperature: { 
        value: Math.round(avgTemp),
        category: avgTemp < 50 ? 'cold' : avgTemp < 70 ? 'comfortable' : 'warm'
      },
      condition: { description: conditions.join(', ') }
    },
    range: { min: minTemp, max: maxTemp },
    conditions: conditions
  };
}

/**
 * Determine what to pack based on activities and weather
 */
function determinePackingNeeds(activities, weatherAnalysis, tripDays) {
  const needs = {
    categories: {},
    essentials: [],
    optional: []
  };

  // Base needs
  needs.categories = {
    tops: Math.ceil(tripDays * 0.8), // One per day with some repeats
    bottoms: Math.ceil(tripDays * 0.5), // Can repeat pants/skirts
    shoes: 3, // Casual, formal, athletic
    outerwear: weatherAnalysis.range.min < 60 ? 2 : 1,
    accessories: 2
  };

  // Activity-specific needs
  if (activities.includes('business') || activities.includes('formal')) {
    needs.essentials.push('formal outfit', 'dress shoes');
  }

  if (activities.includes('athletic') || activities.includes('hiking')) {
    needs.essentials.push('athletic wear', 'comfortable shoes');
  }

  if (activities.includes('beach') || activities.includes('swimming')) {
    needs.essentials.push('swimwear', 'sandals');
  }

  // Weather-specific needs
  if (weatherAnalysis.range.min < 50) {
    needs.essentials.push('warm jacket', 'layers');
  }

  if (weatherAnalysis.conditions.some(c => c.includes('rain'))) {
    needs.essentials.push('rain jacket', 'umbrella');
  }

  if (weatherAnalysis.range.max > 80) {
    needs.essentials.push('light, breathable fabrics', 'sun protection');
  }

  return needs;
}

/**
 * Generate optimal packing list from wardrobe
 */
function generatePackingList(wardrobeItems, needs, weatherAnalysis, tripDays) {
  const packingList = {
    mustPack: [],
    recommended: [],
    optional: [],
    summary: {
      totalItems: 0,
      byCategory: {}
    }
  };

  // Categorize wardrobe items
  const itemsByCategory = {};
  wardrobeItems.forEach(item => {
    if (!itemsByCategory[item.category]) {
      itemsByCategory[item.category] = [];
    }
    itemsByCategory[item.category].push(item);
  });

  // Select items based on needs
  Object.entries(needs.categories).forEach(([category, count]) => {
    const availableItems = itemsByCategory[category] || [];
    
    // Prioritize versatile, weather-appropriate items
    const suitableItems = availableItems
      .filter(item => isWeatherAppropriate(item, weatherAnalysis))
      .sort((a, b) => (b.wearCount || 0) - (a.wearCount || 0)) // Most worn first
      .slice(0, count);

    suitableItems.forEach(item => {
      packingList.mustPack.push({
        id: item._id,
        name: `${item.color.primary} ${item.subcategory || item.category}`,
        category: item.category,
        versatility: calculateVersatility(item),
        imageURL: item.imageURL
      });
    });

    packingList.summary.byCategory[category] = suitableItems.length;
    packingList.summary.totalItems += suitableItems.length;
  });

  // Add essentials
  needs.essentials.forEach(essential => {
    if (!packingList.mustPack.some(item => 
      item.name.toLowerCase().includes(essential.toLowerCase())
    )) {
      packingList.recommended.push(essential);
    }
  });

  return packingList;
}

/**
 * Check if item is appropriate for weather
 */
function isWeatherAppropriate(item, weatherAnalysis) {
  const avgTemp = weatherAnalysis.average.temperature.value;
  
  // Check season appropriateness
  if (item.season) {
    if (avgTemp < 50 && item.season.includes('winter')) return true;
    if (avgTemp >= 50 && avgTemp < 70 && (item.season.includes('spring') || item.season.includes('fall'))) return true;
    if (avgTemp >= 70 && item.season.includes('summer')) return true;
    if (item.season.includes('all-season')) return true;
  }

  return true; // Include if no season specified
}

/**
 * Calculate item versatility (can be worn multiple ways)
 */
function calculateVersatility(item) {
  let score = 0;
  
  // Neutral colors are more versatile
  const neutralColors = ['black', 'white', 'gray', 'navy', 'beige'];
  if (neutralColors.includes(item.color.primary.toLowerCase())) score += 2;
  
  // Items worn frequently are proven versatile
  if (item.wearCount > 5) score += 2;
  
  // Certain categories are more versatile
  if (['jeans', 'black pants', 'white shirt'].some(v => 
    (item.subcategory || '').toLowerCase().includes(v)
  )) score += 1;

  return score > 3 ? 'high' : score > 1 ? 'medium' : 'low';
}

/**
 * Generate travel tips
 */
function generateTravelTips(weatherAnalysis, tripDays, activities) {
  const tips = [];

  tips.push('Roll clothes instead of folding to save space');
  tips.push('Pack versatile items that can be mixed and matched');
  
  if (tripDays > 7) {
    tips.push('Consider doing laundry mid-trip to pack lighter');
  }

  if (weatherAnalysis.range.max - weatherAnalysis.range.min > 20) {
    tips.push('Temperature varies significantly - pack layers');
  }

  if (activities && activities.length > 2) {
    tips.push('Multiple activities planned - ensure you have appropriate outfits for each');
  }

  tips.push('Pack an extra outfit in case of spills or unexpected events');
  tips.push('Wear your bulkiest items during travel to save luggage space');

  return tips;
}

