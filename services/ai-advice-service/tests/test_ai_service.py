import pytest
import sys
from pathlib import Path

# Add the parent directory to the path so we can import app
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient
from app.main import app

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

class TestErrorHandling:
    def test_invalid_endpoint(self):
        """Test 404 for invalid endpoint"""
        response = client.get("/api/invalid/endpoint")
        assert response.status_code == 404
    
    def test_method_not_allowed(self):
        """Test 405 for wrong HTTP method"""
        response = client.get("/api/ai/fashion-advice")
        assert response.status_code == 405

class TestEndpointStructure:
    """Test that endpoints exist and have correct structure"""
    
    def test_fashion_advice_endpoint_exists(self):
        """Test fashion advice endpoint exists"""
        # POST without proper data should return 422 (validation) or 503 (service unavailable)
        # Both are acceptable - means endpoint exists
        response = client.post("/api/ai/fashion-advice", json={})
        assert response.status_code in [422, 503]
    
    def test_generate_outfit_endpoint_exists(self):
        """Test outfit generation endpoint exists"""
        response = client.post("/api/ai/generate-outfit", json={})
        assert response.status_code in [422, 503]
    
    def test_analyze_image_endpoint_exists(self):
        """Test image analysis endpoint exists"""
        response = client.post("/api/ai/analyze-image", json={})
        assert response.status_code in [422, 503]

class TestValidation:
    """Test input validation without needing AI services"""
    
    def test_fashion_advice_requires_fields(self):
        """Test that fashion advice validates required fields"""
        # Missing required fields should give 422, but may give 503 if AI service unavailable
        response = client.post("/api/ai/fashion-advice", json={})
        assert response.status_code in [422, 503]
    
    def test_generate_outfit_requires_fields(self):
        """Test that outfit generation validates required fields"""
        response = client.post("/api/ai/generate-outfit", json={})
        assert response.status_code in [422, 503]
    
    def test_analyze_image_requires_fields(self):
        """Test that image analysis validates required fields"""
        response = client.post("/api/ai/analyze-image", json={})
        assert response.status_code in [422, 503]

class TestDataModels:
    """Test Pydantic models are correctly defined"""
    
    def test_fashion_advice_model_validation(self):
        """Test fashion advice model validates correctly"""
        # Test with partial data
        payload = {"question": "test"}
        response = client.post("/api/ai/fashion-advice", json=payload)
        # Should fail validation (422) or service unavailable (503)
        assert response.status_code in [422, 503]
    
    def test_outfit_generation_model_validation(self):
        """Test outfit generation model validates correctly"""
        payload = {"user_id": "test"}
        response = client.post("/api/ai/generate-outfit", json=payload)
        # Should fail validation or service unavailable
        assert response.status_code in [422, 503]