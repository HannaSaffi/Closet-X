// services/outfit-service/src/services/ollamaService.js
// Service to interact with Ollama GPU-powered AI

const axios = require('axios');
const ollamaConfig = require('../config/ollama');

class OllamaService {
  constructor() {
    this.baseUrl = ollamaConfig.baseUrl;
    this.models = ollamaConfig.models;
  }

  /**
   * Generate completion from Ollama
   */
  async generate(prompt, options = {}) {
    try {
      const {
        model = this.models.chat,
        stream = false,
        temperature = ollamaConfig.parameters.temperature
      } = options;

      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model,
          prompt,
          stream,
          options: {
            temperature,
            top_p: ollamaConfig.parameters.top_p,
            top_k: ollamaConfig.parameters.top_k,
            num_predict: ollamaConfig.parameters.num_predict
          }
        },
        {
          timeout: ollamaConfig.timeout
        }
      );

      return response.data.response;
    } catch (error) {
      console.error('Ollama generate error:', error.message);
      throw new Error(`Failed to generate from Ollama: ${error.message}`);
    }
  }

  /**
   * Analyze clothing image with vision model
   */
  async analyzeClothingImage(imageUrl) {
    try {
      const prompt = `Analyze this clothing item image and provide:
1. Type of clothing (shirt, pants, dress, etc.)
2. Primary colors
3. Style (casual, formal, sporty, etc.)
4. Pattern (solid, striped, floral, etc.)
5. Suitable occasions
6. Season appropriateness

Provide response in JSON format.`;

      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model: this.models.fashion,
          prompt,
          images: [imageUrl],
          format: 'json',
          stream: false
        },
        {
          timeout: ollamaConfig.timeout * 2 // Double timeout for vision
        }
      );

      return this.parseClothingAnalysis(response.data.response);
    } catch (error) {
      console.error('Ollama image analysis error:', error.message);
      throw error;
    }
  }

  /**
   * Get fashion advice using Ollama
   */
  async getFashionAdvice(userQuery, context = {}) {
    try {
      const { wardrobe = [], preferences = {}, occasion = 'casual', weather = {} } = context;

      const prompt = `You are a professional fashion stylist. 

User Question: ${userQuery}

Context:
- User has ${wardrobe.length} items in their wardrobe
- Style preference: ${preferences.style || 'not specified'}
- Favorite colors: ${preferences.favoriteColors?.join(', ') || 'not specified'}
- Occasion: ${occasion}
${weather.temperature ? `- Current weather: ${weather.temperature}°F, ${weather.condition}` : ''}

Provide helpful, personalized fashion advice. Be specific and actionable.`;

      const advice = await this.generate(prompt, {
        model: this.models.analysis,
        temperature: 0.8
      });

      return {
        query: userQuery,
        advice,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Fashion advice error:', error.message);
      throw error;
    }
  }

  /**
   * Generate outfit description
   */
  async describeOutfit(clothingItems) {
    try {
      const itemDescriptions = clothingItems.map(item => 
        `${item.color.primary} ${item.subcategory} (${item.category})`
      ).join(', ');

      const prompt = `Describe this outfit in a stylish, appealing way: ${itemDescriptions}
      
Include:
1. Overall style vibe
2. Why these pieces work together
3. Best occasions to wear this
4. Styling tips

Keep it concise and enthusiastic.`;

      const description = await this.generate(prompt, {
        model: this.models.chat,
        temperature: 0.8
      });

      return description;
    } catch (error) {
      console.error('Outfit description error:', error.message);
      throw error;
    }
  }

  /**
   * Get styling suggestions for an item
   */
  async getStylingTips(clothingItem) {
    try {
      const prompt = `Give 3 styling tips for a ${clothingItem.color.primary} ${clothingItem.subcategory}.
      
Consider:
- What to pair it with
- Accessories that complement it
- Occasions it's perfect for

Be specific and practical.`;

      const tips = await this.generate(prompt, {
        model: this.models.chat,
        temperature: 0.7
      });

      return tips;
    } catch (error) {
      console.error('Styling tips error:', error.message);
      throw error;
    }
  }

  /**
   * Compare outfit options
   */
  async compareOutfits(outfit1, outfit2, occasion) {
    try {
      const describe = (items) => items.map(i => 
        `${i.color.primary} ${i.subcategory}`
      ).join(', ');

      const prompt = `Compare these two outfits for ${occasion}:

Outfit 1: ${describe(outfit1.items)}
Outfit 2: ${describe(outfit2.items)}

Which is better and why? Consider:
- Style appropriateness
- Color harmony
- Occasion fit
- Overall impression

Provide a clear recommendation.`;

      const comparison = await this.generate(prompt, {
        model: this.models.analysis,
        temperature: 0.7
      });

      return comparison;
    } catch (error) {
      console.error('Outfit comparison error:', error.message);
      throw error;
    }
  }

  /**
   * Generate wardrobe insights
   */
  async analyzeWardrobe(clothingItems) {
    try {
      const categories = {};
      const colors = {};
      
      clothingItems.forEach(item => {
        categories[item.category] = (categories[item.category] || 0) + 1;
        colors[item.color.primary] = (colors[item.color.primary] || 0) + 1;
      });

      const prompt = `Analyze this wardrobe:

Total items: ${clothingItems.length}
Categories: ${JSON.stringify(categories)}
Colors: ${JSON.stringify(colors)}

Provide:
1. Overall wardrobe assessment
2. What's missing or over-represented
3. 3 specific recommendations for new items to purchase
4. Style strengths and weaknesses

Be honest but constructive.`;

      const insights = await this.generate(prompt, {
        model: this.models.analysis,
        temperature: 0.7
      });

      return insights;
    } catch (error) {
      console.error('Wardrobe analysis error:', error.message);
      throw error;
    }
  }

  /**
   * Check if Ollama service is available
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000
      });
      return {
        status: 'healthy',
        models: response.data.models?.map(m => m.name) || []
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Parse clothing analysis from Ollama response
   */
  parseClothingAnalysis(response) {
    try {
      // Try to parse as JSON
      const parsed = typeof response === 'string' ? JSON.parse(response) : response;
      
      return {
        category: parsed.type || parsed.category || 'unknown',
        colors: {
          primary: parsed.primaryColor || parsed.colors?.[0] || 'unknown',
          secondary: parsed.secondaryColors || parsed.colors?.slice(1) || []
        },
        style: Array.isArray(parsed.style) ? parsed.style : [parsed.style || 'casual'],
        pattern: parsed.pattern || 'solid',
        occasions: Array.isArray(parsed.occasions) 
          ? parsed.occasions 
          : [parsed.occasion || 'casual'],
        season: Array.isArray(parsed.season) 
          ? parsed.season 
          : [parsed.season || 'all-season'],
        confidence: 0.85,
        provider: 'ollama'
      };
    } catch (error) {
      console.error('Failed to parse Ollama response:', error);
      // Return default structure
      return {
        category: 'unknown',
        colors: { primary: 'unknown', secondary: [] },
        style: ['casual'],
        pattern: 'solid',
        occasions: ['casual'],
        season: ['all-season'],
        confidence: 0.5,
        provider: 'ollama'
      };
    }
  }
}

module.exports = new OllamaService();