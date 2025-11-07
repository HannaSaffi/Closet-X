import axios from "axios";

const API_BASE_URL = "http://localhost:3001/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const mockClothes = [
  {
    _id: "1",
    category: "tops",
    imageURL: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500",
    color: { primary: "blue" },
    season: ["summer"],
    brand: "Nike"
  },
  {
    _id: "2",
    category: "bottoms",
    imageURL: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500",
    color: { primary: "black" },
    season: ["all-season"],
    brand: "Levis"
  },
  {
    _id: "3",
    category: "shoes",
    imageURL: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500",
    color: { primary: "white" },
    season: ["spring", "summer"],
    brand: "Adidas"
  },
  {
    _id: "4",
    category: "outerwear",
    imageURL: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500",
    color: { primary: "brown" },
    season: ["fall", "winter"],
    brand: "North Face"
  }
];

const useMockData = true;

export const getAllClothes = async () => {
  if (useMockData) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockClothes;
  }
  try {
    const response = await api.get("/clothing");
    return response.data.data || response.data;
  } catch (error) {
    console.error("Error fetching clothes:", error);
    throw error;
  }
};

export const addClothing = async (formData) => {
  if (useMockData) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newItem = {
      _id: Date.now().toString(),
      category: formData.get("category"),
      color: { primary: formData.get("color") },
      season: [formData.get("season")],
      brand: formData.get("brand") || "Unknown",
      imageURL: "https://via.placeholder.com/250"
    };
    mockClothes.push(newItem);
    return newItem;
  }
  try {
    const response = await api.post("/clothing", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data || response.data;
  } catch (error) {
    console.error("Error adding clothing:", error);
    throw error;
  }
};

export const deleteClothing = async (id) => {
  if (useMockData) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockClothes.findIndex(item => item._id === id);
    if (index > -1) {
      mockClothes.splice(index, 1);
    }
    return { success: true };
  }
  try {
    const response = await api.delete("/clothing/" + id);
    return response.data;
  } catch (error) {
    console.error("Error deleting clothing:", error);
    throw error;
  }
};

export default api;
