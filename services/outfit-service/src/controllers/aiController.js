// services/outfit-service/src/controllers/aiController.js
/**
 * Enhanced AI Controller with Backup AI Service Integration
 * 
 * This version includes the backup AI Advice Service (Gemini/OpenAI)
 * alongside your existing AI functionality.
 */

const aiService = require('../services/aiService');
const aiAdviceService = require('../services/aiAdviceService'); // ← NEW: Backup AI service
const weatherService = require('../services/weatherService');
const outfitGenerator = require('../services/outfitGenerator');
const { colorMatching } = require('../algorithms/colorMatching');
const { styleMatching } = require('../algorithms/styleMatching');

/**
 * Analyze clothing image with AI
 * POST /api/ai/analyze
 */
exports.analyzeImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required'
      });
    }

    // Analyze image with AI
    const analysis = await aiService.analyzeClothingImage(imageUrl);

    res.json({
      success: true,
      data: analysis,
      message: 'Image analyzed successfully'
    });
  } catch (error) {
    console.error('AI Analysis Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze image',
      error: error.message
    });
  }
};

/**
 * Get current weather
 * GET /api/weather/current?city=New York
 */
exports.getCurrentWeather = async (req, res) => {
  try {
    const { city } = req.query;

    const weather = await weatherService.getCurrentWeather(city);

    res.json({
      success: true,
      data: weather
    });
  } catch (error) {
    console.error('Weather Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get weather data',
      error: error.message
    });
  }
};

/**
 * Get weather forecast
 * GET /api/weather/forecast?city=New York
 */
exports.getWeatherForecast = async (req, res) => {
  try {
    const { city } = req.query;

    const forecast = await weatherService.getWeatherForecast(city);

    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    console.error('Forecast Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get forecast',
      error: error.message
    });
  }
};

/**
 * Get clothing recommendations based on weather
 * GET /api/weather/recommendations?city=New York
 */
exports.getWeatherRecommendations = async (req, res) => {
  try {
    const { city } = req.query;

    const weather = await weatherService.getCurrentWeather(city);
    const recommendations = weatherService.getClothingRecommendations(weather);

    res.json({
      success: true,
      data: {
        weather: {
          temperature: weather.current.temperature.value,
          condition: weather.current.condition.description,
          location: weather.location.city
        },
        recommendations
      }
    });
  } catch (error) {
    console.error('Recommendations Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: error.message
    });
  }
};

/**
 * Generate outfit suggestions
 * POST /api/outfits/generate
 * 
 * ENHANCED: Now includes optional AI advice from backup service
 */
exports.generateOutfits = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const { 
      occasion = 'casual', 
      city, 
      maxSuggestions = 5,
      includeAIAdvice = false // ← NEW: Optional AI enhancement
    } = req.body;

    // Get weather if city provided
    let weather = null;
    if (city) {
      weather = await weatherService.getCurrentWeather(city);
    }

    // Generate outfits
    const outfits = await outfitGenerator.generateOutfits(userId, {
      occasion,
      weather,
      maxSuggestions,
      includeWeather: !!city
    });

    // Get weather recommendations if applicable
    let weatherRecs = null;
    if (weather) {
      weatherRecs = weatherService.getClothingRecommendations(weather);
    }

    // ======================================================================
    // NEW: Get AI fashion advice if requested and service is available
    // ======================================================================
    let aiAdvice = null;
    if (includeAIAdvice) {
      const isAIAvailable = await aiAdviceService.isAvailable();
      
      if (isAIAvailable) {
        const advice = await aiAdviceService.getFashionAdvice({
          occasion,
          weather: weather ? weather.current.condition.description : 'mild',
          colors: outfits[0]?.colors || [],
          style: 'versatile'
        });
        
        if (advice.success) {
          aiAdvice = {
            advice: advice.advice,
            provider: advice.provider,
            generated: new Date().toISOString()
          };
        }
      }
    }

    res.json({
      success: true,
      data: {
        outfits: outfits.map(outfit => ({
          items: outfit.items.map(item => ({
            id: item._id,
            category: item.category,
            subcategory: item.subcategory,
            color: item.color.primary,
            imageURL: item.imageURL,
            brand: item.brand
          })),
          score: outfit.score,
          colors: outfit.colors,
          styles: outfit.styles,
          categories: outfit.categories
        })),
        weather: weather ? {
          temperature: weather.current.temperature.value,
          condition: weather.current.condition.description,
          recommendations: weatherRecs
        } : null,
        aiAdvice, // ← NEW: AI-powered fashion advice
        count: outfits.length
      },
      message: `Generated ${outfits.length} outfit suggestions`
    });
  } catch (error) {
    console.error('Outfit Generation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate outfits',
      error: error.message
    });
  }
};

