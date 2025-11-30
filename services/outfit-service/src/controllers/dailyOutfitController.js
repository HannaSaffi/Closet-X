// services/outfit-service/src/controllers/dailyOutfitController.js
// services/outfit-service/src/controllers/dailyOutfitController.js

const weatherService = require('../services/weatherService');
const aiAdviceService = require('../services/aiAdviceService');
const outfitGenerator = require('../services/outfitGenerator');
const { colorMatching } = require('../algorithms/colorMatching');
const { styleMatching } = require('../algorithms/styleMatching');
const axios = require('axios');

// In-memory conversation storage (per user)
const conversationHistory = new Map();

// Store last 10 messages per user
function addToConversationHistory(userId, role, content) {
  if (!conversationHistory.has(userId)) {
    conversationHistory.set(userId, []);
  }
  
  const history = conversationHistory.get(userId);
  history.push({ role, content, timestamp: Date.now() });
  
  // Keep only last 10 messages (5 exchanges)
  if (history.length > 10) {
    history.shift();
  }
  
  // Clear old conversations (older than 1 hour)
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  conversationHistory.set(userId, history.filter(msg => msg.timestamp > oneHourAgo));
}

function getConversationHistory(userId) {
  return conversationHistory.get(userId) || [];
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent';

/**
 * Use Google Gemini to classify query and generate response
 */
async function handleConversationalQuery(text, city = 'New York', userId = null) {
  try {
    // First, check if this is a weather question
    const lowerText = text.toLowerCase();
    const isWeatherQuestion = [
      'weather', 'raining', 'snowing', 'cold', 'hot', 
      'sunny', 'cloudy', 'temperature', 'forecast'
    ].some(keyword => lowerText.includes(keyword));

    // If it's a weather question, fetch actual weather data
    let weatherContext = '';
    if (isWeatherQuestion) {
      try {
        const weatherData = await weatherService.getCurrentWeather(city);
        const weather = {
          temp: weatherData.current.temperature.value,
          description: weatherData.current.condition.description,
          feelsLike: weatherData.current.temperature.feelsLike,
          humidity: weatherData.current.humidity
        };
        weatherContext = `\n\n**IMPORTANT - CURRENT WEATHER DATA**: I have access to live weather for ${city.toUpperCase()}: Temperature is ${weather.temp}°F, ${weather.description}, feels like ${weather.feelsLike}°F, humidity ${weather.humidity}%. When user asks about weather, tell them THIS data.`;
      } catch (error) {
        console.error('Weather fetch failed for conversation:', error.message);
        weatherContext = '\n\nNote: Unable to fetch current weather data.';
      }
    }

    if (!GEMINI_API_KEY) {
      console.warn('⚠️  No Gemini API key - using fallback');
      return null;
    }

    // Get conversation history for this user
    const history = userId ? getConversationHistory(userId) : [];
    
    // Build messages array with conversation history
    const messages = [];
    
    // If first message in conversation, add system context
if (history.length === 0) {
  messages.push({
    parts: [{
      text: `You are Claude, a friendly AI fashion stylist assistant. You help users choose outfits.

When users ask for outfit suggestions, respond with exactly: "OUTFIT_REQUEST"

For conversational queries:
- Greetings: Be warm and friendly
- Jokes: CRITICAL - Tell COMPLETELY DIFFERENT jokes each time. NEVER repeat a joke you've already told in this conversation. Keep track of all jokes told and choose new ones. There are thousands of jokes - use variety!
- Weather: CRITICAL - If weather data is provided in the context, USE IT to answer weather questions. Tell the user the actual temperature, conditions, and suggest weather-appropriate outfits.
- Colors: Give actual color advice
- General chat: Engage naturally

Respond in 2-4 sentences.${weatherContext}`
    }],
    role: 'user'
  });
      messages.push({
        parts: [{
          text: 'Understood! I will help with fashion and respond naturally to conversation.'
        }],
        role: 'model'
      });
    }
    
    // Add conversation history
    for (const msg of history) {
      messages.push({
        parts: [{ text: msg.content }],
        role: msg.role
      });
    }
    // For joke requests, remind it not to repeat
let userMessage = text;
if (lowerText.includes('joke')) {
  const jokesInHistory = history
    .filter(msg => msg.role === 'model' && (msg.content.includes('Why') || msg.content.includes('?')))
    .map(msg => msg.content.substring(0, 50));
  
  if (jokesInHistory.length > 0) {
    userMessage = `${text}\n\n[REMINDER: You've already told these jokes in this conversation: ${jokesInHistory.join(', ')}... Tell a COMPLETELY DIFFERENT joke this time!]`;
  }
}

// Add current user message
messages.push({
  parts: [{ text: userMessage }],
  role: 'user'
});

    console.log(`🤖 Calling Gemini with ${history.length} history messages for: "${text}"`);

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await axios.post(
      url,
      {
        contents: messages,
        generationConfig: {
          temperature: 1.0,
          maxOutputTokens: 250,
          topP: 0.95,
          topK: 64
        }
      },
      {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!generatedText) {
      console.error('❌ No text in Gemini response:', JSON.stringify(response.data));
      throw new Error('No response from Gemini');
    }

    console.log(`✅ Gemini response: "${generatedText.substring(0, 100)}..."`);

    if (generatedText.includes('OUTFIT_REQUEST')) {
      return null;
    }

    // Store this exchange in history
    if (userId) {
      addToConversationHistory(userId, 'user', text);
      addToConversationHistory(userId, 'model', generatedText);
    }

    return generatedText;

  } catch (error) {
    console.error('❌ Gemini failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data));
    }
    
    const lowerText = text.toLowerCase();
    const outfitKeywords = ['wear', 'outfit', 'dress', 'suggest', 'show me', 'help me pick', 'recommend', 'look'];
    const hasOutfitKeyword = outfitKeywords.some(k => lowerText.includes(k));
    
    if (hasOutfitKeyword) {
      return null;
    }
    
    return "👋 Hi! I'm your AI fashion stylist. Ask me things like 'What should I wear for a date?' or 'Help me pick a casual outfit' and I'll create the perfect look from your wardrobe!";
  }
}
/**
 * MAIN ENDPOINT: "What Should I Wear Today"
 * GET /api/daily-outfit
 */
exports.getDailyOutfit = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const { city, includeAI = true, preference = '' } = req.query;

    console.log(`🎯 Daily outfit request for user: ${userId} (${userEmail})`);
    if (preference) {
      console.log(`💬 User preference: "${preference}"`);
    }

    // ========================================================================
    // STEP 1: Determine target city (from URL param or default)
    // ========================================================================
    const targetCity = city || 'New York';

    // ========================================================================
    // STEP 2: Check if conversational using Gemini (with weather context)
    // ========================================================================
    const conversationalResponse = await handleConversationalQuery(preference, targetCity, userId);
    
    if (conversationalResponse) {
      console.log(`💬 Conversational query detected`);
      return res.status(200).json({
        success: true,
        conversational: true,
        message: conversationalResponse,
        data: {
          outfits: []
        }
      });
    }

    // ========================================================================
    // STEP 3: Parse user preferences for outfit generation
    // ========================================================================
    const parsedPreferences = parseUserPreference(preference);

    console.log('📋 Parsed preferences:', parsedPreferences);

    // ========================================================================
    // STEP 4: Get Current Weather (if requested)
    // ========================================================================
    let weather = null;
    let weatherRecs = null;
    
    if (city) {
      console.log(`🌤️  Fetching weather for ${targetCity}...`);
      
      try {
        const weatherData = await weatherService.getCurrentWeather(targetCity);
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
        weather = null;
      }
    }

    // ========================================================================
    // STEP 5: Generate Outfits from User's Wardrobe
    // ========================================================================
    console.log(`👔 Generating outfits for user ${userId}...`);
    
    let outfits;
    try {
      const token = req.headers.authorization.split(' ')[1];
      
      outfits = await outfitGenerator.generateOutfits(userId, {
        occasion: parsedPreferences.occasion,
        weather,
        maxSuggestions: 5,
        includeWeather: !!city,
        userStyle: parsedPreferences.style,
        formality: parsedPreferences.formality,
        comfort: parsedPreferences.comfort,
        userPreference: preference,
        token
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
    // STEP 6: Get AI Fashion Advice (Optional)
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
      }
    }

    // ========================================================================
    // STEP 7: Return Complete Response
    // ========================================================================
    const response = {
      success: true,
      message: 'Daily outfit recommendations generated',
      data: {
        date: new Date().toISOString(),
        userPreference: preference,
        parsedPreferences,
        outfits: outfits.slice(0, 3),
        aiAdvice
      }
    };

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
 */
function parseUserPreference(preference) {
  const lower = preference.toLowerCase();
  
  const parsed = {
    occasion: 'casual',
    style: 'casual',
    formality: 'casual',
    comfort: 'medium'
  };

  if (lower.includes('comfy') || lower.includes('comfortable') || lower.includes('cozy') || lower.includes('relaxed')) {
    parsed.comfort = 'high';
    parsed.style = 'casual';
  }

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
 */
exports.getWeeklyOutfits = async (req, res) => {
  try {
    const userId = req.user.id;
    const { city } = req.query;
    const targetCity = city || 'New York';

    console.log(`📅 Weekly outfits request for ${targetCity}`);

    const forecast = await weatherService.getWeeklyForecast(targetCity);
    const weeklyOutfits = [];

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
 */
exports.saveFavoriteOutfit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { outfitId, name } = req.body;

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