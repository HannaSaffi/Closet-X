// services/outfit-service/src/services/aiAdviceService.js
/**
 * AI Advice Service Client
 * 
 * This connects to the backup AI service (Gemini/OpenAI) when Ollama is unavailable.
 * Works alongside your existing aiService.js
 */

const axios = require('axios');

const AI_ADVICE_SERVICE_URL = process.env.AI_ADVICE_SERVICE_URL || 'http://ai-advice-service:3004';
const TIMEOUT = 30000; // 30 seconds

class AIAdviceServiceClient {
  constructor() {
    this.baseURL = AI_ADVICE_SERVICE_URL;
    this.timeout = TIMEOUT;
    this.available = null;
    this.lastCheck = null;
  }

  /**
   * Check if AI Advice Service is available
   */
  async isAvailable() {
    // Cache availability check for 1 minute
    if (this.lastCheck && Date.now() - this.lastCheck < 60000) {
      return this.available;
    }

    try {
      const response = await axios.get(`${this.baseURL}/ready`, {
        timeout: 5000
      });
      
      this.available = response.status === 200 && response.data.ready;
      this.lastCheck = Date.now();
      
      return this.available;
    } catch (error) {
      console.error('AI Advice Service not available:', error.message);
      this.available = false;
      this.lastCheck = Date.now();
      return false;
    }
  }

  /**
   * Get fashion advice for outfit generation
   * Useful for the generateOutfits endpoint
   */
  async getFashionAdvice(context) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/advice/fashion`,
        {
          occasion: context.occasion || 'casual',
          weather: context.weather || 'mild',
          preferences: context.preferences || 'versatile',
          colors: context.colors || [],
          style: context.style || 'modern casual'
        },
        { timeout: this.timeout }
      );
      
      return {
        success: true,
        advice: response.data.advice,
        provider: response.data.provider
      };
    } catch (error) {
      console.error('Fashion advice error:', error.message);
      return {
        success: false,
        error: error.message,
        fallback: `For ${context.occasion || 'this occasion'}, consider classic combinations that match the weather.`
      };
    }
  }

  /**
   * Analyze an outfit combination
   * Can be used in the validateOutfit endpoint
   */
  async analyzeOutfit(outfit) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/advice/outfit`,
        {
          top: outfit.top,
          bottom: outfit.bottom,
          shoes: outfit.shoes,
          outerwear: outfit.outerwear
        },
        { timeout: this.timeout }
      );
      
      return {
        success: true,
        analysis: response.data.analysis,
        provider: response.data.provider
      };
    } catch (error) {
      console.error('Outfit analysis error:', error.message);
      return {
        success: false,
        error: error.message,
        fallback: {
          score: 7,
          summary: 'This outfit combines classic pieces.',
          suggestions: ['Consider the occasion', 'Ensure colors complement']
        }
      };
    }
  }

  /**
   * Analyze color harmony
   * Can enhance the testColorCompatibility endpoint
   */
  async analyzeColors(colors) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/advice/colors`,
        { colors },
        { timeout: this.timeout }
      );
      
      return {
        success: true,
        analysis: response.data.analysis,
        provider: response.data.provider
      };
    } catch (error) {
      console.error('Color analysis error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get style advice
   * Can enhance generateOutfits with personalized recommendations
   */
  async getStyleAdvice(profile) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/advice/style`,
        {
          bodyType: profile.bodyType,
          preferredStyle: profile.preferredStyle,
          occasion: profile.occasion,
          season: profile.season
        },
        { timeout: this.timeout }
      );
      
      return {
        success: true,
        advice: response.data.advice,
        provider: response.data.provider
      };
    } catch (error) {
      console.error('Style advice error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Custom prompt for flexible AI queries
   */
  async customPrompt(prompt, options = {}) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/advice/custom`,
        {
          prompt,
          temperature: options.temperature || 0.7,
          maxTokens: options.maxTokens || 1024
        },
        { timeout: this.timeout }
      );
      
      return {
        success: true,
        response: response.data.response,
        provider: response.data.provider
      };
    } catch (error) {
      console.error('Custom prompt error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
module.exports = new AIAdviceServiceClient();