/**
 * Test color compatibility
 * POST /api/colors/compatibility
 * 
 * ENHANCED: Now includes optional AI color analysis
 */
exports.testColorCompatibility = async (req, res) => {
  try {
    const { color1, color2, includeAIAnalysis = false } = req.body;

    if (!color1 || !color2) {
      return res.status(400).json({
        success: false,
        message: 'Both colors are required'
      });
    }

    const score = colorMatching.getColorCompatibility(color1, color2);
    const suggestions = colorMatching.suggestComplementaryColors(color1);

    // ======================================================================
    // NEW: Get AI color analysis if requested
    // ======================================================================
    let aiAnalysis = null;
    if (includeAIAnalysis) {
      const isAIAvailable = await aiAdviceService.isAvailable();
      
      if (isAIAvailable) {
        const analysis = await aiAdviceService.analyzeColors([color1, color2]);
        
        if (analysis.success) {
          aiAnalysis = {
            analysis: analysis.analysis,
            provider: analysis.provider
          };
        }
      }
    }

    res.json({
      success: true,
      data: {
        compatibility: {
          color1,
          color2,
          score: Math.round(score * 100),
          rating: score > 0.8 ? 'Excellent' : score > 0.6 ? 'Good' : score > 0.4 ? 'Fair' : 'Poor'
        },
        suggestions: {
          forColor: color1,
          perfect: suggestions.perfect,
          good: suggestions.good,
          avoid: suggestions.avoid
        },
        aiAnalysis // ← NEW: AI-powered color analysis
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check compatibility',
      error: error.message
    });
  }
};

/**
 * Test style compatibility
 * POST /api/styles/compatibility
 */
exports.testStyleCompatibility = async (req, res) => {
  try {
    const { style1, style2 } = req.body;

    if (!style1 || !style2) {
      return res.status(400).json({
        success: false,
        message: 'Both styles are required'
      });
    }

    const score = styleMatching.getStyleCompatibility(style1, style2);
    const suggestions = styleMatching.suggestCompatibleStyles(style1);

    res.json({
      success: true,
      data: {
        compatibility: {
          style1,
          style2,
          score: Math.round(score * 100),
          rating: score > 0.8 ? 'Excellent' : score > 0.6 ? 'Good' : score > 0.4 ? 'Fair' : 'Poor'
        },
        suggestions: {
          forStyle: style1,
          perfect: suggestions.perfect,
          good: suggestions.good,
          avoid: suggestions.avoid
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check style compatibility',
      error: error.message
    });
  }
};

/**
 * Validate outfit colors and styles
 * POST /api/outfits/validate
 * 
 * ENHANCED: Now includes optional AI outfit analysis
 */
exports.validateOutfit = async (req, res) => {
  try {
    const { 
      colors, 
      styles, 
      occasion, 
      outfit, // ← NEW: Optional outfit details for AI analysis
      includeAIAnalysis = false 
    } = req.body;

    if (!colors || !styles) {
      return res.status(400).json({
        success: false,
        message: 'Colors and styles are required'
      });
    }

    const colorValidation = colorMatching.validateOutfitColors(colors);
    const styleValidation = styleMatching.validateOutfitStyles(styles, occasion);

    const isValid = colorValidation.isValid && styleValidation.isValid;

    // ======================================================================
    // NEW: Get AI outfit analysis if requested and outfit details provided
    // ======================================================================
    let aiAnalysis = null;
    if (includeAIAnalysis && outfit) {
      const isAIAvailable = await aiAdviceService.isAvailable();
      
      if (isAIAvailable) {
        const analysis = await aiAdviceService.analyzeOutfit(outfit);
        
        if (analysis.success) {
          aiAnalysis = {
            analysis: analysis.analysis,
            provider: analysis.provider
          };
        }
      }
    }

    res.json({
      success: true,
      data: {
        isValid,
        colors: colorValidation,
        styles: styleValidation,
        overallScore: Math.round(
          (colorValidation.harmonyScore + styleValidation.coherenceScore) / 2 * 100
        ),
        recommendations: [
          ...colorValidation.suggestions,
          ...styleValidation.suggestions
        ],
        aiAnalysis // ← NEW: AI-powered outfit analysis
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to validate outfit',
      error: error.message
    });
  }
};

/**
 * Get daily outfit suggestion (weather-based)
 * GET /api/outfits/daily?city=New York
 * 
 * ENHANCED: Now includes AI fashion advice
 */
exports.getDailyOutfit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { city, includeAIAdvice = true } = req.query; // ← AI advice on by default

    if (!city) {
      return res.status(400).json({
        success: false,
        message: 'City is required'
      });
    }

    // Get weather
    const weather = await weatherService.getCurrentWeather(city);
    const recommendations = weatherService.getClothingRecommendations(weather);

    // Generate single best outfit
    const outfits = await outfitGenerator.generateOutfits(userId, {
      occasion: 'casual',
      weather,
      maxSuggestions: 1,
      includeWeather: true
    });

    if (outfits.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Could not generate outfit - not enough clothing items'
      });
    }

    const outfit = outfits[0];

    // ======================================================================
    // NEW: Get AI fashion advice for daily outfit
    // ======================================================================
    let aiAdvice = null;
    if (includeAIAdvice === 'true' || includeAIAdvice === true) {
      const isAIAvailable = await aiAdviceService.isAvailable();
      
      if (isAIAvailable) {
        const advice = await aiAdviceService.getFashionAdvice({
          occasion: 'casual',
          weather: weather.current.condition.description,
          colors: outfit.colors,
          style: 'comfortable and stylish'
        });
        
        if (advice.success) {
          aiAdvice = {
            advice: advice.advice,
            provider: advice.provider
          };
        }
      }
    }

    res.json({
      success: true,
      data: {
        date: new Date().toLocaleDateString(),
        weather: {
          temperature: `${weather.current.temperature.value}°F`,
          condition: weather.current.condition.description,
          feelsLike: `${weather.current.temperature.feelsLike}°F`,
          location: `${weather.location.city}, ${weather.location.country}`
        },
        recommendation: recommendations.summary,
        outfit: {
          items: outfit.items.map(item => ({
            id: item._id,
            category: item.category,
            subcategory: item.subcategory,
            color: item.color.primary,
            imageURL: item.imageURL
          })),
          score: outfit.score,
          whyThisWorks: [
            `Color harmony score: ${Math.round(colorMatching.calculateColorHarmony(outfit.colors) * 100)}%`,
            `Style coherence: ${Math.round(styleMatching.calculateStyleCoherence(outfit.styles) * 100)}%`,
            `Weather appropriate for ${weather.current.temperature.category} conditions`
          ]
        },
        tips: recommendations.suggested.map(tip => 
          `Consider bringing: ${tip}`
        ),
        aiAdvice // ← NEW: AI-powered fashion advice
      }
    });
  } catch (error) {
    console.error('Daily Outfit Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get daily outfit',
      error: error.message
    });
  }
};

