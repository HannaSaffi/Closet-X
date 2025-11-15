// services/outfit-service/src/controllers/dailyOutfitController.js

const User = require('../models/User');
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
 * 1. User authentication (must be logged in)
 * 2. Weather API (gets current weather)
 * 3. AI Service (gets fashion advice)
 * 4. User's clothing database (generates outfits)
 * 5. Returns complete recommendations
 */
exports.getDailyOutfit = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const { city, includeAI = true } = req.query;

    // ========================================================================
    // STEP 1: Get User Info and Preferences
    // ========================================================================
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Use user's default city if not provided
    const targetCity = city || user.preferences.defaultCity || 'New York';

    // ========================================================================
    // STEP 2: Get Current Weather
    // ========================================================================
    console.log(`Fetching weather for ${targetCity}...`);
    
    let weather;
    try {
      weather = await weatherService.getCurrentWeather(targetCity);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get weather data',
        error: error.message,
        hint: 'Please check the city name'
      });
    }

    // Get weather-based clothing recommendations
    const weatherRecs = weatherService.getClothingRecommendations(weather);

    // ========================================================================
    // STEP 3: Generate Outfits from User's Wardrobe
    // ========================================================================
    console.log(`Generating outfits for user ${userId}...`);
    
    const outfits = await outfitGenerator.generateOutfits(userId, {
      occasion: 'casual',
      weather,
      maxSuggestions: 5,
      includeWeather: true,
      userStyle: user.preferences.style
    });

    if (outfits.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Could not generate outfits',
        reason: 'Not enough clothing items in your wardrobe',
        suggestion: 'Please add more clothing items to your wardrobe'
      });
    }

    // ========================================================================
    // STEP 4: Get AI Fashion Advice (if enabled)
    // ========================================================================
    let aiAdvice = null;
    let aiAnalysis = null;
    
    if (includeAI === 'true' || includeAI === true) {
      console.log('Getting AI fashion advice...');
      
      const isAIAvailable = await aiAdviceService.isAvailable();
      
      if (isAIAvailable) {
        // Get general fashion advice
        const adviceResult = await aiAdviceService.getFashionAdvice({
          occasion: 'daily casual',
          weather: weather.current.condition.description,
          temperature: `${weather.current.temperature.value}°F`,
          colors: outfits[0].colors,
          style: user.preferences.style || 'casual'
        });
        
        if (adviceResult.success) {
          aiAdvice = {
            advice: adviceResult.advice,
            provider: adviceResult.provider
          };
        }

        // Analyze the top outfit
        const topOutfit = outfits[0];
        const analysisResult = await aiAdviceService.analyzeOutfit({
          top: topOutfit.items.find(i => i.category === 'tops'),
          bottom: topOutfit.items.find(i => i.category === 'bottoms'),
          shoes: topOutfit.items.find(i => i.category === 'shoes'),
          outerwear: topOutfit.items.find(i => i.category === 'outerwear')
        });
        
        if (analysisResult.success) {
          aiAnalysis = {
            analysis: analysisResult.analysis,
            provider: analysisResult.provider
          };
        }
      } else {
        console.log('AI service not available, using algorithmic recommendations');
      }
    }

    // ========================================================================
    // STEP 5: Increment User's Outfit Counter
    // ========================================================================
    await user.incrementOutfits();

    // ========================================================================
    // STEP 6: Format and Return Response
    // ========================================================================
    const response = {
      success: true,
      message: 'Daily outfit recommendations generated successfully',
      data: {
        // User Info
        user: {
          name: user.fullName,
          style: user.preferences.style,
          outfitsGenerated: user.outfitsGenerated + 1
        },

        // Date and Location
        date: new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        location: {
          city: weather.location.city,
          region: weather.location.region,
          country: weather.location.country
        },

        // Weather Information
        weather: {
          temperature: {
            current: `${weather.current.temperature.value}°F`,
            feelsLike: `${weather.current.temperature.feelsLike}°F`,
            category: weather.current.temperature.category
          },
          condition: {
            description: weather.current.condition.description,
            icon: weather.current.condition.icon
          },
          humidity: `${weather.current.humidity}%`,
          windSpeed: `${weather.current.wind.speed} mph`,
          recommendation: weatherRecs.summary
        },

        // Weather-Based Suggestions
        weatherTips: {
          shouldBring: weatherRecs.suggested,
          layering: weatherRecs.layering || 'Standard layering',
          accessories: weatherRecs.accessories || []
        },

        // Outfit Recommendations (Multiple Options)
        outfits: outfits.map((outfit, index) => ({
          rank: index + 1,
          items: outfit.items.map(item => ({
            id: item._id,
            category: item.category,
            subcategory: item.subcategory,
            color: item.color.primary,
            secondaryColors: item.color.secondary,
            brand: item.brand,
            imageURL: item.imageURL,
            style: item.style
          })),
          score: {
            overall: outfit.score,
            colorHarmony: Math.round(colorMatching.calculateColorHarmony(outfit.colors) * 100),
            styleCoherence: Math.round(styleMatching.calculateStyleCoherence(outfit.styles) * 100),
            weatherAppropriate: outfit.weatherScore || 100
          },
          colors: outfit.colors,
          styles: outfit.styles,
          whyThisWorks: [
            `Color harmony: ${Math.round(colorMatching.calculateColorHarmony(outfit.colors) * 100)}%`,
            `Style coherence: ${Math.round(styleMatching.calculateStyleCoherence(outfit.styles) * 100)}%`,
            `Weather appropriate for ${weather.current.temperature.category} conditions`,
            `Matches your ${user.preferences.style} style preference`
          ]
        })),

        // AI-Powered Insights (if available)
        aiInsights: aiAdvice ? {
          fashionAdvice: aiAdvice.advice,
          outfitAnalysis: aiAnalysis ? aiAnalysis.analysis : null,
          provider: aiAdvice.provider,
          note: 'AI-powered recommendations based on current trends and weather'
        } : null,

        // Quick Summary for Dashboard
        summary: {
          topRecommendation: `${outfits[0].items.find(i => i.category === 'tops')?.color.primary || ''} ${outfits[0].items.find(i => i.category === 'tops')?.subcategory || 'top'} with ${outfits[0].items.find(i => i.category === 'bottoms')?.color.primary || ''} ${outfits[0].items.find(i => i.category === 'bottoms')?.subcategory || 'bottoms'}`,
          weatherSummary: `${weather.current.temperature.value}°F and ${weather.current.condition.description.toLowerCase()}`,
          recommendation: weatherRecs.summary
        }
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Daily Outfit Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate daily outfit',
      error: error.message
    });
  }
};

