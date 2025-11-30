// shared/services/ollamaService.js
/**
 * Ollama AI Service
 * 
 * Service for interacting with Ollama for fashion advice
 */

const axios = require('axios');

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

class OllamaService {
  constructor() {
    this.host = OLLAMA_HOST;
    this.model = 'llama2'; // Default model
  }

  /**
   * Generate fashion advice based on query and context
   */
  async getFashionAdvice(query, context = {}) {
    try {
      const prompt = this.buildFashionPrompt(query, context);
      
      const response = await axios.post(`${this.host}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false
      }, {
        timeout: 30000 // 30 second timeout
      });

      return response.data.response || 'Unable to generate fashion advice at this time.';
    } catch (error) {
      console.error('Error calling Ollama:', error.message);
      
      // Fallback to basic advice if Ollama is unavailable
      return this.getBasicFashionAdvice(query, context);
    }
  }

  /**
   * Build a prompt for fashion advice
   */
  buildFashionPrompt(query, context) {
    const { wardrobe = [], preferences = {}, occasion = 'casual' } = context;
    
    let prompt = `You are a professional fashion consultant. `;
    
    // Add context about user's wardrobe
    if (wardrobe.length > 0) {
      prompt += `The user's wardrobe includes: `;
      const items = wardrobe.map(item => 
        `${item.category} (${item.color?.primary || 'unknown color'})`
      ).slice(0, 10).join(', ');
      prompt += items + '. ';
    }
    
    // Add user preferences
    if (preferences.style) {
      prompt += `Their preferred style is ${preferences.style}. `;
    }
    
    // Add occasion context
    prompt += `They are looking for ${occasion} outfit advice. `;
    
    // Add the actual query
    prompt += `\n\nUser question: ${query}\n\n`;
    prompt += `Provide concise, practical fashion advice (2-3 sentences).`;
    
    return prompt;
  }

  /**
   * Fallback advice when Ollama is unavailable
   */
  getBasicFashionAdvice(query, context) {
    const { occasion = 'casual' } = context;
    
    const basicAdvice = {
      casual: "For a casual look, try pairing jeans with a comfortable top and sneakers. Add a jacket for layering.",
      formal: "For formal occasions, opt for a well-fitted suit or elegant dress. Keep accessories minimal and classy.",
      work: "For work, choose business casual attire - slacks or a skirt with a button-down shirt or blouse.",
      athletic: "For athletic activities, wear breathable, moisture-wicking fabrics and supportive shoes.",
      party: "For parties, don't be afraid to add some bold colors or statement pieces to stand out.",
      beach: "For the beach, wear light, breathable fabrics and don't forget sun protection!",
      outdoor: "For outdoor activities, dress in layers and wear appropriate footwear for the terrain."
    };
    
    return basicAdvice[occasion] || "Mix and match items from your wardrobe to create a look that makes you feel confident!";
  }

  /**
   * Check if Ollama is available
   */
  async isAvailable() {
    try {
      const response = await axios.get(`${this.host}/api/tags`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
module.exports = new OllamaService();