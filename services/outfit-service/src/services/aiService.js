// services/outfit-service/src/services/aiService.js

const axios = require('axios');
const { aiConfig, getColorName, rgbToHex } = require('../config/aiVision');
const NodeCache = require('node-cache');

// Cache for AI results (24 hour TTL)
const aiCache = new NodeCache({ 
  stdTTL: aiConfig.processing.cacheDuration / 1000 
});

class AIVisionService {
  constructor() {
    this.provider = aiConfig.provider;
  }

  /**
   * Analyze clothing image using AI
   * @param {string} imageUrl - URL or base64 of image
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeClothingImage(imageUrl) {
    try {
      // Check cache first
      const cacheKey = `analysis:${imageUrl}`;
      const cached = aiCache.get(cacheKey);
      if (cached) {
        console.log('Returning cached AI analysis');
        return cached;
      }

      let result;
      
      switch (this.provider) {
        case 'google':
          result = await this.analyzeWithGoogle(imageUrl);
          break;
        case 'clarifai':
          result = await this.analyzeWithClarifai(imageUrl);
          break;
        case 'aws':
          result = await this.analyzeWithAWS(imageUrl);
          break;
        default:
          throw new Error(`Unknown AI provider: ${this.provider}`);
      }

      // Cache the result
      if (aiConfig.processing.cacheResults) {
        aiCache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('AI Vision Error:', error.message);
      throw error;
    }
  }

  /**
   * Analyze image using Google Vision API
   */
  async analyzeWithGoogle(imageUrl) {
    try {
      const response = await axios.post(
        `${aiConfig.google.endpoint}/images:annotate?key=${aiConfig.google.apiKey}`,
        {
          requests: [{
            image: { source: { imageUri: imageUrl } },
            features: aiConfig.google.features.map(type => ({
              type,
              maxResults: aiConfig.google.maxResults
            }))
          }]
        },
        { timeout: aiConfig.processing.timeout }
      );

      const annotations = response.data.responses[0];
      
      return {
        processed: true,
        provider: 'google',
        category: this.extractCategory(annotations.labelAnnotations || []),
        colors: this.extractColors(annotations.imagePropertiesAnnotation),
        pattern: this.detectPattern(annotations.labelAnnotations || []),
        style: this.extractStyle(annotations.labelAnnotations || []),
        confidence: this.calculateConfidence(annotations),
        rawData: annotations
      };
    } catch (error) {
      throw new Error(`Google Vision API Error: ${error.message}`);
    }
  }

