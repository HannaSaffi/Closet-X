const axios = require('axios');

const WARDROBE_SERVICE_URL = process.env.WARDROBE_SERVICE_URL || 'http://wardrobe-service:3003';

exports.getClothingItems = async (token, filters = {}) => {
  try {
    const response = await axios.get(`${WARDROBE_SERVICE_URL}/api/wardrobe`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: filters,
      timeout: 5000
    });
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching clothing items:', error.message);
    throw new Error('Failed to fetch wardrobe items');
  }
};

exports.getClothingItem = async (token, itemId) => {
  try {
    const response = await axios.get(`${WARDROBE_SERVICE_URL}/api/wardrobe/${itemId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 5000
    });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching clothing item:', error.message);
    throw new Error('Failed to fetch clothing item');
  }
};

exports.getWardrobeStats = async (token) => {
  try {
    const response = await axios.get(`${WARDROBE_SERVICE_URL}/api/wardrobe/stats`, {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 5000
    });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching wardrobe stats:', error.message);
    throw new Error('Failed to fetch wardrobe statistics');
  }
};