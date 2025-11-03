// services/outfit-service/src/controllers/aiController.js

const aiService = require('../services/aiService');
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
 */
exports.generateOutfits = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const { occasion = 'casual', city, maxSuggestions = 5 } = req.body;

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
 */
exports.testColorCompatibility = async (req, res) => {
  try {
    const { color1, color2 } = req.body;

    if (!color1 || !color2) {
      return res.status(400).json({
        success: false,
        message: 'Both colors are required'
      });
    }

    const score = colorMatching.getColorCompatibility(color1, color2);
    const suggestions = colorMatching.suggestComplementaryColors(color1);

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
        }
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
 */
exports.validateOutfit = async (req, res) => {
  try {
    const { colors, styles, occasion } = req.body;

    if (!colors || !styles) {
      return res.status(400).json({
        success: false,
        message: 'Colors and styles are required'
      });
    }

    const colorValidation = colorMatching.validateOutfitColors(colors);
    const styleValidation = styleMatching.validateOutfitStyles(styles, occasion);

    const isValid = colorValidation.isValid && styleValidation.isValid;

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
        ]
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
 */
exports.getDailyOutfit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { city } = req.query;

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
        )
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