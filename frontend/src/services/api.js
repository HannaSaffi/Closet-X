import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const USER_API_URL = `${API_BASE_URL}/api`;
const OUTFIT_API_URL = `${API_BASE_URL}/api/outfits`;
const WARDROBE_API_URL = `${API_BASE_URL}/api/wardrobe`;

// Create axios instance for user service
const userApi = axios.create({
  baseURL: USER_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Create axios instance for outfit service
const outfitApi = axios.create({
  baseURL: OUTFIT_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Create axios instance for wardrobe service
const wardrobeApi = axios.create({
  baseURL: WARDROBE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
const addAuthHeader = (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

userApi.interceptors.request.use(addAuthHeader);
outfitApi.interceptors.request.use(addAuthHeader);
wardrobeApi.interceptors.request.use(addAuthHeader);

// Wardrobe API calls
export const getAllClothes = async () => {
  try {
    const response = await wardrobeApi.get("/");
    return response.data.data || response.data;
  } catch (error) {
    console.error("Error fetching clothes:", error);
    throw error;
  }
};

export const addClothing = async (formData) => {
  try {
    const response = await wardrobeApi.post("/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data || response.data;
  } catch (error) {
    console.error("Error adding clothing:", error);
    throw error;
  }
};

export const deleteClothing = async (id) => {
  try {
    const response = await wardrobeApi.delete(`/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting clothing:", error);
    throw error;
  }
};

// Outfit API calls
export const getDailyOutfit = async (params = {}) => {
  try {
    // Build query string
    const queryParams = new URLSearchParams();
    
    if (params.city) {
      queryParams.append('city', params.city);
    }
    
    if (params.preference) {
      queryParams.append('preference', params.preference);
    }
    
    if (params.includeAI !== undefined) {
      queryParams.append('includeAI', params.includeAI);
    }
    
    const queryString = queryParams.toString();
    
    // Use full path from API_BASE_URL instead of outfitApi
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
    const url = queryString 
      ? `${API_BASE_URL}/api/daily-outfit?${queryString}` 
      : `${API_BASE_URL}/api/daily-outfit`;
    
    const token = localStorage.getItem('token');
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error getting daily outfit:", error);
    throw error;
  }
};

export const generateOutfit = async (preferences) => {
  try {
    const response = await outfitApi.post("/generate", preferences);
    return response.data.data || response.data;
  } catch (error) {
    console.error("Error generating outfit:", error);
    throw error;
  }
};

export { userApi, outfitApi, wardrobeApi };