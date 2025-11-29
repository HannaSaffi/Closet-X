// services/outfit-service/src/controllers/eventOutfitController.js

const weatherService = require('../services/weatherService');
const outfitGenerator = require('../services/outfitGenerator');
const { colorMatching } = require('../algorithms/colorMatching');
const { styleMatching } = require('../algorithms/styleMatching');

/**
 * Generate outfit recommendations for a specific event
 * POST /api/outfits/event
 * 
 * Body: {
 *   date: "2024-12-25",
 *   city: "New York",
 *   occasion: "wedding" | "interview" | "date" | "party" | etc.
 *   dresscode: "formal" | "business casual" | "casual" | etc. (optional)
 * }
 */
exports.getEventOutfit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, city, occasion, dresscode } = req.body;

    // Validate required fields
    if (!date || !city || !occasion) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: date, city, and occasion are required'
      });
    }

    // Parse and validate date
    const eventDate = new Date(date);
    const today = new Date();
    
    if (isNaN(eventDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    const daysUntilEvent = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilEvent < 0) {
      return res.status(400).json({
        success: false,
        message: 'Event date cannot be in the past'
      });
    }

    // Get weather forecast for the event date
    let weather;
    try {
      if (daysUntilEvent === 0) {
        // Today - use current weather
        weather = await weatherService.getCurrentWeather(city);
      } else if (daysUntilEvent <= 7) {
        // Within 7 days - use forecast
        const forecast = await weatherService.getWeatherForecast(city);
        weather = {
          location: { city, region: '', country: '' },
          current: forecast[Math.min(daysUntilEvent, forecast.length - 1)]
        };
      } else {
        // Beyond 7 days - use historical averages or current as estimate
        weather = await weatherService.getCurrentWeather(city);
        weather.note = 'Weather forecast beyond 7 days uses current conditions as estimate';
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get weather data for event',
        error: error.message
      });
    }

    // Determine style based on occasion and optional dresscode
    let targetStyle = dresscode || occasion;
    
    // Map occasions to styles
    const occasionStyleMap = {
      wedding: 'formal',
      interview: 'formal',
      'job interview': 'formal',
      date: 'trendy',
      party: 'trendy',
      'cocktail party': 'formal',
      funeral: 'formal',
      graduation: 'formal',
      conference: 'formal',
      meeting: 'formal',
      casual: 'casual',
      brunch: 'casual',
      picnic: 'casual'
    };

    const preferredStyle = occasionStyleMap[occasion.toLowerCase()] || 'casual';

    // Generate outfit recommendations
    const outfits = await outfitGenerator.generateOutfits(userId, {
      occasion: occasion.toLowerCase(),
      weather,
      maxSuggestions: 5,
      includeWeather: true,
      userStyle: preferredStyle,
      dresscode: dresscode
    });

    if (outfits.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Could not generate outfits for this event',
        reason: 'Not enough suitable clothing items in your wardrobe',
        suggestion: `Add more ${preferredStyle} items suitable for ${occasion}`
      });
    }

    // Format response
    const response = {
      success: true,
      message: 'Event outfit recommendations generated successfully',
      data: {
        event: {
          date: eventDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          daysUntil: daysUntilEvent,
          occasion: occasion,
          dresscode: dresscode || preferredStyle,
          location: city
        },
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
          note: weather.note || null
        },
        recommendations: outfits.map((outfit, index) => ({
          rank: index + 1,
          items: outfit.items.map(item => ({
            id: item._id,
            category: item.category,
            subcategory: item.subcategory,
            color: item.color.primary,
            brand: item.brand,
            imageURL: item.imageURL,
            style: item.style
          })),
          score: {
            overall: outfit.score,
            colorHarmony: Math.round(colorMatching.calculateColorHarmony(outfit.colors) * 100),
            styleCoherence: Math.round(styleMatching.calculateStyleCoherence(outfit.styles) * 100),
            occasionFit: Math.round(styleMatching.getOccasionStyleScore(outfit.styles, occasion) * 100)
          },
          reasoning: [
            `Perfect for ${occasion}`,
            `${preferredStyle} style with ${Math.round(styleMatching.calculateStyleCoherence(outfit.styles) * 100)}% coherence`,
            `Color harmony: ${Math.round(colorMatching.calculateColorHarmony(outfit.colors) * 100)}%`,
            `Weather-appropriate for ${weather.current.temperature.category} conditions`
          ]
        })),
        tips: generateEventTips(occasion, weather, daysUntilEvent)
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Event Outfit Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate event outfit',
      error: error.message
    });
  }
};

/**
 * Generate helpful tips for the event
 */
function generateEventTips(occasion, weather, daysUntil) {
  const tips = [];
  
  // Occasion-specific tips
  const occasionTips = {
    wedding: [
      'Avoid wearing white unless explicitly stated',
      'Consider the venue formality',
      'Bring a jacket or shawl for indoor venues'
    ],
    interview: [
      'Choose conservative colors like navy or gray',
      'Ensure clothes are freshly pressed',
      'Avoid excessive accessories'
    ],
    date: [
      'Wear something that makes you feel confident',
      'Consider the planned activities',
      'Don\'t forget comfortable shoes if walking is involved'
    ],
    party: [
      'Feel free to be bold with colors and patterns',
      'Consider the party theme if there is one',
      'Comfortable shoes are key for standing/dancing'
    ]
  };

  if (occasionTips[occasion.toLowerCase()]) {
    tips.push(...occasionTips[occasion.toLowerCase()]);
  }

  // Weather-specific tips
  if (weather.current.temperature.value < 50) {
    tips.push('Layer up - it will be cold');
  } else if (weather.current.temperature.value > 80) {
    tips.push('Choose light, breathable fabrics');
  }

  if (weather.current.condition.description.toLowerCase().includes('rain')) {
    tips.push('Don\'t forget an umbrella');
  }

  // Time-based tips
  if (daysUntil > 3) {
    tips.push(`${daysUntil} days to prepare - consider trying on outfits in advance`);
  } else if (daysUntil === 1) {
    tips.push('Event is tomorrow - prep your outfit tonight');
  } else if (daysUntil === 0) {
    tips.push('Event is today - have a great time!');
  }

  return tips;
}

module.exports = exports;
