# Closet-X API Documentation

**Version:** 1.0  
**Last Updated:** November 25, 2025  
**Base URL:** `https://closetx.local/api`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Services](#api-services)
4. [Common Patterns](#common-patterns)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Swagger/OpenAPI Access](#swaggeropenapi-access)

---

## Overview

Closet-X exposes three RESTful API services:

| Service | Base Path | Port | Swagger UI |
|---------|-----------|------|------------|
| User Service | `/api/users` | 3001 | http://localhost:3001/api-docs |
| Wardrobe Service | `/api/wardrobe` | 3003 | http://localhost:3003/api-docs |
| Outfit Service | `/api/outfits` | 3002 | http://localhost:3002/api-docs |

### **API Design Principles**

- **RESTful**: Standard HTTP methods (GET, POST, PUT, DELETE)
- **JSON**: All request/response bodies in JSON format
- **Stateless**: No server-side sessions (JWT authentication)
- **Versioned**: Future-ready for API versioning (`/api/v1/`, `/api/v2/`)
- **Documented**: OpenAPI 3.0 specifications with Swagger UI

---

## Authentication

### **JWT Token Authentication**

All protected endpoints require a JWT (JSON Web Token) in the `Authorization` header.

#### **Obtaining a Token**

```http
POST /api/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDYwNDgwMH0.abc123...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

#### **Using the Token**

Include the token in the `Authorization` header for all protected requests:

```http
GET /api/wardrobe/clothing
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **Token Structure**

```javascript
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "iat": 1700000000,    // Issued at
    "exp": 1700604800     // Expires at (7 days)
  }
}
```

#### **Token Expiration**

- **Duration**: 7 days
- **Renewal**: Login again to get a new token
- **Storage**: Store securely (localStorage, secure cookie)

---

## API Services

### **1. User Service** (`/api/users`)

**Purpose**: User authentication, registration, and profile management

#### **Endpoints**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/users/register` | No | Register new user |
| POST | `/api/users/login` | No | Login and get JWT token |
| GET | `/api/users/profile` | Yes | Get user profile |
| PUT | `/api/users/profile` | Yes | Update user profile |
| PUT | `/api/users/preferences` | Yes | Update style preferences |
| PUT | `/api/users/password` | Yes | Change password |

**Swagger UI**: http://localhost:3001/api-docs

**Full Specification**: [user-service-openapi.yaml](./openapi/user-service-openapi.yaml)

---

### **2. Wardrobe Service** (`/api/wardrobe`)

**Purpose**: Clothing item management and image storage

#### **Endpoints**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/wardrobe/clothing` | Yes | Upload clothing item with photo |
| GET | `/api/wardrobe/clothing` | Yes | Get all items (with filters) |
| GET | `/api/wardrobe/clothing/:id` | Yes | Get single item |
| PUT | `/api/wardrobe/clothing/:id` | Yes | Update item |
| DELETE | `/api/wardrobe/clothing/:id` | Yes | Delete item |
| GET | `/api/wardrobe/clothing/:id/image` | Yes | Get full-size image |
| GET | `/api/wardrobe/clothing/:id/thumbnail` | Yes | Get thumbnail |
| GET | `/api/wardrobe/stats` | Yes | Get wardrobe statistics |

**Swagger UI**: http://localhost:3003/api-docs

**Full Specification**: [wardrobe-service-openapi.yaml](./openapi/wardrobe-service-openapi.yaml)

---

### **3. Outfit Service** (`/api/outfits`)

**Purpose**: Outfit generation, weather integration, and AI advice

#### **Endpoints**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/outfits/daily` | Yes | Get daily outfit recommendations |
| GET | `/api/outfits/weekly` | Yes | Get 7-day outfit forecast |
| POST | `/api/outfits/save` | Yes | Save favorite outfit |
| GET | `/api/outfits/favorites` | Yes | Get saved outfits |
| DELETE | `/api/outfits/:id` | Yes | Delete saved outfit |
| POST | `/api/outfits/ai-advice` | Yes | Get AI fashion advice |
| GET | `/api/outfits/weather` | Yes | Get current weather |

**Swagger UI**: http://localhost:3002/api-docs

**Full Specification**: [outfit-service-openapi.yaml](./openapi/outfit-service-openapi.yaml)

---

## Common Patterns

### **Standard Response Format**

#### **Success Response**

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Optional success message"
}
```

#### **Error Response**

```json
{
  "success": false,
  "error": "Error message",
  "details": {
    // Optional error details
  }
}
```

### **Pagination**

For endpoints returning lists (e.g., `/api/wardrobe/clothing`):

**Request**:
```http
GET /api/wardrobe/clothing?page=1&limit=20
```

**Response**:
```json
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### **Filtering**

Support for query parameters:

```http
GET /api/wardrobe/clothing?category=tops&color=blue&season=summer
```

**Supported Filters**:
- `category`: tops, bottoms, shoes, outerwear, accessories
- `color`: Any color name
- `season`: summer, winter, spring, fall, all
- `occasion`: casual, business, formal, athletic
- `style`: casual, formal, athletic, vintage

### **Sorting**

```http
GET /api/wardrobe/clothing?sort=createdAt&order=desc
```

**Supported Sort Fields**:
- `createdAt`: Creation date
- `updatedAt`: Last update
- `price`: Price
- `wearCount`: Number of times worn

**Sort Order**:
- `asc`: Ascending
- `desc`: Descending (default)

---

## Error Handling

### **HTTP Status Codes**

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Token valid but insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists (e.g., email) |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily down |

### **Error Response Examples**

#### **400 Bad Request**

```json
{
  "success": false,
  "error": "Invalid request data",
  "details": {
    "field": "category",
    "message": "Category must be one of: tops, bottoms, shoes, outerwear, accessories"
  }
}
```

#### **401 Unauthorized**

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "No token provided"
}
```

#### **404 Not Found**

```json
{
  "success": false,
  "error": "Not Found",
  "message": "Clothing item not found"
}
```

#### **422 Validation Error**

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Email is required"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

---

## Rate Limiting

### **Limits**

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 10 requests | 15 minutes |
| General API | 100 requests | 15 minutes |
| Image Upload | 20 uploads | 1 hour |
| AI Advice | 5 requests | 1 hour |

### **Rate Limit Headers**

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1700000000
```

