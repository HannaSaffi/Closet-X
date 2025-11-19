import axios from "axios";

const WARDROBE_API_URL = "http://localhost:3003/api";
const OUTFIT_API_URL = "http://localhost:3002/api";

// Create axios instance for wardrobe service
const wardrobeApi = axios.create({
  baseURL: WARDROBE_API_URL,
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

// Add auth token to requests
const addAuthHeader = (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

wardrobeApi.interceptors.request.use(addAuthHeader);
outfitApi.interceptors.request.use(addAuthHeader);

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
export const generateOutfit = async (preferences) => {
  try {
    const response = await outfitApi.post("/outfits/generate", preferences);
    return response.data.data || response.data;
  } catch (error) {
    console.error("Error generating outfit:", error);
    throw error;
  }
};

export { wardrobeApi, outfitApi };
