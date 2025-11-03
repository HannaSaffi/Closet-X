// services/outfit-service/src/config/ollama.js
// Ollama configuration for GPU-powered AI on Kubernetes

const ollamaConfig = {
  // Ollama service URL (will be available on K8s cluster)
  baseUrl: process.env.OLLAMA_URL || 'http://ollama-service:11434',
  
  // Models available on Ollama
  models: {
    fashion: process.env.OLLAMA_FASHION_MODEL || 'llama3.2-vision:latest', // Vision model for images
    chat: process.env.OLLAMA_CHAT_MODEL || 'llama3.2:3b', // Fast chat model
    analysis: process.env.OLLAMA_ANALYSIS_MODEL || 'llama3.1:8b' // Larger model for analysis
  },
  
  // Request configuration
  timeout: 60000, // 60 seconds
  maxRetries: 3,
  retryDelay: 2000,
  
  // Model parameters
  parameters: {
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    num_predict: 500
  }
};

module.exports = ollamaConfig;