### **Rate Limit Exceeded**

**Response (429)**:
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "retryAfter": 900,
  "message": "Too many requests. Please try again in 15 minutes."
}
```

---

## Swagger/OpenAPI Access

### **Local Development**

Access Swagger UI for each service:

1. **User Service**: http://localhost:3001/api-docs
2. **Wardrobe Service**: http://localhost:3003/api-docs
3. **Outfit Service**: http://localhost:3002/api-docs

### **Kubernetes Deployment**

Access via Ingress:

1. **User Service**: https://closetx.local/api/users/docs
2. **Wardrobe Service**: https://closetx.local/api/wardrobe/docs
3. **Outfit Service**: https://closetx.local/api/outfits/docs

### **OpenAPI Specifications**

Download raw OpenAPI specs:

- [user-service-openapi.yaml](./openapi/user-service-openapi.yaml)
- [wardrobe-service-openapi.yaml](./openapi/wardrobe-service-openapi.yaml)
- [outfit-service-openapi.yaml](./openapi/outfit-service-openapi.yaml)

### **Using Swagger UI**

1. Open Swagger UI URL
2. Click "Authorize" button
3. Enter JWT token: `Bearer <your-token>`
4. Click "Authorize"
5. Try out API endpoints interactively

---

## API Examples

### **Complete User Flow**

#### **1. Register**

```bash
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepass123",
    "username": "johndoe"
  }'
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "_id": "507f...",
    "email": "john@example.com",
    "username": "johndoe"
  }
}
```

#### **2. Upload Clothing**

```bash
TOKEN="eyJhbGc..."

