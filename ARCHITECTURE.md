# Closet-X Architecture Documentation

**Version:** 1.0  
**Last Updated:** November 25, 2025  
**Team:** Team Kates (Kuany Kuany, Hanna Saffi, [Your Name])

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [System Architecture](#system-architecture)
4. [Service Architecture](#service-architecture)
5. [Data Architecture](#data-architecture)
6. [Communication Patterns](#communication-patterns)
7. [Deployment Architecture](#deployment-architecture)
8. [Security Architecture](#security-architecture)
9. [Scalability & Performance](#scalability--performance)
10. [Design Decisions](#design-decisions)

---

## System Overview

Closet-X is a cloud-native, microservices-based digital wardrobe management application deployed on Kubernetes. The system enables users to digitize their clothing collection, receive AI-powered outfit recommendations based on weather conditions, and manage their wardrobe efficiently.

### **Key Architectural Characteristics**

- **Architecture Style**: Microservices with Event-Driven Architecture (EDA)
- **Deployment Model**: Kubernetes (homelab cluster)
- **Communication**: REST APIs (synchronous) + RabbitMQ (asynchronous)
- **Data Store**: MongoDB with GridFS for images
- **Container Registry**: Harbor (private registry)
- **CI/CD**: GitHub Actions

### **Core Components**

- **3 RESTful Microservices**: User, Wardrobe, Outfit services
- **3 Background Workers**: Image Processor, Fashion Advice, Outfit Generator
- **1 Message Broker**: RabbitMQ for async communication
- **1 Database**: MongoDB (StatefulSet with persistence)
- **1 Frontend**: React SPA with Vite

---

## Architecture Principles

### **1. Microservices Independence**

Each service is:
- **Independently deployable**: Can deploy user-service without affecting wardrobe-service
- **Technology agnostic**: Services can use different languages (Node.js, Python)
- **Data ownership**: Each service owns its data and database
- **Fault isolated**: Failure in one service doesn't cascade to others

### **2. API-First Design**

- All services expose RESTful APIs
- OpenAPI/Swagger documentation for every endpoint
- Versioned APIs (future: `/api/v1/`, `/api/v2/`)
- Standardized response formats

### **3. Asynchronous Processing**

- Long-running tasks (image analysis, AI advice) processed asynchronously
- Event-driven architecture using RabbitMQ
- Decouples services and improves user experience (fast API responses)

### **4. Cloud-Native Practices**

- **12-Factor App Methodology**: Configuration via environment variables, stateless processes
- **Containerization**: All services packaged as Docker containers
- **Orchestration**: Kubernetes manages deployment, scaling, self-healing
- **Observability**: Health checks, readiness probes, structured logging

### **5. Security by Design**

- JWT-based authentication
- No hardcoded credentials (Kubernetes Secrets)
- Non-root container users
- HTTPS for external communication
- Input validation and sanitization

---

## System Architecture

### **High-Level Architecture Diagram**

```
┌───────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                          │
│                                                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    React Frontend (Vite)                     │   │
│   │   - Component-based UI                                       │   │
│   │   - React Router for navigation                              │   │
│   │   - Axios for API calls                                      │   │
│   │   - JWT token management                                     │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└───────────────────────────────┬───────────────────────────────────────┘
                                │ HTTPS / REST API
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                          KUBERNETES CLUSTER                           │
│                                                                       │
│   ┌───────────────────────────────────────────────────────────────┐  │
│   │                     Ingress Controller                        │  │
│   │   - Routes: /api/users → user-service                         │  │
│   │   - Routes: /api/wardrobe → wardrobe-service                  │  │
│   │   - Routes: /api/outfits → outfit-service                     │  │
│   │   - TLS termination                                           │  │
│   └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    APPLICATION LAYER                         │   │
│   │                                                              │   │
│   │  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │   │
│   │  │ User Service   │  │Wardrobe Service│  │Outfit Service│  │   │
│   │  │   (Node.js)    │  │   (Node.js)    │  │  (Node.js)   │  │   │
│   │  │                │  │                │  │              │  │   │
│   │  │ - Auth         │  │ - Clothing CRUD│  │ - Weather    │  │   │
│   │  │ - JWT tokens   │  │ - Image upload │  │ - Algorithms │  │   │
│   │  │ - User profile │  │ - GridFS       │  │ - AI advice  │  │   │
│   │  │ - Preferences  │  │ - Tags/filters │  │ - Favorites  │  │   │
│   │  │                │  │                │  │              │  │   │
│   │  │ Port: 3001     │  │ Port: 3003     │  │ Port: 3002   │  │   │
│   │  └────────┬───────┘  └────────┬───────┘  └──────┬───────┘  │   │
│   │           │                   │                  │          │   │
│   │           │                   │ Publishes        │          │   │
│   │           │                   │ Messages         │          │   │
│   │           │                   ▼                  │          │   │
│   └───────────┼──────────────────────────────────────┼──────────┘   │
│               │          ┌────────────────┐          │              │
│               │          │   RabbitMQ     │◄─────────┘              │
│               │          │ Message Broker │                         │
│               │          │                │                         │
│               │          │ Exchanges:     │                         │
│               │          │ - closetx_events                         │
│               │          │                │                         │
│               │          │ Queues:        │                         │
│               │          │ - image_processing_queue                 │
│               │          │ - fashion_advice_queue                   │
│               │          │ - outfit_generation_queue                │
│               │          │                │                         │
│               │          │ Port: 5672     │                         │
│               │          └────────┬───────┘                         │
│               │                   │ Consumes                        │
│               │         ┌─────────┼──────────┐                      │
│               │         │         │          │                      │
│               │    ┌────▼────┐┌──▼──────┐┌──▼──────────┐           │
│               │    │ Image   ││ Fashion ││   Outfit    │           │
│               │    │Processor││ Advice  ││  Generator  │           │
│               │    │ Worker  ││ Worker  ││   Worker    │           │
│               │    │         ││         ││             │           │
│               │    │ Google  ││ Ollama  ││ Algorithms  │           │
│               │    │Vision AI││  LLM    ││  + Weather  │           │
│               │    └─────────┘└─────────┘└─────────────┘           │
│               │                                                     │
│   ┌───────────┴─────────────────────────────────────────────────┐  │
│   │                       DATA LAYER                            │  │
│   │                                                             │  │
│   │   ┌─────────────────────────────────────────────────────┐  │  │
│   │   │              MongoDB (StatefulSet)                  │  │  │
│   │   │                                                     │  │  │
│   │   │  Databases:                                         │  │  │
│   │   │  - closetx_users      (User Service)                │  │  │
│   │   │  - closetx_wardrobe   (Wardrobe Service)            │  │  │
│   │   │  - closetx_outfits    (Outfit Service)              │  │  │
│   │   │                                                     │  │  │
│   │   │  GridFS: Image storage (photos, thumbnails)         │  │  │
│   │   │                                                     │  │  │
│   │   │  Persistent Volume: /data/db                        │  │  │
│   │   │  Port: 27017                                        │  │  │
│   │   └─────────────────────────────────────────────────────┘  │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

                        EXTERNAL SERVICES
              ┌────────────────────────────────────┐
              │  - OpenWeather API (weather data) │
              │  - Google Vision AI (image recog) │
              │  - Clarifai API (backup)          │
              │  - Ollama (local LLM)             │
              └────────────────────────────────────┘
```

---

## Service Architecture

### **1. User Service**

**Responsibility**: User authentication, authorization, and profile management

**Technology**: Node.js + Express + MongoDB

**Key Components**:
```
user-service/
├── src/
│   ├── controllers/
│   │   └── userController.js       # Request handling
│   ├── models/
│   │   └── User.js                 # Mongoose schema
│   ├── middleware/
│   │   └── auth.js                 # JWT verification
│   ├── routes/
│   │   └── userRoutes.js           # Route definitions
│   ├── utils/
│   │   └── validation.js           # Input validation
│   └── server.js                   # Express app setup
├── tests/                          # Unit & integration tests
├── Dockerfile                      # Container definition
└── package.json                    # Dependencies
```

**API Endpoints**:
- `POST /api/users/register` - Create new user account
- `POST /api/users/login` - Authenticate and get JWT token
- `GET /api/users/profile` - Get authenticated user profile
- `PUT /api/users/profile` - Update user information
- `PUT /api/users/preferences` - Update style preferences
- `PUT /api/users/password` - Change password

**Database Schema**:
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  password: String (bcrypt hashed),
  username: String,
  preferences: {
    favoriteColors: [String],
    favoriteStyles: [String],
    sizes: {
      tops: String,
      bottoms: String,
      shoes: String
    }
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Authentication Flow**:
1. User sends credentials to `/login`
2. Service validates credentials against MongoDB
3. If valid, generates JWT token (7-day expiration)
4. Token includes: `{ userId, email }`
5. Client stores token and sends in `Authorization: Bearer <token>` header
6. Other services validate token by calling user-service

### **2. Wardrobe Service**

**Responsibility**: Clothing item CRUD, image storage, and catalog management

**Technology**: Node.js + Express + MongoDB GridFS

**Key Components**:
```
wardrobe-service/
├── src/
│   ├── controllers/
│   │   └── clothingController.js   # CRUD operations
│   ├── models/
│   │   └── ClothingItem.js         # Mongoose schema
│   ├── middleware/
│   │   ├── auth.js                 # Token validation
│   │   └── upload.js               # Multer file upload
│   ├── services/
│   │   ├── gridfsService.js        # GridFS operations
│   │   └── messagingService.js     # RabbitMQ publisher
│   ├── routes/
│   │   └── clothingRoutes.js
│   └── server.js
├── tests/
├── Dockerfile
└── package.json
```

**API Endpoints**:
- `POST /api/wardrobe/clothing` - Upload clothing item with photo
- `GET /api/wardrobe/clothing` - Get all items (with filters)
- `GET /api/wardrobe/clothing/:id` - Get single item
- `PUT /api/wardrobe/clothing/:id` - Update item
- `DELETE /api/wardrobe/clothing/:id` - Delete item
- `GET /api/wardrobe/clothing/:id/image` - Download full image
- `GET /api/wardrobe/clothing/:id/thumbnail` - Download thumbnail
- `GET /api/wardrobe/stats` - Get wardrobe statistics

**Database Schema**:
```javascript
{
  _id: ObjectId,
  userId: ObjectId (indexed),
  category: String (enum: tops, bottoms, shoes, outerwear, accessories),
  color: {
    primary: String,
    secondary: [String]
  },
  brand: String,
  season: [String] (summer, winter, spring, fall, all),
  occasion: [String] (casual, business, formal, athletic),
  style: [String] (casual, formal, sporty, vintage),
  tags: [String],
  imageUrl: String (GridFS file ID),
  thumbnailUrl: String (GridFS file ID),
  aiAnalysis: {
    category: String,
    colors: [String],
    style: String,
    fabric: String,
    confidence: Number,
    analyzedAt: Date
  },
  purchaseDate: Date,
  price: Number,
  wearCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

**Image Storage Architecture**:
- **GridFS**: MongoDB's file storage system for files > 16MB
- **Chunks**: Images stored in 255KB chunks
- **Metadata**: File metadata stored separately
- **Benefits**: No dependency on external storage (S3, etc.)

**Upload Flow**:
1. Client sends multipart/form-data with image + metadata
2. Multer middleware intercepts file
3. Service validates file type/size
4. Image stored in GridFS (full resolution)
5. Thumbnail generated with Sharp (300x300)
6. Thumbnail stored in GridFS
7. Clothing document created with GridFS file IDs
8. Message published to RabbitMQ for AI analysis

### **3. Outfit Service**

**Responsibility**: Outfit generation, weather integration, AI advice coordination

**Technology**: Node.js + Express + MongoDB

**Key Components**:
```
outfit-service/
├── src/
│   ├── controllers/
│   │   └── outfitController.js     # Outfit logic
│   ├── models/
│   │   └── Outfit.js               # Saved outfits
│   ├── algorithms/
│   │   ├── colorMatching.js        # Color harmony
│   │   ├── styleMatching.js        # Style compatibility
│   │   └── outfitGenerator.js      # Main algorithm
│   ├── services/
│   │   ├── weatherService.js       # OpenWeather API
│   │   ├── wardrobeClient.js       # HTTP client
│   │   └── messagingService.js     # RabbitMQ publisher
│   ├── routes/
│   │   └── outfitRoutes.js
│   └── server.js
├── tests/
├── Dockerfile
└── package.json
```

**API Endpoints**:
- `POST /api/outfits/daily` - Get daily outfit recommendations
- `GET /api/outfits/weekly` - Get 7-day outfit forecast
- `POST /api/outfits/save` - Save favorite outfit
- `GET /api/outfits/favorites` - Get saved outfits
- `DELETE /api/outfits/:id` - Delete saved outfit
- `POST /api/outfits/ai-advice` - Request AI fashion advice
- `GET /api/outfits/weather` - Get current weather

**Core Algorithms**:

1. **Color Harmony Algorithm**:
```javascript
// Scores outfit based on color theory
calculateColorHarmony(colors) {
  // Complementary colors: opposite on color wheel
  // Analogous colors: adjacent on color wheel
  // Neutral combinations: black, white, gray, beige
  // Returns score 0.0 - 1.0
}
```

2. **Style Compatibility Algorithm**:
```javascript
// Ensures outfit styles work together
calculateStyleCoherence(styles, occasion) {
  // Business + Casual = low score
  // Casual + Casual = high score
  // Formal + Formal = high score
  // Athletic + Business = very low score
}
```

3. **Weather Appropriateness Algorithm**:
```javascript
// Matches clothing to weather conditions
calculateWeatherScore(item, weather) {
  // Temperature ranges:
  // - Cold: < 50°F (heavy outerwear, long sleeves)
  // - Cool: 50-65°F (light jacket, long sleeves)
  // - Mild: 65-75°F (short/long sleeves)
  // - Warm: 75-85°F (short sleeves, light fabrics)
  // - Hot: > 85°F (minimal, breathable)
  
  // Precipitation handling:
  // - Rain: waterproof, avoid suede/delicate
  // - Snow: boots, warm outerwear
}
```

**Outfit Generation Flow**:
1. User requests daily outfit (city, occasion)
2. Service fetches current weather from OpenWeather API
3. Service fetches user's wardrobe from wardrobe-service
4. Filter items appropriate for weather
5. Filter items appropriate for occasion
6. Generate combinations (top + bottom + shoes + optional outerwear)
7. Score each combination:
   - Color harmony: 40% weight
   - Style compatibility: 35% weight
   - Weather appropriateness: 25% weight
8. Rank by composite score
9. Return top 5 outfits
10. Optional: Request AI advice via RabbitMQ

### **4. Image Processor Worker**

**Responsibility**: Asynchronous AI-powered image analysis

**Technology**: Node.js + Google Vision API

**Queue**: `image_processing_queue`

**Routing Key**: `image.analyze`

**Processing Flow**:
```
1. Consume message from RabbitMQ
   Message format: {
     itemId: "507f...",
     userId: "507f...",
     imageUrl: "/gridfs/...",
     imageId: "gridfs_file_id"
   }

2. Fetch image from GridFS

3. Call Google Vision AI API
   Request: { image: base64_encoded_image }
   
4. Parse AI response:
   - Label Detection: category, style, occasion
   - Color Detection: dominant colors
   - Object Detection: fabric type
   
5. Update clothing item in database:
   clothingItem.aiAnalysis = {
     category: "tops",
     colors: ["blue", "white"],
     style: "casual",
     fabric: "cotton",
     confidence: 0.95,
     analyzedAt: new Date()
   }

6. Acknowledge message (remove from queue)

7. If error: reject message (requeue for retry)
```

**AI Analysis Example**:
```javascript
// Input: Photo of blue t-shirt
// Output:
{
  category: "tops",
  colors: ["blue", "white"],
  style: "casual",
  fabric: "cotton",
  occasion: ["casual", "athletic"],
  confidence: 0.95,
  labels: ["t-shirt", "clothing", "apparel", "blue"]
}
```

**Error Handling**:
- API failure: Retry 3 times with exponential backoff
- Invalid image: Mark as failed, notify user
- Database error: Requeue message

### **5. Fashion Advice Worker**

**Responsibility**: Generate AI-powered fashion advice using local LLM

**Technology**: Node.js + Ollama (llama3.2 model)

**Queue**: `fashion_advice_queue`

**Routing Key**: `fashion.advice`

**Processing Flow**:
```
1. Consume message from RabbitMQ
   Message format: {
     userId: "507f...",
     occasion: "business meeting",
     weather: { temp: 70, condition: "Clear" },
     preferences: { colors: ["blue"], styles: ["formal"] }
   }

2. Fetch user's wardrobe (up to 50 items)

3. Build context prompt:
   "You are a professional fashion stylist. The user has the following 
    clothing items: [list items]. The weather is 70°F and clear. They 
    need outfit advice for a business meeting. Their style preferences 
    are formal with blue colors. Provide 3 outfit suggestions with 
    explanations."

4. Call Ollama API:
   POST http://localhost:11434/api/generate
   {
     model: "llama3.2",
     prompt: context_prompt,
     stream: false
   }

5. Parse LLM response

6. Store advice in database

7. Return advice via reply-to queue (RPC pattern)

8. Acknowledge message
```

**Fallback Strategy**:
- Primary: Ollama (local, free)
- Fallback 1: Google Gemini API
- Fallback 2: OpenAI API
- Fallback 3: Rule-based advice (no AI)

### **6. Outfit Generator Worker**

**Responsibility**: Asynchronous outfit generation for complex requests

**Technology**: Node.js + Algorithms

**Queue**: `outfit_generation_queue`

**Routing Key**: `outfit.generate`

**Use Case**: Background processing for weekly forecasts, batch generation

**Processing Flow**:
```
1. Consume message: { userId, occasion, dateRange }

2. Fetch weather forecast (7 days)

3. Fetch user's wardrobe

4. For each day:
   - Filter weather-appropriate items
   - Generate combinations
   - Score combinations
   - Select top 3 outfits

5. Store generated outfits in database

6. Acknowledge message
```

---

## Data Architecture

### **Database Design Principles**

1. **Database-per-Service**: Each microservice has its own database
2. **No Shared Tables**: Services never directly query other services' databases
3. **API Communication**: Services communicate via REST APIs only
4. **Eventual Consistency**: Accept that data may be briefly out of sync

### **Database Structure**

```
MongoDB Instance (mongodb:27017)
├── closetx_users (User Service)
│   └── users collection
│
├── closetx_wardrobe (Wardrobe Service)
│   ├── clothingitems collection
│   ├── fs.files collection (GridFS metadata)
│   └── fs.chunks collection (GridFS chunks)
│
└── closetx_outfits (Outfit Service)
    ├── outfits collection (saved outfits)
    └── outfithistory collection (generation history)
```

### **GridFS Architecture**

**Purpose**: Store large files (images) in MongoDB

**Structure**:
```
fs.files Collection (metadata):
{
  _id: ObjectId,
  length: Number,
  chunkSize: 261120,  // 255KB
  uploadDate: Date,
  filename: String,
  contentType: "image/jpeg",
  metadata: {
    userId: ObjectId,
    itemId: ObjectId,
    type: "full" | "thumbnail"
  }
}

fs.chunks Collection (binary data):
{
  _id: ObjectId,
  files_id: ObjectId (reference to fs.files),
  n: Number (chunk number),
  data: Binary (255KB max)
}
```

**Storage Flow**:
```
User uploads 2MB JPEG
↓
Multer receives file
↓
GridFS splits into chunks:
- Chunk 0: 255KB
- Chunk 1: 255KB
- Chunk 2: 255KB
- Chunk 3: 255KB
- Chunk 4: 255KB
- Chunk 5: 255KB
- Chunk 6: 255KB
- Chunk 7: 229KB (remainder)
↓
Stored across fs.files + fs.chunks
↓
Return file ID to application
```

### **Data Consistency Strategy**

**Scenario**: User deletes clothing item

**Problem**: Item might be referenced in saved outfits

**Solution**: Eventual consistency with cleanup
```
1. Wardrobe Service deletes item
2. Wardrobe Service publishes event: { type: "item.deleted", itemId: "..." }
3. Outfit Service consumes event
4. Outfit Service removes item from all saved outfits
5. Outfit Service marks outfits as "needs_refresh"
```

---

## Communication Patterns

### **1. Synchronous Communication (REST APIs)**

**Use Case**: Real-time data retrieval, immediate responses

**Pattern**: HTTP Request/Response

**Example**: Frontend fetches user profile
```
Frontend → User Service
GET /api/users/profile
Authorization: Bearer eyJhbG...
↓
User Service queries MongoDB
↓
Response: { userId, email, username, preferences }
```

**Advantages**:
- Simple to implement
- Immediate response
- Easy to debug

**Disadvantages**:
- Tight coupling
- Cascading failures
- Performance bottleneck

### **2. Asynchronous Communication (Message Queue)**

**Use Case**: Long-running tasks, decoupled operations

**Pattern**: Publish/Subscribe via RabbitMQ

**Example**: Image analysis
```
Wardrobe Service → RabbitMQ → Image Processor Worker

1. User uploads image
2. Wardrobe Service stores image in GridFS
3. Wardrobe Service publishes message:
   {
     exchange: "closetx_events",
     routingKey: "image.analyze",
     message: { itemId, userId, imageUrl }
   }
4. RabbitMQ queues message
5. Image Processor Worker consumes message
6. Worker processes image (3-5 seconds)
7. Worker updates database
8. Worker acknowledges message
```

**Advantages**:
- Loose coupling
- Fault tolerance (messages persist)
- Scalability (multiple workers)
- Better user experience (fast API response)

**Disadvantages**:
- Complexity
- Eventual consistency
- Debugging harder

### **3. Service-to-Service Communication**

**Pattern**: REST API calls between services

**Example**: Outfit Service needs wardrobe items
```
Outfit Service → Wardrobe Service

GET http://wardrobe-service:3003/api/wardrobe/clothing?userId=507f...
Authorization: Bearer <internal-token>
↓
Wardrobe Service validates token
↓
Wardrobe Service queries database
↓
Response: { success: true, data: [items...] }
```

**Security**: Services share internal authentication mechanism

### **4. RabbitMQ Architecture**

**Exchange**: `closetx_events` (type: topic)

**Queues**:
- `image_processing_queue` (bound to `image.analyze`)
- `fashion_advice_queue` (bound to `fashion.advice`)
- `outfit_generation_queue` (bound to `outfit.generate`)

**Message Flow**:
```
Producer (Wardrobe Service)
  ↓
  publishes message with routing key
  ↓
Exchange (closetx_events)
  ↓
  routes based on routing key
  ↓
Queue (image_processing_queue)
  ↓
  message persists (durable queue)
  ↓
Consumer (Image Processor Worker)
  ↓
  processes message
  ↓
  acknowledges (removes from queue)
```

**Durability**:
- Queues: Durable (survive RabbitMQ restart)
- Messages: Persistent (written to disk)
- Acknowledgment: Manual (only after successful processing)

**Dead Letter Queue**:
- Failed messages after 3 retries → dead letter queue
- Manual inspection and reprocessing

---

## Deployment Architecture

### **Kubernetes Architecture**

```
Kubernetes Cluster (homelab)
├── Namespace: closetx
├── ConfigMap: closetx-config (environment variables)
├── Secret: harbor-registry (Docker registry credentials)
├── Secret: api-keys (OpenWeather, Google Vision)
│
├── Deployments:
│   ├── user-service (replicas: 2)
│   ├── wardrobe-service (replicas: 2)
│   ├── outfit-service (replicas: 2)
│   ├── image-processor (replicas: 1)
│   ├── fashion-advice (replicas: 1)
│   └── outfit-generator (replicas: 1)
│
├── StatefulSet:
│   └── mongodb (replicas: 1, persistent volume)
│
├── Deployment:
│   └── rabbitmq (replicas: 1)
│
├── Services (ClusterIP):
│   ├── user-service:3001
│   ├── wardrobe-service:3003
│   ├── outfit-service:3002
│   ├── mongodb:27017
│   └── rabbitmq:5672
│
└── Ingress:
    └── closetx-ingress
        ├── /api/users → user-service
        ├── /api/wardrobe → wardrobe-service
        └── /api/outfits → outfit-service
```

### **Container Architecture**

**Multi-Stage Dockerfile Example** (user-service):
```dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build (if TypeScript)
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY . .
RUN npm ci
RUN npm run build

# Stage 3: Production
FROM node:18-alpine
WORKDIR /app

# Non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./

USER nodejs

EXPOSE 3001

CMD ["node", "dist/server.js"]
```

### **Resource Limits**

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### **Health Checks**

**Liveness Probe**: Is the container alive?
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 3
```

**Readiness Probe**: Is the container ready to accept traffic?
```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5
```

### **Horizontal Pod Autoscaling**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: outfit-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: outfit-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## Security Architecture

### **1. Authentication & Authorization**

**JWT Token Structure**:
```javascript
{
  header: {
    alg: "HS256",
    typ: "JWT"
  },
  payload: {
    userId: "507f1f77bcf86cd799439011",
    email: "user@example.com",
    iat: 1700000000,
    exp: 1700604800  // 7 days
  },
  signature: HMACSHA256(
    base64UrlEncode(header) + "." + base64UrlEncode(payload),
    JWT_SECRET
  )
}
```

**Token Flow**:
1. User logs in → receives JWT token
2. Frontend stores token (localStorage)
3. Frontend sends token in every request: `Authorization: Bearer <token>`
4. Service validates token signature
5. Service extracts userId from payload
6. Service uses userId to fetch user-specific data

### **2. Secrets Management**

**Kubernetes Secrets**:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: api-keys
  namespace: closetx
type: Opaque
stringData:
  OPENWEATHER_API_KEY: "75b4246..."
  GOOGLE_VISION_API_KEY: "AIzaSyAF..."
  JWT_SECRET: "your-secret-key"
  MONGO_PASSWORD: "secure-password"
```

**Environment Variable Injection**:
```yaml
env:
- name: OPENWEATHER_API_KEY
  valueFrom:
    secretKeyRef:
      name: api-keys
      key: OPENWEATHER_API_KEY
```

### **3. Network Security**

**Network Policies**: Restrict pod-to-pod communication
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: wardrobe-service-policy
spec:
  podSelector:
    matchLabels:
      app: wardrobe-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: outfit-service
    ports:
    - protocol: TCP
      port: 3003
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: mongodb
    ports:
    - protocol: TCP
      port: 27017
```

### **4. Container Security**

- **Non-root users**: All containers run as user ID 1001
- **Read-only root filesystem**: Prevents container modification
- **No privileged mode**: Containers can't access host resources
- **Security scanning**: Harbor scans images for vulnerabilities

---

## Scalability & Performance

### **1. Horizontal Scaling**

**Services**: Can scale to multiple replicas
```bash
kubectl scale deployment outfit-service --replicas=5
```

**Workers**: Can scale to handle message queue load
```bash
kubectl scale deployment image-processor --replicas=3
```

**Load Balancing**: Kubernetes Service distributes traffic across replicas

### **2. Vertical Scaling**

**Resource Adjustment**: Increase CPU/memory for pods
```yaml
resources:
  requests:
    memory: "512Mi"  # increased from 256Mi
    cpu: "200m"      # increased from 100m
  limits:
    memory: "1Gi"    # increased from 512Mi
    cpu: "1000m"     # increased from 500m
```

### **3. Performance Optimizations**

**Database Indexing**:
```javascript
// User Service
userSchema.index({ email: 1 }, { unique: true });

// Wardrobe Service
clothingSchema.index({ userId: 1 });
clothingSchema.index({ userId: 1, category: 1 });
clothingSchema.index({ userId: 1, 'color.primary': 1 });

// Outfit Service
outfitSchema.index({ userId: 1, createdAt: -1 });
```

**Caching Strategy**:
- Weather data: Cache for 30 minutes (reduces API calls)
- User preferences: Cache in memory (reduces DB queries)
- Wardrobe items: No caching (always fetch fresh data)

**Image Optimization**:
- Original: Store as uploaded
- Thumbnail: Resize to 300x300, compress to 80% quality
- Lazy loading: Load thumbnails first, full images on demand

### **4. Bottleneck Analysis**

**Potential Bottlenecks**:
1. **MongoDB**: Single instance (can add replica set)
2. **GridFS**: Large images slow down queries (mitigated with thumbnails)
3. **RabbitMQ**: Single instance (can add cluster)
4. **External APIs**: Rate limits (handled with caching + fallbacks)

**Monitoring**:
- Response times: Track API latency
- Queue depth: Monitor RabbitMQ queue sizes
- Error rates: Track 4xx/5xx responses
- Resource usage: CPU/memory per pod

---

## Design Decisions

### **Decision 1: MongoDB vs PostgreSQL**

**Chosen**: MongoDB

**Rationale**:
- **Flexible schema**: Clothing items have varying attributes (some have brand, some don't)
- **GridFS**: Built-in file storage eliminates need for S3
- **JSON documents**: Natural fit for API responses
- **Horizontal scaling**: Easy sharding for future growth

**Trade-offs**:
- Less rigid data integrity (no foreign keys)
- Eventual consistency in some scenarios
- Larger storage footprint than PostgreSQL

### **Decision 2: RabbitMQ vs Kafka**

**Chosen**: RabbitMQ

**Rationale**:
- **Simplicity**: Easier to set up and manage
- **Low latency**: Better for our use case (not streaming data)
- **Message acknowledgment**: Exactly-once delivery semantics
- **Mature ecosystem**: Well-documented, stable

**Trade-offs**:
- Lower throughput than Kafka (not an issue for our scale)
- No built-in data retention (messages deleted after consumption)

### **Decision 3: Microservices vs Monolith**

**Chosen**: Microservices

**Rationale**:
- **Course requirement**: Demonstrate cloud-native architecture
- **Independent scaling**: Scale outfit-service independently during peak usage
- **Technology flexibility**: Use Python for AI worker, Node.js for services
- **Team parallelization**: Three team members can work independently

**Trade-offs**:
- **Complexity**: More moving parts, harder to debug
- **Network latency**: Inter-service calls add overhead
- **Data consistency**: Eventual consistency requires careful design

### **Decision 4: Ollama (Local LLM) vs OpenAI API**

**Chosen**: Ollama with fallback to OpenAI

**Rationale**:
- **Cost**: Ollama is free (important for student project)
- **Privacy**: User data stays local
- **Latency**: Local processing faster than API calls
- **Learning**: Experience deploying local ML models

**Trade-offs**:
- Lower quality responses than GPT-4
- Requires more resources (CPU/RAM)
- Need fallback for production reliability

### **Decision 5: GridFS vs S3**

**Chosen**: GridFS

**Rationale**:
- **Simplicity**: No external service to manage
- **Cost**: No AWS costs
- **Transactions**: Images and metadata in same database
- **Homelab deployment**: Works without internet

**Trade-offs**:
- MongoDB size increases significantly
- Slower than S3 for large files
- No built-in CDN

### **Decision 6: JWT vs Session Tokens**

**Chosen**: JWT

**Rationale**:
- **Stateless**: No session storage needed
- **Microservices**: Services can validate tokens independently
- **Scalability**: No shared session state
- **Standard**: Well-supported libraries

**Trade-offs**:
- Can't revoke tokens before expiration
- Larger payload than session IDs
- Token refresh complexity

---

## Future Architecture Considerations

### **Potential Enhancements**

1. **API Gateway**: Add Kong or Ambassador for centralized routing
2. **Service Mesh**: Implement Istio for advanced traffic management
3. **Caching Layer**: Add Redis for session management and caching
4. **Event Sourcing**: Store all state changes as events
5. **CQRS**: Separate read and write models for better performance
6. **GraphQL**: Replace REST APIs for more flexible data fetching
7. **Distributed Tracing**: Add Jaeger for request tracing
8. **Metrics**: Implement Prometheus + Grafana for monitoring

### **Scalability Roadmap**

**Current**: 100 users, 10 req/sec
**Phase 1**: 1,000 users, 100 req/sec
- Add MongoDB replica set
- Scale services to 3-5 replicas
- Add Redis caching layer

**Phase 2**: 10,000 users, 1,000 req/sec
- Implement API Gateway
- Add CDN for images
- Migrate to managed MongoDB (Atlas)
- Add message queue clustering

**Phase 3**: 100,000+ users, 10,000+ req/sec
- Multi-region deployment
- Event-driven architecture
- Microservices split into nanoservices
- Machine learning recommendation engine

---

## Appendix

### **Technology Versions**

- Node.js: 18 LTS
- MongoDB: 6.0
- RabbitMQ: 3.12
- Kubernetes: 1.28
- React: 18
- Docker: 24.0

### **External API Documentation**

- OpenWeather API: https://openweathermap.org/api
- Google Vision AI: https://cloud.google.com/vision/docs
- Ollama: https://ollama.ai/docs

### **Related Documentation**

- [README.md](README.md) - Project overview
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Detailed database schemas
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API specifications
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Kubernetes deployment
- [TECHNICAL_DECISIONS.md](TECHNICAL_DECISIONS.md) - Architecture decisions

---

**Document Status**: Complete  
**Review Date**: December 1, 2025  
**Maintained By**: Team Kates