// ============================================================================
// NEW ENDPOINTS: Backup AI Service Features
// ============================================================================

/**
 * Get AI fashion advice (standalone endpoint)
 * POST /api/ai/fashion-advice
 */
exports.getAIFashionAdvice = async (req, res) => {
  try {
    const { occasion, weather, colors, style, preferences } = req.body;

    // Check if AI service is available
    const isAvailable = await aiAdviceService.isAvailable();
    
    if (!isAvailable) {
      return res.status(503).json({
        success: false,
        message: 'AI Advice Service is currently unavailable',
        fallback: 'Please try again later or use our algorithmic recommendations.'
      });
    }

    const advice = await aiAdviceService.getFashionAdvice({
      occasion,
      weather,
      colors,
      style,
      preferences
    });

    if (!advice.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get AI advice',
        error: advice.error
      });
    }

    res.json({
      success: true,
      data: {
        advice: advice.advice,
        provider: advice.provider,
        context: {
          occasion,
          weather,
          colors,
          style
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('AI Fashion Advice Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get fashion advice',
      error: error.message
    });
  }
};

/**
 * Analyze outfit with AI (standalone endpoint)
 * POST /api/ai/analyze-outfit
 */
exports.analyzeOutfitWithAI = async (req, res) => {
  try {
    const { top, bottom, shoes, outerwear } = req.body;

    if (!top || !bottom) {
      return res.status(400).json({
        success: false,
        message: 'At least top and bottom are required'
      });
    }

    const isAvailable = await aiAdviceService.isAvailable();
    
    if (!isAvailable) {
      return res.status(503).json({
        success: false,
        message: 'AI Advice Service is currently unavailable'
      });
    }

    const analysis = await aiAdviceService.analyzeOutfit({
      top,
      bottom,
      shoes,
      outerwear
    });

    res.json({
      success: true,
      data: {
        analysis: analysis.success ? analysis.analysis : analysis.fallback,
        provider: analysis.provider,
        outfit: { top, bottom, shoes, outerwear },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('AI Outfit Analysis Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze outfit',
      error: error.message
    });
  }
};

/**
 * Check AI service status
 * GET /api/ai/status
 */
exports.getAIServiceStatus = async (req, res) => {
  try {
    const isAvailable = await aiAdviceService.isAvailable();
    
    res.json({
      success: true,
      data: {
        available: isAvailable,
        service: 'AI Advice Service (Gemini/OpenAI)',
        lastCheck: aiAdviceService.lastCheck,
        message: isAvailable 
          ? 'AI Advice Service is operational' 
          : 'AI Advice Service is currently unavailable, using algorithmic fallbacks'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check AI service status',
      error: error.message
    });
  }
};