curl -X POST http://localhost:3003/api/wardrobe/clothing \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@blue-shirt.jpg" \
  -F "category=tops" \
  -F "primaryColor=blue" \
  -F "brand=Nike"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f...",
    "category": "tops",
    "color": { "primary": "blue" },
    "imageUrl": "/gridfs/507f...",
    "thumbnailUrl": "/gridfs/507f..."
  }
}
```

#### **3. Get Daily Outfit**

```bash
curl -X POST http://localhost:3002/api/outfits/daily \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Hartford",
    "occasion": "casual",
    "includeAI": true
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "weather": {
      "temp": 72,
      "condition": "Clear"
    },
    "outfits": [
      {
        "items": [ /* clothing items */ ],
        "score": 87,
        "colorHarmony": 0.92
      }
    ],
    "aiAdvice": "Great casual outfit for mild weather..."
  }
}
```

---

## Postman Collection

Import the Postman collection for easy API testing:

**Download**: [Closet-X.postman_collection.json](./postman/Closet-X.postman_collection.json)

**Import Steps**:
1. Open Postman
2. Click "Import"
3. Select `Closet-X.postman_collection.json`
4. Collection includes all endpoints with example requests

**Environment Variables**:
- `baseUrl`: http://localhost:3001 (or your deployment URL)
- `token`: Your JWT token (set after login)

---

## API Versioning (Future)

### **Current**: Unversioned (`/api/users`, `/api/wardrobe`, `/api/outfits`)

### **Future**: Versioned routes

```
v1: /api/v1/users
v2: /api/v2/users (breaking changes)
```

**Strategy**:
- Major version changes for breaking changes
- Minor version changes backward-compatible
- Maintain old versions for 6 months

---

## GraphQL (Future Consideration)

Currently REST-only. Future enhancement could add GraphQL endpoint for more flexible queries:

```
POST /graphql

{
  user {
    profile {
      username
      wardrobe {
        items(category: "tops", limit: 10) {
          category
          color
          imageUrl
        }
      }
    }
  }
}
```

---

## WebSocket API (Future)

Real-time updates for:
- Image processing status
- AI advice generation progress
- Outfit generation notifications

```javascript
const ws = new WebSocket('wss://closetx.local/ws');

ws.on('message', (data) => {
  const event = JSON.parse(data);
  
  if (event.type === 'image.processed') {
    console.log('Image analysis complete:', event.data);
  }
});
```

---

## API Testing

### **Unit Tests**

Each service has comprehensive unit tests:

```bash
cd services/user-service
npm test
```

### **Integration Tests**

Test service-to-service communication:

```bash
cd tests/integration
npm test
```

### **End-to-End Tests**

Test complete user workflows:

```bash
cd tests/e2e
npm test
```

---

## API Performance

### **Response Times** (Target)

| Endpoint Type | Target | Acceptable |
|---------------|--------|------------|
| GET (simple) | < 50ms | < 200ms |
| GET (complex) | < 200ms | < 500ms |
| POST (no upload) | < 100ms | < 300ms |
| POST (image upload) | < 500ms | < 2s |
| AI operations | < 3s | < 10s |

### **Monitoring**

- Prometheus metrics exposed at `/metrics`
- Grafana dashboards for visualization
- Alert on p95 latency > 500ms

---

## Security Best Practices

### **API Security Checklist**

- ✅ HTTPS only (TLS 1.2+)
- ✅ JWT token authentication
- ✅ Input validation and sanitization
- ✅ Rate limiting
- ✅ CORS configured
- ✅ No sensitive data in URLs
- ✅ Error messages don't leak info
- ✅ SQL/NoSQL injection prevention
- ✅ XSS prevention
- ✅ CSRF protection

### **Data Privacy**

- Passwords hashed with bcrypt
- Tokens expire after 7 days
- No PII in logs
- Images stored securely in GridFS
- GDPR-compliant data deletion

---

## Support & Feedback

### **Issues**

Report bugs or request features:
- GitHub Issues: https://github.com/yourusername/Closet-X/issues

### **API Questions**

- Email: api-support@closetx.com
- Documentation: https://docs.closetx.com

### **Status Page**

Check API status:
- https://status.closetx.com

---

**API Documentation Version**: 1.0  
**Last Updated**: November 25, 2025  
**Maintained By**: Team Kates