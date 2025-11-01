// services/outfit-service/src/config/aiVision.js

const aiConfig = {
  // Primary AI Provider (google, clarifai, or aws)
  provider: process.env.AI_VISION_PROVIDER || 'google',
  
  // Google Vision API Configuration
  google: {
    apiKey: process.env.GOOGLE_VISION_API_KEY,
    endpoint: 'https://vision.googleapis.com/v1',
    features: [
      'LABEL_DETECTION',        // Detect objects/clothing items
      'IMAGE_PROPERTIES',       // Detect colors
      'OBJECT_LOCALIZATION',    // Locate items in image
      'WEB_DETECTION'           // Find similar images online
    ],
    maxResults: 10,
    confidenceThreshold: 0.7
  },
  
  // Clarifai Configuration (Fashion-specialized)
  clarifai: {
    apiKey: process.env.CLARIFAI_API_KEY,
    models: {
      apparel: 'e0be3b9d6a454f0493ac3a30784001ff', // Apparel detection
      color: 'eeed0b6733a644cea07cf4c60f87ebb7',   // Color recognition
      fashion: 'e0be3b9d6a454f0493ac3a30784001ff'  // Fashion attributes
    },
    confidenceThreshold: 0.75
  },
  
  // AWS Rekognition Configuration (Alternative)
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    confidenceThreshold: 70
  },
  
  // AI Processing Settings
  processing: {
    maxRetries: 3,
    retryDelay: 1000, // ms
    timeout: 30000,   // 30 seconds
    cacheResults: true,
    cacheDuration: 86400000 // 24 hours in ms
  },
  
  // Category Mapping
  categoryMapping: {
    // Google/Clarifai labels → Our categories
    't-shirt': 'tops',
    'shirt': 'tops',
    'blouse': 'tops',
    'sweater': 'tops',
    'top': 'tops',
    'pants': 'bottoms',
    'jeans': 'bottoms',
    'trousers': 'bottoms',
    'shorts': 'bottoms',
    'skirt': 'bottoms',
    'dress': 'dresses',
    'jacket': 'outerwear',
    'coat': 'outerwear',
    'blazer': 'outerwear',
    'shoes': 'shoes',
    'sneakers': 'shoes',
    'boots': 'shoes',
    'sandals': 'shoes',
    'accessories': 'accessories',
    'bag': 'accessories',
    'hat': 'accessories',
    'scarf': 'accessories'
  },
  
  // Color Mapping (hex to name)
  colorMapping: {
    '#000000': 'black',
    '#FFFFFF': 'white',
    '#FF0000': 'red',
    '#00FF00': 'green',
    '#0000FF': 'blue',
    '#FFFF00': 'yellow',
    '#FFA500': 'orange',
    '#800080': 'purple',
    '#FFC0CB': 'pink',
    '#A52A2A': 'brown',
    '#808080': 'gray',
    '#F5F5DC': 'beige',
    '#000080': 'navy',
    '#FFD700': 'gold'
  }
};

// Helper function to get closest color name from hex
function getColorName(hexColor) {
  const colors = Object.keys(aiConfig.colorMapping);
  let minDistance = Infinity;
  let closestColor = 'unknown';
  
  const rgb = hexToRgb(hexColor);
  
  colors.forEach(hex => {
    const targetRgb = hexToRgb(hex);
    const distance = Math.sqrt(
      Math.pow(rgb.r - targetRgb.r, 2) +
      Math.pow(rgb.g - targetRgb.g, 2) +
      Math.pow(rgb.b - targetRgb.b, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = aiConfig.colorMapping[hex];
    }
  });
  
  return closestColor;
}

// Convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Convert RGB to hex
function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

module.exports = {
  aiConfig,
  getColorName,
  hexToRgb,
  rgbToHex
};