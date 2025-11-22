// services/outfit-service/src/controllers/dailyOutfitController.js

const weatherService = require('../services/weatherService');
const aiAdviceService = require('../services/aiAdviceService');
const outfitGenerator = require('../services/outfitGenerator');
const { colorMatching } = require('../algorithms/colorMatching');
const { styleMatching } = require('../algorithms/styleMatching');

/**
 * MAIN ENDPOINT: "What Should I Wear Today"
 * GET /api/daily-outfit
 * 
 * This connects:
 * 1. User authentication (token from user-service)
 * 2. Weather API (gets current weather)
 * 3. AI Service (gets fashion advice)
 * 4. User's clothing database (generates outfits)
 * 5. Returns complete recommendations
 */
exports.getDailyOutfit = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware (user-service token)
    const userEmail = req.user.email;
    const { city, includeAI = true } = req.query;

    console.log(`🎯 Daily outfit request for user: ${userId} (${userEmail})`);

    // ========================================================================
    // STEP 1: Set default preferences (no local user database)
    // ========================================================================
    const targetCity = city || 'New York';
    const userStyle = 'casual'; // Default style

    // ========================================================================
    // STEP 2: Get Current Weather
    // ========================================================================
    console.log(`🌤️  Fetching weather for ${targetCity}...`);
    
    let weather;
    try {
      weather = await weatherService.getCurrentWeather(targetCity);
      console.log(`✅ Weather: ${weather.temp}°F, ${weather.description}`);
    } catch (error) {
      console.error('Weather fetch failed:', error.message);
      return res.status(400).json({
        success: false,
        message: 'Failed to get weather data',
        error: error.message,
        hint: 'Please check the city name or API key'
      });
    }

    // Get weather-based clothing recommendations
    const weatherRecs = weatherService.getClothingRecommendations(weather);

    // ========================================================================
    // STEP 3: Generate Outfits from User's Wardrobe
    // ========================================================================
    console.log(`👔 Generating outfits for user ${userId}...`);
    
    let outfits;
    try {
      // Pass the auth token to outfitGenerator so it can fetch wardrobe
      const token = req.headers.authorization.split(' ')[1];
      
      outfits = await outfitGenerator.generateOutfits(userId, {
        occasion: 'casual',
        weather,
        maxSuggestions: 5,
        includeWeather: true,
        userStyle,
        token // Pass token for wardrobe service calls
      });

      console.log(`✅ Generated ${outfits.length} outfits`);
    } catch (error) {
      console.error('Outfit generation failed:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate daily outfit',
        error: error.message
      });
    }

    if (outfits.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Could not generate outfits',
        reason: 'Not enough clothing items in your wardrobe',
        suggestion: 'Please add more clothing items to your wardrobe'
      });
    }

    // ========================================================================
    // STEP 4: Get AI Fashion Advice (Optional)
    // ========================================================================
    let aiAdvice = null;
    
    if (includeAI) {
      try {
        console.log('🤖 Getting AI fashion advice...');
        aiAdvice = await aiAdviceService.getAdvice({
          weather,
          outfits: outfits.slice(0, 3),
          occasion: 'casual',
          userStyle
        });
        console.log('✅ AI advice generated');
      } catch (error) {
        console.error('AI advice failed (non-critical):', error.message);
        // Don't fail the request if AI fails
      }
    }

    // ========================================================================
    // STEP 5: Return Complete Response
    // ========================================================================
    return res.json({
      success: true,
      message: 'Daily outfit recommendations generated',
      data: {
        date: new Date().toISOString(),
        location: targetCity,
        weather: {
          temp: weather.temp,
          feelsLike: weather.feelsLike,
          condition: weather.main,
          description: weather.description,
          humidity: weather.humidity,
          windSpeed: weather.windSpeed
        },
        weatherRecommendations: weatherRecs,
        outfits: outfits.slice(0, 3), // Top 3 outfits
        aiAdvice,
        tips: [
          `It's ${weather.temp}°F in ${targetCity}`,
          weatherRecs.recommendation,
          aiAdvice ? 'AI-powered suggestions included' : 'Try enabling AI for personalized tips'
        ]
      }
    });

  } catch (error) {
    console.error('Daily Outfit Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate daily outfit',
      error: error.message
    });
  }
};

/**
 * GET /api/daily-outfit/weekly
 * Get outfit recommendations for the entire week
 */
exports.getWeeklyOutfits = async (req, res) => {
  try {
    const userId = req.user.id;
    const { city } = req.query;
    const targetCity = city || 'New York';

    console.log(`📅 Weekly outfits request for ${targetCity}`);

    // Get 7-day weather forecast
    const forecast = await weatherService.getWeeklyForecast(targetCity);

    const weeklyOutfits = [];

    // Generate outfit for each day
    for (const day of forecast) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const outfits = await outfitGenerator.generateOutfits(userId, {
          occasion: 'casual',
          weather: day.weather,
          maxSuggestions: 1,
          includeWeather: true,
          token
        });

        weeklyOutfits.push({
          date: day.date,
          dayOfWeek: day.dayOfWeek,
          weather: day.weather,
          outfit: outfits[0] || null
        });
      } catch (error) {
        console.error(`Failed to generate outfit for ${day.date}:`, error.message);
      }
    }

    return res.json({
      success: true,
      message: 'Weekly outfit plan generated',
      data: {
        location: targetCity,
        weeklyOutfits
      }
    });

  } catch (error) {
    console.error('Weekly Outfits Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate weekly outfits',
      error: error.message
    });
  }
};

/**
 * POST /api/daily-outfit/save
 * Save an outfit as favorite
 */
exports.saveFavoriteOutfit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { outfitId, name } = req.body;

    // TODO: Implement saving favorite outfits
    // For now, just acknowledge the request

    return res.json({
      success: true,
      message: 'Outfit saved as favorite',
      data: {
        userId,
        outfitId,
        name,
        savedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Save Outfit Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save outfit',
      error: error.message
    });
  }
};