/**
 * Get weekly outfit plan
 * GET /api/weekly-outfits
 */
exports.getWeeklyOutfits = async (req, res) => {
  try {
    const userId = req.user.id;
    const { city } = req.query;

    const user = await User.findById(userId);
    const targetCity = city || user.preferences.defaultCity || 'New York';

    // Get 7-day forecast
    const forecast = await weatherService.getWeatherForecast(targetCity);

    // Generate outfit for each day
    const weeklyPlan = await Promise.all(
      forecast.map(async (day, index) => {
        const outfits = await outfitGenerator.generateOutfits(userId, {
          occasion: 'casual',
          weather: { current: day },
          maxSuggestions: 1
        });

        return {
          day: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long' }),
          date: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toLocaleDateString(),
          weather: {
            temperature: `${day.temperature.value}°F`,
            condition: day.condition.description
          },
          outfit: outfits[0] ? {
            items: outfits[0].items.map(item => ({
              category: item.category,
              color: item.color.primary,
              imageURL: item.imageURL
            }))
          } : null
        };
      })
    );

    res.json({
      success: true,
      data: {
        weeklyPlan,
        location: targetCity
      }
    });

  } catch (error) {
    console.error('Weekly Outfits Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate weekly outfits',
      error: error.message
    });
  }
};

/**
 * Save outfit as favorite
 * POST /api/daily-outfit/save
 */
exports.saveFavoriteOutfit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { outfitItems, occasion, notes } = req.body;

    // Here you would save to a SavedOutfits collection
    // For now, just acknowledge

    res.json({
      success: true,
      message: 'Outfit saved to favorites',
      data: {
        saved: true
      }
    });

  } catch (error) {
    console.error('Save Favorite Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save outfit',
      error: error.message
    });
  }
};