  /**
   * Analyze image using Clarifai API (Fashion-specialized)
   */
  async analyzeWithClarifai(imageUrl) {
    try {
      const response = await axios.post(
        'https://api.clarifai.com/v2/models/apparel-detection/outputs',
        {
          inputs: [{
            data: { image: { url: imageUrl } }
          }]
        },
        {
          headers: {
            'Authorization': `Key ${aiConfig.clarifai.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: aiConfig.processing.timeout
        }
      );

      const concepts = response.data.outputs[0]?.data?.concepts || [];
      const regions = response.data.outputs[0]?.data?.regions || [];

      return {
        processed: true,
        provider: 'clarifai',
        category: this.extractCategoryFromConcepts(concepts),
        colors: this.extractColorsFromRegions(regions),
        pattern: this.detectPatternFromConcepts(concepts),
        style: this.extractStyleFromConcepts(concepts),
        confidence: concepts[0]?.value * 100 || 0,
        detectedItems: concepts.slice(0, 5).map(c => ({
          name: c.name,
          confidence: c.value * 100
        })),
        rawData: response.data
      };
    } catch (error) {
      throw new Error(`Clarifai API Error: ${error.message}`);
    }
  }

  /**
   * Analyze image using AWS Rekognition
   */
  async analyzeWithAWS(imageUrl) {
    // AWS implementation would go here
    throw new Error('AWS Rekognition not yet implemented');
  }

  /**
   * Extract clothing category from labels
   */
  extractCategory(labels) {
    const categoryScores = {};
    
    labels.forEach(label => {
      const description = label.description.toLowerCase();
      const score = label.score || 0;
      
      // Check against our category mapping
      for (const [key, value] of Object.entries(aiConfig.categoryMapping)) {
        if (description.includes(key)) {
          categoryScores[value] = (categoryScores[value] || 0) + score;
        }
      }
    });

    // Return category with highest score
    const sortedCategories = Object.entries(categoryScores)
      .sort(([,a], [,b]) => b - a);
    
    return sortedCategories.length > 0 ? sortedCategories[0][0] : 'unknown';
  }

  /**
   * Extract dominant colors from image
   */
  extractColors(imageProperties) {
    if (!imageProperties?.dominantColors?.colors) {
      return { primary: 'unknown', secondary: [], hex: '#000000' };
    }

    const colors = imageProperties.dominantColors.colors
      .sort((a, b) => b.pixelFraction - a.pixelFraction)
      .slice(0, 3);

    const primaryColor = colors[0];
    const hex = rgbToHex(
      primaryColor.color.red || 0,
      primaryColor.color.green || 0,
      primaryColor.color.blue || 0
    );

    return {
      primary: getColorName(hex),
      secondary: colors.slice(1).map(c => {
        const h = rgbToHex(c.color.red || 0, c.color.green || 0, c.color.blue || 0);
        return getColorName(h);
      }),
      hex,
      dominantColors: colors.map(c => ({
        hex: rgbToHex(c.color.red || 0, c.color.green || 0, c.color.blue || 0),
        score: c.score,
        pixelFraction: c.pixelFraction
      }))
    };
  }

  /**
   * Detect pattern (solid, striped, checkered, etc.)
   */
  detectPattern(labels) {
    const patterns = ['solid', 'striped', 'checkered', 'floral', 'geometric', 'abstract'];
    
    for (const label of labels) {
      const desc = label.description.toLowerCase();
      for (const pattern of patterns) {
        if (desc.includes(pattern) || desc.includes(pattern + 's')) {
          return pattern;
        }
      }
    }
    
    return 'solid'; // default
  }

  /**
   * Extract style attributes
   */
  extractStyle(labels) {
    const styles = [];
    const styleKeywords = {
      casual: ['casual', 'everyday', 'relaxed'],
      formal: ['formal', 'dress', 'elegant', 'sophisticated'],
      sporty: ['athletic', 'sport', 'active', 'gym'],
      vintage: ['vintage', 'retro', 'classic'],
      modern: ['modern', 'contemporary', 'trendy'],
      bohemian: ['boho', 'bohemian', 'hippie']
    };

    labels.forEach(label => {
      const desc = label.description.toLowerCase();
      
      for (const [style, keywords] of Object.entries(styleKeywords)) {
        if (keywords.some(kw => desc.includes(kw))) {
          styles.push(style);
        }
      }
    });

    return styles.length > 0 ? [...new Set(styles)] : ['casual'];
  }

  /**
   * Calculate overall confidence score
   */
  calculateConfidence(annotations) {
    const labels = annotations.labelAnnotations || [];
    if (labels.length === 0) return 0;
    
    const avgScore = labels
      .slice(0, 5)
      .reduce((sum, label) => sum + (label.score || 0), 0) / Math.min(5, labels.length);
    
    return Math.round(avgScore * 100);
  }

  /**
   * Extract category from Clarifai concepts
   */
  extractCategoryFromConcepts(concepts) {
    for (const concept of concepts) {
      const name = concept.name.toLowerCase();
      for (const [key, value] of Object.entries(aiConfig.categoryMapping)) {
        if (name.includes(key)) {
          return value;
        }
      }
    }
    return 'unknown';
  }

  /**
   * Extract colors from Clarifai regions
   */
  extractColorsFromRegions(regions) {
    // Simplified - would need more complex implementation
    return { primary: 'unknown', secondary: [], hex: '#000000' };
  }

  /**
   * Detect pattern from Clarifai concepts
   */
  detectPatternFromConcepts(concepts) {
    const patterns = ['solid', 'striped', 'checkered', 'floral', 'geometric'];
    for (const concept of concepts) {
      const name = concept.name.toLowerCase();
      for (const pattern of patterns) {
        if (name.includes(pattern)) return pattern;
      }
    }
    return 'solid';
  }

  /**
   * Extract style from Clarifai concepts
   */
  extractStyleFromConcepts(concepts) {
    const styles = ['casual', 'formal', 'sporty'];
    const found = [];
    
    concepts.forEach(concept => {
      const name = concept.name.toLowerCase();
      styles.forEach(style => {
        if (name.includes(style)) found.push(style);
      });
    });
    
    return found.length > 0 ? found : ['casual'];
  }
}

module.exports = new AIVisionService();