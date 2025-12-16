# services/ai-advice-service/app/main.py

"""
Closet-X AI Advice Service
Python-based microservice for AI-powered fashion advice and outfit recommendations
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
import os
import json
from motor.motor_asyncio import AsyncIOMotorClient
import aio_pika
from openai import AsyncOpenAI
import asyncio

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Environment variables
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://ai_service:service_password_123@mongodb-service.kates-closetx.svc.cluster.local:27017/closetx_ai?authSource=admin')
RABBITMQ_URL = os.getenv('RABBITMQ_URL', 'amqp://guest:guest@rabbitmq.rabbitmq:5672')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
PORT = int(os.getenv('PORT', 3004))

# Initialize FastAPI app
app = FastAPI(
    title="Closet-X AI Advice Service",
    description="AI-powered fashion advice and outfit recommendations using Python and machine learning",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global connections
db_client: Optional[AsyncIOMotorClient] = None
rabbitmq_connection: Optional[aio_pika.Connection] = None
rabbitmq_channel: Optional[aio_pika.Channel] = None
openai_client: Optional[AsyncOpenAI] = None

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class ClothingItem(BaseModel):
    """Clothing item model for AI analysis"""
    id: str
    category: str
    color: str
    season: Optional[str] = None
    fabric: Optional[str] = None
    style: Optional[str] = None
    
class OutfitRequest(BaseModel):
    """Request model for outfit generation"""
    user_id: str
    clothing_items: List[ClothingItem]
    occasion: str = Field(..., description="Occasion type: casual, formal, work, athletic")
    weather: Optional[Dict[str, Any]] = None
    preferences: Optional[Dict[str, Any]] = None
    
    @validator('occasion')
    def validate_occasion(cls, v):
        valid_occasions = ['casual', 'formal', 'work', 'athletic', 'party', 'date']
        if v.lower() not in valid_occasions:
            raise ValueError(f'Occasion must be one of: {", ".join(valid_occasions)}')
        return v.lower()

class OutfitResponse(BaseModel):
    """Response model for outfit generation"""
    success: bool
    outfit_id: Optional[str] = None
    selected_items: List[str]
    reasoning: str
    style_tips: List[str]
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    
class ImageAnalysisRequest(BaseModel):
    """Request model for clothing image analysis"""
    image_url: str
    user_id: str
    
class ImageAnalysisResponse(BaseModel):
    """Response model for image analysis"""
    success: bool
    category: str
    color: str
    pattern: Optional[str] = None
    style: Optional[str] = None
    season_suggestions: List[str]
    tags: List[str]
    confidence: float = Field(..., ge=0.0, le=1.0)

class FashionAdviceRequest(BaseModel):
    """Request model for fashion advice"""
    user_id: str
    question: str
    context: Optional[Dict[str, Any]] = None

class FashionAdviceResponse(BaseModel):
    """Response model for fashion advice"""
    success: bool
    advice: str
    suggestions: List[str]
    related_items: Optional[List[str]] = None

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    timestamp: str
    uptime: float
    version: str

# ============================================================================
# STARTUP AND SHUTDOWN
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize connections on startup"""
    global db_client, rabbitmq_connection, rabbitmq_channel, openai_client
    
    logger.info("🚀 Starting AI Advice Service...")
    
    # Connect to MongoDB
    try:
        db_client = AsyncIOMotorClient(MONGODB_URI)
        await db_client.admin.command('ping')
        logger.info("✅ Connected to MongoDB")
    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB: {e}")
    
    # Connect to RabbitMQ
    try:
        rabbitmq_connection = await aio_pika.connect_robust(RABBITMQ_URL)
        rabbitmq_channel = await rabbitmq_connection.channel()
        
        # Declare queues
        await rabbitmq_channel.declare_queue('ai_advice_queue', durable=True)
        await rabbitmq_channel.declare_queue('image_analysis_queue', durable=True)
        
        logger.info("✅ Connected to RabbitMQ")
    except Exception as e:
        logger.error(f"❌ Failed to connect to RabbitMQ: {e}")
    
    # Initialize OpenAI client (if API key is provided)
    if OPENAI_API_KEY:
        openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        logger.info("✅ OpenAI client initialized")
    else:
        logger.warning("⚠️  OpenAI API key not provided - AI features will be simulated")
    
    logger.info(f"✅ AI Advice Service started on port {PORT}")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up connections on shutdown"""
    global db_client, rabbitmq_connection, rabbitmq_channel
    
    logger.info("⚠️  Shutting down AI Advice Service...")
    
    if rabbitmq_channel:
        await rabbitmq_channel.close()
        logger.info("✅ RabbitMQ channel closed")
    
    if rabbitmq_connection:
        await rabbitmq_connection.close()
        logger.info("✅ RabbitMQ connection closed")
    
    if db_client:
        db_client.close()
        logger.info("✅ MongoDB connection closed")
    
    logger.info("👋 Shutdown complete")

# ============================================================================
# DEPENDENCY INJECTION
# ============================================================================

async def get_db():
    """Get database connection"""
    if db_client is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    return db_client.closetx_ai

async def get_rabbitmq_channel():
    """Get RabbitMQ channel"""
    if rabbitmq_channel is None:
        raise HTTPException(status_code=503, detail="Message queue not connected")
    return rabbitmq_channel

# ============================================================================
# HEALTH CHECK ENDPOINTS
# ============================================================================

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "service": "ai-advice-service",
        "timestamp": datetime.utcnow().isoformat(),
        "uptime": 0.0,  # TODO: Implement uptime tracking
        "version": "1.0.0"
    }

@app.get("/ready", tags=["Health"])
async def readiness_check():
    """Readiness probe - checks if service is ready to accept traffic"""
    checks = {
        "service": "ai-advice-service",
        "timestamp": datetime.utcnow().isoformat(),
        "ready": True,
        "checks": {}
    }
    
    # Check MongoDB
    try:
        if db_client:
            await db_client.admin.command('ping')
            checks["checks"]["database"] = {"status": "connected", "ready": True}
        else:
            checks["checks"]["database"] = {"status": "disconnected", "ready": False}
            checks["ready"] = False
    except Exception as e:
        checks["checks"]["database"] = {"status": "error", "ready": False, "error": str(e)}
        checks["ready"] = False
    
    # Check RabbitMQ
    if rabbitmq_connection and not rabbitmq_connection.is_closed:
        checks["checks"]["messageQueue"] = {"status": "connected", "ready": True}
    else:
        checks["checks"]["messageQueue"] = {"status": "disconnected", "ready": False}
        checks["ready"] = False
    
    status_code = 200 if checks["ready"] else 503
    return JSONResponse(content=checks, status_code=status_code)

@app.get("/live", tags=["Health"])
async def liveness_check():
    """Liveness probe - checks if service is alive"""
    return {
        "status": "alive",
        "service": "ai-advice-service",
        "timestamp": datetime.utcnow().isoformat()
    }

# ============================================================================
# AI ENDPOINTS
# ============================================================================

@app.post("/api/ai/generate-outfit", response_model=OutfitResponse, tags=["AI"])
async def generate_outfit(
    request: OutfitRequest,
    db = Depends(get_db)
):
    """
    Generate an AI-powered outfit recommendation
    
    This endpoint uses machine learning to analyze clothing items and generate
    a cohesive outfit based on occasion, weather, and user preferences.
    """
    try:
        logger.info(f"Generating outfit for user {request.user_id}, occasion: {request.occasion}")
        
        # Simple rule-based outfit generation (can be replaced with ML model)
        selected_items = []
        reasoning_parts = []
        
        # Select items based on occasion and category
        categories_needed = {
            'casual': ['shirt', 'pants', 'shoes'],
            'formal': ['shirt', 'pants', 'jacket', 'shoes'],
            'work': ['shirt', 'pants', 'shoes'],
            'athletic': ['shirt', 'pants', 'shoes']
        }
        
        needed = categories_needed.get(request.occasion, ['shirt', 'pants', 'shoes'])
        
        for category in needed:
            # Find matching items
            matches = [item for item in request.clothing_items if category in item.category.lower()]
            if matches:
                # Simple selection: first match (can be improved with ML)
                selected = matches[0]
                selected_items.append(selected.id)
                reasoning_parts.append(f"Selected {selected.category} in {selected.color}")
        
        # Generate style tips
        style_tips = [
            f"Perfect for {request.occasion} occasions",
            "Consider accessorizing with complementary colors",
            "Make sure items are clean and well-fitted"
        ]
        
        if request.weather:
            temp = request.weather.get('temperature', 20)
            if temp < 10:
                style_tips.append("Layer up - it's cold outside!")
            elif temp > 25:
                style_tips.append("Stay cool with breathable fabrics")
        
        reasoning = " | ".join(reasoning_parts) if reasoning_parts else "Selected based on available items"
        
        # Calculate confidence (simple heuristic)
        confidence = min(1.0, len(selected_items) / len(needed))
        
        # Store outfit suggestion in database
        outfit_data = {
            "user_id": request.user_id,
            "occasion": request.occasion,
            "selected_items": selected_items,
            "reasoning": reasoning,
            "created_at": datetime.utcnow(),
            "confidence": confidence
        }
        
        result = await db.outfits.insert_one(outfit_data)
        outfit_id = str(result.inserted_id)
        
        logger.info(f"✅ Generated outfit {outfit_id} with {len(selected_items)} items")
        
        return OutfitResponse(
            success=True,
            outfit_id=outfit_id,
            selected_items=selected_items,
            reasoning=reasoning,
            style_tips=style_tips,
            confidence_score=confidence
        )
        
    except Exception as e:
        logger.error(f"❌ Error generating outfit: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/analyze-image", response_model=ImageAnalysisResponse, tags=["AI"])
async def analyze_image(
    request: ImageAnalysisRequest,
    db = Depends(get_db)
):
    """
    Analyze a clothing image using AI/ML
    
    This endpoint uses computer vision to identify clothing attributes like
    category, color, pattern, and style from an uploaded image.
    """
    try:
        logger.info(f"Analyzing image for user {request.user_id}: {request.image_url}")
        
        # TODO: Integrate with real AI vision API (Google Vision, Clarifai, etc.)
        # For now, returning simulated results
        
        # Simulated AI analysis
        analysis = {
            "category": "shirt",  # Can be: shirt, pants, jacket, shoes, etc.
            "color": "blue",      # Detected primary color
            "pattern": "solid",   # solid, striped, checkered, floral, etc.
            "style": "casual",    # casual, formal, sporty, etc.
            "season_suggestions": ["spring", "summer", "fall"],
            "tags": ["cotton", "button-up", "long-sleeve"],
            "confidence": 0.85
        }
        
        # Store analysis in database
        analysis_data = {
            "user_id": request.user_id,
            "image_url": request.image_url,
            "analysis": analysis,
            "created_at": datetime.utcnow()
        }
        
        await db.image_analyses.insert_one(analysis_data)
        
        logger.info(f"✅ Image analyzed: {analysis['category']} - {analysis['color']}")
        
        return ImageAnalysisResponse(
            success=True,
            category=analysis["category"],
            color=analysis["color"],
            pattern=analysis.get("pattern"),
            style=analysis.get("style"),
            season_suggestions=analysis["season_suggestions"],
            tags=analysis["tags"],
            confidence=analysis["confidence"]
        )
        
    except Exception as e:
        logger.error(f"❌ Error analyzing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/fashion-advice", response_model=FashionAdviceResponse, tags=["AI"])
async def get_fashion_advice(
    request: FashionAdviceRequest,
    db = Depends(get_db)
):
    """
    Get AI-powered fashion advice
    
    This endpoint provides personalized fashion advice based on user questions
    and context, powered by GPT or similar language models.
    """
    try:
        logger.info(f"Providing fashion advice for user {request.user_id}: {request.question}")
        
        # TODO: Integrate with OpenAI GPT API for real advice
        # For now, returning simulated advice
        
        advice = f"Based on your question about '{request.question}', here's my advice: "
        
        if "color" in request.question.lower():
            advice += "Consider complementary colors on the color wheel. "
            suggestions = [
                "Try pairing blues with oranges",
                "Neutrals go with everything",
                "Monochromatic looks are always chic"
            ]
        elif "occasion" in request.question.lower():
            advice += "Choose outfits that match the formality of the event. "
            suggestions = [
                "Research the dress code beforehand",
                "When in doubt, slightly overdress",
                "Comfort is key for long events"
            ]
        else:
            advice += "Fashion is about expressing yourself while feeling comfortable. "
            suggestions = [
                "Build a versatile wardrobe",
                "Invest in quality basics",
                "Don't be afraid to experiment"
            ]
        
        # Store advice in database
        advice_data = {
            "user_id": request.user_id,
            "question": request.question,
            "advice": advice,
            "suggestions": suggestions,
            "created_at": datetime.utcnow()
        }
        
        await db.fashion_advice.insert_one(advice_data)
        
        logger.info(f"✅ Fashion advice provided for user {request.user_id}")
        
        return FashionAdviceResponse(
            success=True,
            advice=advice,
            suggestions=suggestions,
            related_items=None
        )
        
    except Exception as e:
        logger.error(f"❌ Error providing fashion advice: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ai/trends", tags=["AI"])
async def get_fashion_trends():
    """
    Get current fashion trends
    
    This endpoint provides information about current fashion trends,
    popular styles, and seasonal recommendations.
    """
    try:
        # TODO: Integrate with Pinterest API or fashion trend APIs
        # For now, returning simulated trends
        
        trends = {
            "success": True,
            "current_season": "Fall 2025",
            "trending_colors": ["emerald", "rust", "cream", "navy"],
            "trending_styles": ["oversized blazers", "wide-leg pants", "chunky boots"],
            "trending_patterns": ["houndstooth", "plaid", "animal print"],
            "sustainable_fashion": [
                "Second-hand shopping is booming",
                "Upcycling old clothes",
                "Capsule wardrobes"
            ],
            "tips": [
                "Mix high and low fashion pieces",
                "Invest in timeless pieces",
                "Experiment with layering"
            ]
        }
        
        logger.info("✅ Fashion trends retrieved")
        
        return trends
        
    except Exception as e:
        logger.error(f"❌ Error getting fashion trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ROOT ENDPOINT
# ============================================================================

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Closet-X AI Advice Service",
        "version": "1.0.0",
        "status": "running",
        "language": "Python 3.11",
        "framework": "FastAPI",
        "documentation": "/docs",
        "endpoints": {
            "health": "/health",
            "ready": "/ready",
            "live": "/live",
            "generate_outfit": "/api/ai/generate-outfit",
            "analyze_image": "/api/ai/analyze-image",
            "fashion_advice": "/api/ai/fashion-advice",
            "trends": "/api/ai/trends"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
