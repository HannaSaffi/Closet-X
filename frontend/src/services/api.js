import axios from "axios";

const USER_API_URL = "http://localhost:3001/api";
const OUTFIT_API_URL = "http://localhost:3002/api";
const WARDROBE_API_URL = "http://localhost:3003/api";

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
    const response = await wardrobeApi.get("/wardrobe");
    return response.data.data || response.data;
  } catch (error) {
    console.error("Error fetching clothes:", error);
    throw error;
  }
};

export const addClothing = async (formData) => {
  try {
    const response = await wardrobeApi.post("/wardrobe", formData, {
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
    const response = await wardrobeApi.delete(`/wardrobe/${id}`);
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
    const url = queryString ? `/daily-outfit?${queryString}` : '/daily-outfit';
    
    const response = await outfitApi.get(url);
    return response.data.data || response.data;
  } catch (error) {
    console.error("Error getting daily outfit:", error);
    throw error;
  }
};

export const generateOutfit = async (preferences) => {
  try {
    const response = await outfitApi.post("/outfits/generate", preferences);
    return response.data.data || response.data;
  } catch (error) {
    console.error("Error generating outfit:", error);
    throw error;
  }
};

export { userApi, outfitApi, wardrobeApi };
