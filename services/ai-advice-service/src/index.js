/**
 * AI Advice Service - Cloud API Fallback
 * 
 * This service provides fashion advice and outfit analysis using cloud AI APIs
 * as a backup when Ollama is unavailable. It supports:
 * - Google Gemini API (Free tier available)
 * - OpenAI API (GPT-3.5/GPT-4)
 * - Automatic failover between providers
 * 
 * Features:
 * - Fashion advice generation
 * - Outfit analysis and scoring
 * - Color harmony suggestions
 * - Style recommendations
 * - Weather-appropriate suggestions
 */

const express = require('express');
const axios = require('axios');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3004;

// Environment variables
const NODE_ENV = process.env.NODE_ENV || 'development';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const PREFERRED_PROVIDER = process.env.AI_PROVIDER || 'gemini'; // 'gemini' or 'openai'

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Lower limit for API calls
  message: 'Too many AI requests, please try again later.'
});
app.use('/api/', limiter);

// ============================================================================
// HEALTH CHECK ENDPOINTS
// ============================================================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'ai-advice-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/ready', async (req, res) => {
  const checks = {
    service: 'ai-advice-service',
    timestamp: new Date().toISOString(),
    ready: true,
    checks: {}
  };

  try {
    // Check if at least one AI provider is configured
    const geminiConfigured = !!GEMINI_API_KEY;
    const openaiConfigured = !!OPENAI_API_KEY;

    checks.checks.aiProviders = {
      gemini: geminiConfigured ? 'configured' : 'not configured',
      openai: openaiConfigured ? 'configured' : 'not configured',
      ready: geminiConfigured || openaiConfigured
    };

    if (!geminiConfigured && !openaiConfigured) {
      checks.ready = false;
      checks.message = 'No AI providers configured';
    }

    const statusCode = checks.ready ? 200 : 503;
    res.status(statusCode).json(checks);

  } catch (error) {
    res.status(503).json({
      service: 'ai-advice-service',
      ready: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    service: 'ai-advice-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB'
    },
    providers: {
      gemini: !!GEMINI_API_KEY,
      openai: !!OPENAI_API_KEY,
      preferred: PREFERRED_PROVIDER
    }
  });
});

// ============================================================================
// AI PROVIDER IMPLEMENTATIONS
// ============================================================================

/**
 * Google Gemini API Implementation
 */
class GeminiProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.model = 'gemini-1.5-flash'; // Fast and free tier available
  }

  async generateResponse(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: options.temperature || 0.7,
            topK: options.topK || 40,
            topP: options.topP || 0.95,
            maxOutputTokens: options.maxTokens || 1024,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const text = response.data.candidates[0].content.parts[0].text;
      return {
        success: true,
        provider: 'gemini',
        response: text,
        model: this.model
      };

    } catch (error) {
      console.error('Gemini API error:', error.response?.data || error.message);
      throw new Error(`Gemini API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

/**
 * OpenAI API Implementation
 */
class OpenAIProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1';
    this.model = 'gpt-3.5-turbo'; // Cost-effective option
  }

  async generateResponse(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a professional fashion advisor with expertise in styling, color theory, and outfit coordination.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1024,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 30000
        }
      );

      const text = response.data.choices[0].message.content;
      return {
        success: true,
        provider: 'openai',
        response: text,
        model: this.model
      };

    } catch (error) {
      console.error('OpenAI API error:', error.response?.data || error.message);
      throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

// ============================================================================
// AI SERVICE MANAGER (Automatic Failover)
// ============================================================================

class AIServiceManager {
  constructor() {
    this.providers = [];
    
    // Initialize Gemini if configured
    if (GEMINI_API_KEY) {
      this.providers.push({
        name: 'gemini',
        instance: new GeminiProvider(GEMINI_API_KEY),
        priority: PREFERRED_PROVIDER === 'gemini' ? 1 : 2
      });
    }

    // Initialize OpenAI if configured
    if (OPENAI_API_KEY) {
      this.providers.push({
        name: 'openai',
        instance: new OpenAIProvider(OPENAI_API_KEY),
        priority: PREFERRED_PROVIDER === 'openai' ? 1 : 2
      });
    }

    // Sort by priority
    this.providers.sort((a, b) => a.priority - b.priority);

    if (this.providers.length === 0) {
      console.warn('⚠️  No AI providers configured! Service will not be able to generate responses.');
    } else {
      console.log(`✅ AI Service initialized with providers: ${this.providers.map(p => p.name).join(', ')}`);
    }
  }

  async generate(prompt, options = {}) {
    if (this.providers.length === 0) {
      throw new Error('No AI providers configured');
    }

    let lastError = null;

    // Try each provider in order of priority
    for (const provider of this.providers) {
      try {
        console.log(`Attempting to use ${provider.name}...`);
        const result = await provider.instance.generateResponse(prompt, options);
        console.log(`✅ Successfully used ${provider.name}`);
        return result;
      } catch (error) {
        console.error(`❌ ${provider.name} failed:`, error.message);
        lastError = error;
        // Continue to next provider
      }
    }

    // All providers failed
    throw new Error(`All AI providers failed. Last error: ${lastError.message}`);
  }

  getAvailableProviders() {
    return this.providers.map(p => ({
      name: p.name,
      priority: p.priority,
      model: p.instance.model
    }));
  }
}

// Initialize AI Service Manager
const aiManager = new AIServiceManager();

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

const promptTemplates = {
  fashionAdvice: (context) => `
You are a professional fashion stylist. Provide fashion advice based on the following context:

Occasion: ${context.occasion || 'casual'}
Weather: ${context.weather || 'mild'}
User Preferences: ${context.preferences || 'versatile, comfortable'}
Available Colors: ${context.colors?.join(', ') || 'various colors'}
Style: ${context.style || 'modern casual'}

Please provide:
1. Outfit suggestions (2-3 options)
2. Color combinations that work well
3. Accessories to consider
4. Styling tips

Keep the response concise and practical (max 300 words).
`,

  outfitAnalysis: (outfit) => `
Analyze this outfit combination:

Top: ${outfit.top?.color} ${outfit.top?.type}
Bottom: ${outfit.bottom?.color} ${outfit.bottom?.type}
Shoes: ${outfit.shoes?.color} ${outfit.shoes?.type}
${outfit.outerwear ? `Outerwear: ${outfit.outerwear.color} ${outfit.outerwear.type}` : ''}

Provide:
1. Fashion score (1-10)
2. Color harmony analysis
3. Style compatibility
4. Suggestions for improvement
5. Occasion suitability

Be specific and constructive. Keep response under 250 words.
`,

  colorMatching: (colors) => `
Analyze these colors for an outfit: ${colors.join(', ')}

Provide:
1. Color harmony score (1-10)
2. Which colors work well together
3. Which colors clash
4. Suggestions for better combinations
5. Emotional impression of the palette

Keep response concise (max 200 words).
`,

  styleAdvice: (profile) => `
User Style Profile:
- Body Type: ${profile.bodyType || 'average'}
- Preferred Style: ${profile.preferredStyle || 'casual'}
- Occasion: ${profile.occasion || 'everyday'}
- Season: ${profile.season || 'current'}

Provide personalized style advice:
1. Best clothing types for this body type
2. Flattering cuts and fits
3. Colors that complement
4. Items to avoid
5. Accessories that enhance the look

Keep practical and specific (max 300 words).
`
};

// ============================================================================
// API ROUTES
// ============================================================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Closet-X AI Advice Service',
    version: '1.0.0',
    status: 'running',
    providers: aiManager.getAvailableProviders(),
    endpoints: {
      health: '/health',
      ready: '/ready',
      live: '/live',
      fashionAdvice: 'POST /api/advice/fashion',
      outfitAnalysis: 'POST /api/advice/outfit',
      colorMatching: 'POST /api/advice/colors',
      styleAdvice: 'POST /api/advice/style',
      custom: 'POST /api/advice/custom'
    }
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'AI Advice service is working!',
    timestamp: new Date().toISOString(),
    providers: aiManager.getAvailableProviders()
  });
});

// Fashion Advice Endpoint
app.post('/api/advice/fashion', async (req, res) => {
  try {
    const { occasion, weather, preferences, colors, style } = req.body;

    const prompt = promptTemplates.fashionAdvice({
      occasion,
      weather,
      preferences,
      colors,
      style
    });

    const result = await aiManager.generate(prompt);

    res.json({
      success: true,
      advice: result.response,
      provider: result.provider,
      model: result.model,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Fashion advice error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Outfit Analysis Endpoint
app.post('/api/advice/outfit', async (req, res) => {
  try {
    const { top, bottom, shoes, outerwear } = req.body;

    if (!top || !bottom) {
      return res.status(400).json({
        success: false,
        error: 'Top and bottom are required'
      });
    }

    const prompt = promptTemplates.outfitAnalysis({
      top,
      bottom,
      shoes,
      outerwear
    });

    const result = await aiManager.generate(prompt);

    res.json({
      success: true,
      analysis: result.response,
      provider: result.provider,
      model: result.model,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Outfit analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Color Matching Endpoint
app.post('/api/advice/colors', async (req, res) => {
  try {
    const { colors } = req.body;

    if (!colors || !Array.isArray(colors) || colors.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 colors are required'
      });
    }

    const prompt = promptTemplates.colorMatching(colors);

    const result = await aiManager.generate(prompt);

    res.json({
      success: true,
      analysis: result.response,
      provider: result.provider,
      model: result.model,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Color matching error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Style Advice Endpoint
app.post('/api/advice/style', async (req, res) => {
  try {
    const { bodyType, preferredStyle, occasion, season } = req.body;

    const prompt = promptTemplates.styleAdvice({
      bodyType,
      preferredStyle,
      occasion,
      season
    });

    const result = await aiManager.generate(prompt);

    res.json({
      success: true,
      advice: result.response,
      provider: result.provider,
      model: result.model,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Style advice error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Custom Prompt Endpoint
app.post('/api/advice/custom', async (req, res) => {
  try {
    const { prompt, temperature, maxTokens } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    const result = await aiManager.generate(prompt, {
      temperature,
      maxTokens
    });

    res.json({
      success: true,
      response: result.response,
      provider: result.provider,
      model: result.model,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Custom prompt error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get available providers
app.get('/api/providers', (req, res) => {
  res.json({
    success: true,
    providers: aiManager.getAvailableProviders(),
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Starting AI Advice Service...');
  console.log(`📝 Environment: ${NODE_ENV}`);
  console.log(`🔌 Port: ${PORT}`);
  console.log(`✅ AI Advice Service listening on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`✔️  Ready check: http://localhost:${PORT}/ready`);
  console.log(`💚 Live check: http://localhost:${PORT}/live`);
  console.log(`🤖 Available providers:`, aiManager.getAvailableProviders().map(p => p.name).join(', '));
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️  Received ${signal}, starting graceful shutdown...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    console.log('👋 Shutdown complete');
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;