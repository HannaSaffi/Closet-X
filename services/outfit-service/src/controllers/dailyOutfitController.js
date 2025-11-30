// services/outfit-service/src/controllers/dailyOutfitController.js

const weatherService = require('../services/weatherService');
const aiAdviceService = require('../services/aiAdviceService');
const outfitGenerator = require('../services/outfitGenerator');
const { colorMatching } = require('../algorithms/colorMatching');
const { styleMatching } = require('../algorithms/styleMatching');

/**
 * Detect if user input is conversational vs outfit request
 */
function isConversationalQuery(text) {
  if (!text || text.trim().length === 0) {
    return { isConversational: false };
  }
  
  const lowerText = text.toLowerCase().trim();
  
  // Greetings
  const greetings = ['hello', 'hi', 'hey', 'how are you', 'whats up', "what's up", 'good morning', 'good afternoon', 'good evening'];
  if (greetings.some(g => lowerText === g || lowerText.startsWith(g))) {
    return { isConversational: true, type: 'greeting' };
  }
  
  // Color/style questions without outfit context
  const colorQuestions = ['what color', 'which color', 'color goes with', 'color match', 'best color'];
  const hasColorQuestion = colorQuestions.some(q => lowerText.includes(q));
  const hasOutfitContext = lowerText.includes('outfit') || lowerText.includes('wear') || lowerText.includes('dress');
  
  if (hasColorQuestion && !hasOutfitContext) {
    return { isConversational: true, type: 'color-advice' };
  }
  
  // General questions without style context
  const questionStarters = ['how do', 'what is', 'tell me', 'explain', 'why', 'when', 'where'];
  if (questionStarters.some(q => lowerText.startsWith(q)) && !hasOutfitContext) {
    return { isConversational: true, type: 'general' };
  }
  
  // Very short responses
  if (lowerText.length < 10 && !hasOutfitContext) {
    return { isConversational: true, type: 'general' };
  }
  
  return { isConversational: false };
}

/**
 * Generate conversational response
 */
/**
 * Generate conversational response using Ollama
 */
/**
 * Generate conversational response using Ollama
 */
/**
 * Generate conversational response using Ollama for ALL queries
 */
async function generateConversationalResponse(queryType, originalText) {
  try {
    const ollamaUrl = 'http://ollama.ollama.svc.cluster.local:11434/api/chat';
    const axios = require('axios');
    
    const systemPrompt = `You are a friendly, enthusiastic AI fashion stylist named Claude. You help users choose outfits from their digital wardrobe.

Your personality: Warm, knowledgeable, and encouraging. Keep responses concise (2-3 sentences max).

Your capabilities:
- Help users pick outfits for any occasion
- Consider weather when making suggestions
- Provide color combination advice
- Answer fashion-related questions

Important: If users ask general questions (weather, greetings, small talk), respond naturally but gently guide them back to asking for outfit help. Give them specific examples like "What should I wear for a date?" or "Something comfy for working from home".`;

    console.log(`🤖 Calling Ollama for ${queryType} query: "${originalText}"`);
    
    const response = await axios.post(ollamaUrl, {
      model: 'gpt-oss:20b',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: originalText
        }
      ],
      stream: false,
      options: {
        temperature: 0.8,
        num_predict: 100,
        top_p: 0.9
      }
    }, {
      timeout: 15000
    });
    
    // Debug: log full response structure
    console.log('📦 Ollama response structure:', JSON.stringify(response.data, null, 2));
    
    // Try multiple paths to get the content
    let content = null;
    
    if (response.data) {
      // Path 1: response.data.message.content
      if (response.data.message && response.data.message.content) {
        content = response.data.message.content;
      }
      // Path 2: response.data.content
      else if (response.data.content) {
        content = response.data.content;
      }
      // Path 3: response.data.response
      else if (response.data.response) {
        content = response.data.response;
      }
    }
    
    if (content && content.trim()) {
      console.log(`✅ Ollama responded: "${content.substring(0, 50)}..."`);
      return content.trim();
    }
    
    console.error('❌ No content found in response. Full response:', JSON.stringify(response.data));
    throw new Error('No content in Ollama response');
    
  } catch (error) {
    console.error('❌ Ollama failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data));
    }
    
    return "👋 Hi! I'm your AI fashion stylist. Ask me things like 'What should I wear for a date?' or 'Help me pick a casual outfit' and I'll create the perfect look from your wardrobe!";
  }
}
/**
 * MAIN ENDPOINT: "What Should I Wear Today"
 * GET /api/daily-outfit
 * 
 * This connects:
 * 1. User authentication (token from user-service)
 * 2. Weather API (gets current weather)
 * 3. AI Service (gets fashion advice)
 * 4. User's clothing database (generates outfits)
 * 5. User preferences (text input for style/occasion)
 * 6. Returns complete recommendations
 */
