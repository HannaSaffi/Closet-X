"""
Closet-X Recommendation Service (Python)
AI-powered outfit recommendations using Flask
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import logging
from functools import wraps
import jwt
from datetime import datetime

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET', 'your-secret-key')

# Enable CORS
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# Middleware
# ============================================================================

def token_required(f):
    """Decorator to check JWT token on protected routes"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'success': False, 'message': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'success': False, 'message': 'Token is missing'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user_id = data['id']
        except Exception as e:
            logger.error(f"Token decode error: {str(e)}")
            return jsonify({'success': False, 'message': 'Invalid token'}), 401
        
        return f(current_user_id, *args, **kwargs)
    return decorated

# ============================================================================
# Health Check
# ============================================================================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'status': 'healthy',
        'service': 'recommendation-service',
        'timestamp': datetime.utcnow().isoformat()
    }), 200

# ============================================================================
# Recommendation Endpoints
# ============================================================================

@app.route('/api/recommendations/generate', methods=['POST'])
@token_required
def generate_recommendations(current_user_id):
    """
    Generate outfit recommendations based on wardrobe and preferences
    
    Request body:
    {
        "season": "winter",
        "occasion": "casual",
        "temperature": 45,
        "clothing_items": [...]
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request body is required'
            }), 400
        
        season = data.get('season', 'all-season')
        occasion = data.get('occasion', 'casual')
        temperature = data.get('temperature', 70)
        clothing_items = data.get('clothing_items', [])
        
        # Simple recommendation logic
        recommendations = generate_outfit_combinations(
            clothing_items, 
            season, 
            occasion, 
            temperature,
            current_user_id
        )
        
        return jsonify({
            'success': True,
            'message': 'Recommendations generated successfully',
            'userId': current_user_id,
            'recommendations': recommendations,
            'count': len(recommendations)
        }), 200
    
    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error generating recommendations',
            'error': str(e)
        }), 500

@app.route('/api/recommendations/seasonal', methods=['POST'])
@token_required
def get_seasonal_recommendations(current_user_id):
    """Get seasonal outfit recommendations"""
    try:
        data = request.get_json()
        season = data.get('season', 'winter')
        clothing_items = data.get('clothing_items', [])
        
        recommendations = filter_by_season(clothing_items, season)
        
        return jsonify({
            'success': True,
            'season': season,
            'recommendations': recommendations,
            'count': len(recommendations)
        }), 200
    
    except Exception as e:
        logger.error(f"Error getting seasonal recommendations: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error getting seasonal recommendations'
        }), 500

@app.route('/api/recommendations/color-palette', methods=['POST'])
@token_required
def get_color_palette_recommendations(current_user_id):
    """Get recommendations based on color palette"""
    try:
        data = request.get_json()
        primary_color = data.get('primary_color', 'blue')
        clothing_items = data.get('clothing_items', [])
        
        recommendations = filter_by_color_palette(clothing_items, primary_color)
        
        return jsonify({
            'success': True,
            'primary_color': primary_color,
            'recommendations': recommendations,
            'count': len(recommendations),
            'complementary_colors': get_complementary_colors(primary_color)
        }), 200
    
    except Exception as e:
        logger.error(f"Error getting color palette recommendations: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error getting color palette recommendations'
        }), 500

@app.route('/api/recommendations/analytics', methods=['GET'])
@token_required
def get_recommendation_analytics(current_user_id):
    """Get analytics about recommendations"""
    try:
        analytics = {
            'total_recommendations_generated': 0,
            'most_common_combinations': [],
            'user_preferences': {
                'favorite_seasons': ['winter', 'fall'],
                'favorite_occasions': ['casual', 'business'],
                'average_temperature': 65
            },
            'trends': {
                'formal_outfits': 25,
                'casual_outfits': 65,
                'athletic_outfits': 10
            }
        }
        
        return jsonify({
            'success': True,
            'userId': current_user_id,
            'analytics': analytics
        }), 200
    
    except Exception as e:
        logger.error(f"Error getting analytics: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error getting analytics'
        }), 500

# ============================================================================
# Utility Functions
# ============================================================================

def generate_outfit_combinations(items, season, occasion, temperature, user_id):
    """Generate outfit combinations based on criteria"""
    recommendations = []
    
    if not items or len(items) < 2:
        return recommendations
    
    # Simple combination logic
    for i, top in enumerate(items[:3]):
        for bottom in items[3:]:
            outfit = {
                'id': f"outfit_{i}_{hash(str(bottom))}",
                'top': top,
                'bottom': bottom,
                'season': season,
                'occasion': occasion,
                'suitable_temperature': f"{temperature - 5}°F - {temperature + 15}°F",
                'confidence_score': 0.85,
                'userId': user_id
            }
            recommendations.append(outfit)
    
    return recommendations[:5]  # Return top 5

def filter_by_season(items, season):
    """Filter clothing items by season"""
    seasonal_keywords = {
        'winter': ['warm', 'wool', 'coat', 'sweater', 'thermal'],
        'spring': ['light', 'pastel', 'jacket', 'cardigan'],
        'summer': ['cotton', 'light', 'short', 'sleeveless'],
        'fall': ['layered', 'warm', 'sweater', 'jacket']
    }
    
    keywords = seasonal_keywords.get(season, [])
    filtered = []
    
    for item in items:
        item_str = str(item).lower()
        if any(keyword in item_str for keyword in keywords):
            filtered.append(item)
    
    return filtered

def filter_by_color_palette(items, primary_color):
    """Filter items by color palette"""
    color_families = {
        'blue': ['blue', 'navy', 'teal', 'cyan'],
        'red': ['red', 'crimson', 'burgundy', 'pink'],
        'neutral': ['black', 'white', 'gray', 'beige', 'brown']
    }
    
    palette = color_families.get(primary_color, [primary_color])
    return [item for item in items if any(c in str(item).lower() for c in palette)]

def get_complementary_colors(color):
    """Get complementary colors"""
    complementary_map = {
        'blue': ['orange', 'yellow'],
        'red': ['cyan', 'green'],
        'yellow': ['blue', 'purple'],
        'green': ['red', 'pink'],
        'neutral': ['any']
    }
    
    return complementary_map.get(color, ['neutral'])

# ============================================================================
# Error Handlers
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'success': False,
        'message': 'Endpoint not found',
        'status': 404
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({
        'success': False,
        'message': 'Internal server error',
        'status': 500
    }), 500

# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    debug = os.getenv('DEBUG', 'False') == 'True'
    
    logger.info(f"🚀 Starting Closet-X Recommendation Service on port {port}")
    logger.info(f"📍 Environment: {os.getenv('ENV', 'development')}")
    logger.info("\n✨ Available endpoints:")
    logger.info("   POST   /api/recommendations/generate        - Generate outfit combinations")
    logger.info("   POST   /api/recommendations/seasonal        - Seasonal recommendations")
    logger.info("   POST   /api/recommendations/color-palette   - Color palette recommendations")
    logger.info("   GET    /api/recommendations/analytics       - Get analytics (protected)\n")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )
