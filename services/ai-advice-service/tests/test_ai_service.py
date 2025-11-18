import pytest
from fastapi.testclient import TestClient
from app.main import app
import json

client = TestClient(app)

class TestHealthEndpoints:
    def test_health_check(self):
        """Test basic health endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["service"] == "ai-advice-service"
        assert response.json()["status"] == "healthy"
    
    def test_root_endpoint(self):
        """Test root endpoint returns service info"""
        response = client.get("/")
        assert response.status_code == 200
        assert "service" in response.json()
        assert "endpoints" in response.json()

class TestFashionAdvice:
    def test_fashion_advice_success(self):
        """Test successful fashion advice generation"""
        payload = {
            "user_id": "test-user-123",
            "question": "What colors go well with navy blue?",
            "context": {"occasion": "casual"}
        }
        
        response = client.post("/api/ai/fashion-advice", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "advice" in data
        assert "suggestions" in data
        assert isinstance(data["suggestions"], list)
    
    def test_fashion_advice_missing_fields(self):
        """Test fashion advice with missing required fields"""
        payload = {
            "question": "What should I wear?"
            # Missing user_id
        }
        
        response = client.post("/api/ai/fashion-advice", json=payload)
        assert response.status_code == 422  # Validation error
    
    def test_fashion_advice_empty_question(self):
        """Test fashion advice with empty question"""
        payload = {
            "user_id": "test-user-123",
            "question": "",
            "context": {}
        }
        
        response = client.post("/api/ai/fashion-advice", json=payload)
        # Should still succeed with default advice
        assert response.status_code in [200, 400]

class TestFashionTrends:
    def test_get_trends(self):
        """Test getting fashion trends"""
        response = client.get("/api/ai/trends")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "trending_colors" in data
        assert "trending_styles" in data
        assert "current_season" in data
        assert isinstance(data["trending_colors"], list)
        assert isinstance(data["trending_styles"], list)
    
    def test_trends_has_required_fields(self):
        """Test trends response has all required fields"""
        response = client.get("/api/ai/trends")
        data = response.json()
        
        required_fields = [
            "success",
            "current_season",
            "trending_colors",
            "trending_styles",
            "trending_patterns"
        ]
        
        for field in required_fields:
            assert field in data

class TestOutfitGeneration:
    def test_generate_outfit_basic(self):
        """Test basic outfit generation"""
        payload = {
            "user_id": "test-user-123",
            "clothing_items": [
                {
                    "id": "item1",
                    "category": "tops",
                    "color": "blue",
                    "season": "summer"
                },
                {
                    "id": "item2",
                    "category": "bottoms",
                    "color": "black",
                    "season": "all-season"
                }
            ],
            "occasion": "casual",
            "weather": {"temp": 72, "description": "sunny"}
        }
        
        response = client.post("/api/ai/generate-outfit", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "selected_items" in data
        assert "reasoning" in data
        assert "confidence_score" in data
    
    def test_generate_outfit_invalid_occasion(self):
        """Test outfit generation with invalid occasion"""
        payload = {
            "user_id": "test-user-123",
            "clothing_items": [],
            "occasion": "invalid-occasion"
        }
        
        response = client.post("/api/ai/generate-outfit", json=payload)
        assert response.status_code == 422

class TestImageAnalysis:
    def test_analyze_image_endpoint(self):
        """Test image analysis endpoint structure"""
        payload = {
            "image_url": "https://example.com/shirt.jpg",
            "user_id": "test-user-123"
        }
        
        response = client.post("/api/ai/analyze-image", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "category" in data
        assert "color" in data
        assert "confidence" in data

class TestErrorHandling:
    def test_invalid_endpoint(self):
        """Test 404 for invalid endpoint"""
        response = client.get("/api/invalid/endpoint")
        assert response.status_code == 404
    
    def test_method_not_allowed(self):
        """Test 405 for wrong HTTP method"""
        response = client.get("/api/ai/fashion-advice")
        assert response.status_code == 405