exports.getDailyOutfit = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware (user-service token)
    const userEmail = req.user.email;
    const { city, includeAI = true, preference = '' } = req.query;

    console.log(`🎯 Daily outfit request for user: ${userId} (${userEmail})`);
    if (preference) {
      console.log(`💬 User preference: "${preference}"`);
    }

    // ========================================================================
    // STEP 1: Parse user preferences from text input
    // ========================================================================
    const parsedPreferences = parseUserPreference(preference);
    const targetCity = city || 'New York';

    console.log('📋 Parsed preferences:', parsedPreferences);

    // ========================================================================
    // STEP 1.5: Check if this is a conversational query vs outfit request
    // ========================================================================
    const conversationCheck = isConversationalQuery(preference);
      if (conversationCheck.isConversational) {
    console.log(`💬 Detected conversational query: ${conversationCheck.type}`);
    const conversationalMessage = await generateConversationalResponse(conversationCheck.type, preference);
    return res.status(200).json({
      success: true,
      conversational: true,
      message: conversationalMessage,
      data: {
        outfits: []
      }
    });
  }

    // ========================================================================
    // STEP 2: Get Current Weather (if requested)
    // ========================================================================
    let weather = null;
    let weatherRecs = null;
    
    if (city) {
      console.log(`🌤️  Fetching weather for ${targetCity}...`);
      
      try {
        const weatherData = await weatherService.getCurrentWeather(targetCity);
        // Extract the data from the weatherService response structure
        weather = {
          temp: weatherData.current.temperature.value,
          feelsLike: weatherData.current.temperature.feelsLike,
          main: weatherData.current.condition.main,
          description: weatherData.current.condition.description,
          humidity: weatherData.current.humidity,
          windSpeed: weatherData.current.windSpeed,
          tempCategory: weatherData.current.temperature.category
        };
        console.log(`✅ Weather: ${weather.temp}°F, ${weather.description}`);
        weatherRecs = weatherService.getClothingRecommendations(weatherData);
      } catch (error) {
        console.error('Weather fetch failed (non-critical):', error.message);
        // Continue without weather - it's optional
        weather = null;
      }
    }

    // ========================================================================
    // STEP 3: Generate Outfits from User's Wardrobe
    // ========================================================================
    console.log(`👔 Generating outfits for user ${userId}...`);
    
    let outfits;
    try {
      // Pass the auth token to outfitGenerator so it can fetch wardrobe
      const token = req.headers.authorization.split(' ')[1];
      
      outfits = await outfitGenerator.generateOutfits(userId, {
        occasion: parsedPreferences.occasion,
        weather,
        maxSuggestions: 5,
        includeWeather: !!city,
        userStyle: parsedPreferences.style,
        formality: parsedPreferences.formality,
        comfort: parsedPreferences.comfort,
        userPreference: preference, // Pass raw preference for AI
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
        const adviceResult = await aiAdviceService.getFashionAdvice({
          occasion: parsedPreferences.occasion,
          weather: weather ? `${weather.temp}°F, ${weather.description}` : "comfortable",
          preferences: preference || parsedPreferences.style,
          colors: outfits.length > 0 ? outfits[0].colors : [],
          style: parsedPreferences.style
        });
        if (adviceResult.success) {
          aiAdvice = adviceResult.advice;
        }
        console.log('✅ AI advice generated');
      } catch (error) {
        console.error('AI advice failed (non-critical):', error.message);
        // Don't fail the request if AI fails
      }
    }

    // ========================================================================
    // STEP 5: Return Complete Response
    // ========================================================================
    const response = {
      success: true,
      message: 'Daily outfit recommendations generated',
      data: {
        date: new Date().toISOString(),
        userPreference: preference,
        parsedPreferences,
        outfits: outfits.slice(0, 3), // Top 3 outfits
        aiAdvice
      }
    };

    // Add weather info if it was requested
    if (weather) {
      response.data.location = targetCity;
      response.data.weather = {
        temp: weather.temp,
        feelsLike: weather.feelsLike,
        condition: weather.main,
        description: weather.description,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed
      };
      response.data.weatherRecommendations = weatherRecs;
    }

    return res.json(response);

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
 * Parse user preference text into structured data
 * Examples:
 * - "I want something comfy" -> { style: 'casual', comfort: 'high' }
 * - "professional meeting" -> { occasion: 'work', formality: 'formal' }
 * - "casual date" -> { occasion: 'date', formality: 'casual' }
 */
function parseUserPreference(preference) {
  const lower = preference.toLowerCase();
  
  const parsed = {
    occasion: 'casual',
    style: 'casual',
    formality: 'casual',
    comfort: 'medium'
  };

  // Parse comfort level
  if (lower.includes('comfy') || lower.includes('comfortable') || lower.includes('cozy') || lower.includes('relaxed')) {
    parsed.comfort = 'high';
    parsed.style = 'casual';
  }

  // Parse formality
  if (lower.includes('professional') || lower.includes('business') || lower.includes('formal') || lower.includes('work') || lower.includes('office') || lower.includes('meeting')) {
    parsed.formality = 'formal';
    parsed.occasion = 'work';
    parsed.style = 'professional';
  } else if (lower.includes('casual') || lower.includes('everyday') || lower.includes('home')) {
    parsed.formality = 'casual';
    parsed.style = 'casual';
  } else if (lower.includes('smart casual') || lower.includes('semi-formal')) {
    parsed.formality = 'semi-formal';
    parsed.style = 'smart casual';
  }

  // Parse occasion
  if (lower.includes('date') || lower.includes('dinner') || lower.includes('restaurant')) {
    parsed.occasion = 'date';
  } else if (lower.includes('party') || lower.includes('celebration') || lower.includes('event')) {
    parsed.occasion = 'party';
  } else if (lower.includes('gym') || lower.includes('workout') || lower.includes('exercise')) {
    parsed.occasion = 'athletic';
    parsed.style = 'athletic';
  } else if (lower.includes('coffee') || lower.includes('friends') || lower.includes('hangout')) {
    parsed.occasion = 'casual';
  }

  return parsed;
}

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