# 🧥 Closet-X: AI-Powered Digital Wardrobe

**A cloud-native microservices application for intelligent wardrobe management and outfit recommendations**

[![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=flat&logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=flat&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
- [Services](#-services)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Monitoring](#-monitoring)
- [Team](#-team)

---

## 🎯 Overview

**Closet-X** is a comprehensive digital wardrobe management application built with cloud-native principles. It helps users organize their clothing, get AI-powered outfit recommendations based on weather and occasion, and discover new styling possibilities from their existing wardrobe.

### **Core Value Proposition**

> **"What Should I Wear Today?"** - Get personalized, AI-powered outfit recommendations that consider weather, occasion, and your personal style preferences.

### **Key Differentiators**

- 🤖 **AI-Powered Analysis**: Automatic clothing categorization and color/style detection using Google Vision AI
- 🌤️ **Weather Integration**: Real-time weather-based outfit suggestions using OpenWeather API
- 🎨 **Smart Algorithms**: Color harmony and style compatibility matching
- ☁️ **Cloud-Native**: Built with microservices architecture, deployed on Kubernetes
- 🔄 **Asynchronous Processing**: RabbitMQ message queues for scalable background tasks

---

## ✨ Features

### **User Features**

- **Digital Wardrobe Management**
  - Upload clothing photos with automatic AI categorization
  - Organize items by category, color, season, brand
  - Track purchase dates, prices, and wear frequency
  - Add custom tags and notes

- **Intelligent Outfit Recommendations**
  - Daily outfit suggestions based on weather
  - Color harmony and style compatibility analysis
  - Occasion-specific outfit filtering (casual, business, formal, athletic)
  - AI-powered fashion advice using local LLM (Ollama)

- **Weather Integration**
  - Real-time weather data from OpenWeather API
  - 7-day forecast for weekly outfit planning
  - Temperature-appropriate clothing recommendations
  - Precipitation alerts and rain gear suggestions

- **User Preferences**
  - Customizable style preferences
  - Favorite outfits and combinations
  - Preferred colors and styles
  - Size and fit preferences

### **Technical Features**

- **Microservices Architecture**: 4 independent services with clear boundaries
- **Message Queues**: Asynchronous processing with RabbitMQ
- **Container Orchestration**: Kubernetes deployment with auto-scaling
- **Image Storage**: MongoDB GridFS for efficient image management
- **API Gateway**: Centralized routing and authentication
- **CI/CD Pipeline**: Automated testing and deployment
- **Monitoring**: Health checks and logging

---

## 🏗️ Architecture

### **System Architecture Diagram**

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     React Frontend                            │  │
│  │              (Vite + Tailwind CSS)                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ HTTPS
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        KUBERNETES CLUSTER                           │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      Ingress Controller                       │  │
│  │                    (Nginx / Traefik)                          │  │
│  └───────────────────┬──────────────────────────────────────────┘  │
│                      │                                             │
│         ┌────────────┴────────────┬────────────┬──────────────┐   │
│         │                         │            │              │   │
│  ┌──────▼──────┐          ┌──────▼──────┐   ┌─▼─────────┐  ┌─▼────────┐
│  │   User      │          │  Wardrobe   │   │  Outfit   │  │  API     │
│  │   Service   │◄────────►│   Service   │◄──┤  Service  │  │ Gateway  │
│  │  (Node.js)  │          │  (Node.js)  │   │ (Node.js) │  │(Optional)│
│  │   :3001     │          │    :3003    │   │   :3002   │  └──────────┘
│  └─────────────┘          └──────┬──────┘   └─────┬─────┘
│        │                         │                 │
│        │                         │ Publishes       │
│        │                         ▼                 │
│        │              ┌──────────────────┐         │
│        │              │    RabbitMQ      │         │
│        │              │   Message Broker │         │
│        │              │     :5672        │         │
│        │              └────────┬─────────┘         │
│        │                       │ Consumes          │
│        │         ┌─────────────┼─────────────┐     │
│        │         │             │             │     │
│        │    ┌────▼────┐  ┌────▼────┐  ┌────▼────┐│
│        │    │ Image   │  │ Fashion │  │ Outfit  ││
│        │    │Processor│  │ Advice  │  │Generator││
│        │    │ Worker  │  │ Worker  │  │ Worker  ││
│        │    └─────────┘  └─────────┘  └─────────┘│
│        │                                          │
│        └──────────┬───────────────────────────────┘
│                   │
│         ┌─────────▼──────────┐
│         │     MongoDB        │
│         │   (StatefulSet)    │
│         │  GridFS + Replica  │
│         │      :27017        │
│         └────────────────────┘
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

                        EXTERNAL SERVICES
                    ┌────────────────────┐
                    │  OpenWeather API   │
                    │  Google Vision AI  │
                    │  Clarifai API      │
                    └────────────────────┘
```

### **Service Communication**

```
User Registration/Login:
Frontend → User Service → MongoDB

Upload Clothing Photo:
Frontend → Wardrobe Service → GridFS → RabbitMQ → Image Processor Worker → Google Vision AI

Request Daily Outfit:
Frontend → Outfit Service → Weather API → RabbitMQ → Outfit Generator Worker → MongoDB

Get Fashion Advice:
Frontend → Outfit Service → RabbitMQ → Fashion Advice Worker (Ollama) → MongoDB
```

### **Microservices Architecture Principles**

- ✅ **Service Independence**: Each service has its own database and can be deployed independently
- ✅ **API-First Design**: All communication via RESTful APIs
- ✅ **Async Processing**: Heavy tasks (image analysis, AI) processed asynchronously via RabbitMQ
- ✅ **Stateless Services**: Services don't maintain session state (enables horizontal scaling)
- ✅ **Decoupled Communication**: Services communicate via APIs and message queues, not direct calls

---

## 🛠️ Technology Stack

### **Frontend**
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **State Management**: React Hooks (useState, useEffect, useContext)
- **HTTP Client**: Axios
- **Routing**: React Router v6

### **Backend Services**
- **Runtime**: Node.js 18 LTS
- **Framework**: Express.js
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Image Processing**: Multer, Sharp
- **Testing**: Jest, Supertest

### **Workers**
- **Message Queue**: RabbitMQ (amqplib)
- **AI/ML**: 
  - Google Vision API (image recognition)
  - Clarifai API (backup image analysis)
  - Ollama (local LLM for fashion advice)

### **Database**
- **Primary Database**: MongoDB 6.0
- **Image Storage**: MongoDB GridFS
- **ODM**: Mongoose
- **Deployment**: StatefulSet with persistent volumes

### **External APIs**
- **Weather**: OpenWeather API (Current & 7-day forecast)
- **Image Recognition**: Google Vision AI, Clarifai
- **AI Model**: Ollama (llama3.2 model)

### **Infrastructure**
- **Container Runtime**: Docker 24.0
- **Orchestration**: Kubernetes 1.28
- **Registry**: Harbor (private registry)
- **CI/CD**: GitHub Actions
- **Reverse Proxy**: Nginx Ingress Controller

### **Development Tools**
- **Version Control**: Git + GitHub
- **API Testing**: Postman
- **Code Editor**: VS Code
- **Linting**: ESLint
- **Formatting**: Prettier

---

## 🚀 Getting Started

### **Prerequisites**

- Node.js 18+ and npm
- Docker Desktop (with Kubernetes enabled)
- kubectl CLI tool
- MongoDB 6.0+
- RabbitMQ 3.12+
- Git

### **Environment Variables**

Create `.env` files in each service directory:

#### **User Service (.env)**
```bash
# Server
PORT=3001
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/closetx_users

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_URL=http://localhost:5173
```

#### **Wardrobe Service (.env)**
```bash
# Server
PORT=3003
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/closetx_wardrobe

# User Service
USER_SERVICE_URL=http://localhost:3001

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# Google Vision API
GOOGLE_VISION_API_KEY=your-google-vision-api-key

# CORS
FRONTEND_URL=http://localhost:5173
```

#### **Outfit Service (.env)**
```bash
# Server
PORT=3002
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/closetx_outfits

# User Service
USER_SERVICE_URL=http://localhost:3001

# Wardrobe Service
WARDROBE_SERVICE_URL=http://localhost:3003

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# OpenWeather API
OPENWEATHER_API_KEY=your-openweather-api-key

# Google Gemini (for AI advice)
GOOGLE_API_KEY=your-google-gemini-api-key

# Ollama (local LLM)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# CORS
FRONTEND_URL=http://localhost:5173
```

### **Local Development Setup**

#### **1. Clone the Repository**

```bash
git clone https://github.com/yourusername/Closet-X.git
cd Closet-X
```

#### **2. Install Dependencies**

```bash
# Install all service dependencies
cd services/user-service && npm install
cd ../wardrobe-service && npm install
cd ../outfit-service && npm install

# Install worker dependencies
cd ../../workers/image-processor && npm install
cd ../fashion-advice && npm install
cd ../outfit-generator && npm install

# Install frontend dependencies
cd ../../frontend && npm install
```

#### **3. Start MongoDB**

```bash
# Using Docker
docker run -d -p 27017:27017 --name closetx-mongodb mongo:6.0

# Or using local MongoDB
mongod --dbpath /path/to/data/db
```

#### **4. Start RabbitMQ**

```bash
# Using Docker
docker run -d -p 5672:5672 -p 15672:15672 --name closetx-rabbitmq rabbitmq:3-management

# Access management UI: http://localhost:15672
# Login: guest / guest
```

#### **5. Start Services (in separate terminals)**

```bash
# Terminal 1: User Service
cd services/user-service
npm run dev

# Terminal 2: Wardrobe Service
cd services/wardrobe-service
npm run dev

# Terminal 3: Outfit Service
cd services/outfit-service
npm run dev

# Terminal 4: Workers
cd workers/image-processor
npm start

cd workers/fashion-advice
npm start

cd workers/outfit-generator
npm start
```

#### **6. Start Frontend**

```bash
cd frontend
npm run dev

# Access: http://localhost:5173
```

### **Docker Compose (Recommended for Development)**

```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

---

## 📦 Services

### **1. User Service** (Port 3001)

**Purpose**: User authentication, registration, and profile management

**Endpoints**:
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login and get JWT token
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/preferences` - Update style preferences
- `PUT /api/users/password` - Change password

**Database**: `closetx_users`

**Key Features**:
- JWT-based authentication
- bcrypt password hashing (10 salt rounds)
- User preferences (colors, styles, sizes)
- Token expiration (7 days)

### **2. Wardrobe Service** (Port 3003)

**Purpose**: Clothing item management and image storage

**Endpoints**:
- `POST /api/wardrobe/clothing` - Upload clothing item with photo
- `GET /api/wardrobe/clothing` - Get all clothing items (with filters)
- `GET /api/wardrobe/clothing/:id` - Get single item
- `PUT /api/wardrobe/clothing/:id` - Update clothing item
- `DELETE /api/wardrobe/clothing/:id` - Delete item
- `GET /api/wardrobe/clothing/:id/image` - Get full-size image
- `GET /api/wardrobe/clothing/:id/thumbnail` - Get thumbnail
- `GET /api/wardrobe/stats` - Get wardrobe statistics

**Database**: `closetx_wardrobe`

**Key Features**:
- MongoDB GridFS for image storage
- Automatic thumbnail generation
- AI image analysis via RabbitMQ
- Category, color, season filtering
- Tag-based organization

### **3. Outfit Service** (Port 3002)

**Purpose**: Outfit generation, weather integration, and AI advice

**Endpoints**:
- `POST /api/outfits/daily` - Get daily outfit recommendations
- `GET /api/outfits/weekly` - Get 7-day outfit forecast
- `POST /api/outfits/save` - Save favorite outfit
- `GET /api/outfits/favorites` - Get saved outfits
- `POST /api/outfits/ai-advice` - Get AI fashion advice
- `GET /api/outfits/weather` - Get current weather

**Database**: `closetx_outfits`

**Key Features**:
- Real-time weather integration (OpenWeather API)
- Color harmony algorithm
- Style compatibility matching
- Occasion-based filtering
- AI-powered advice (Ollama LLM)

### **4. Image Processor Worker**

**Purpose**: Asynchronous image analysis using Google Vision AI

**Queue**: `image_processing_queue`

**Routing Key**: `image.analyze`

**Process**:
1. Receives message when user uploads clothing photo
2. Calls Google Vision AI for analysis
3. Extracts: category, colors, style, fabric, occasion
4. Updates clothing item in database with AI metadata
5. Acknowledges message completion

**Key Features**:
- Automatic categorization (tops, bottoms, shoes, etc.)
- Multi-color detection
- Style classification (casual, formal, athletic)
- Occasion suggestions
- 92%+ confidence threshold

### **5. Fashion Advice Worker**

**Purpose**: Generate personalized fashion advice using local LLM

**Queue**: `fashion_advice_queue`

**Routing Key**: `fashion.advice`

**Process**:
1. Receives fashion advice request
2. Queries user's wardrobe from database
3. Builds context with preferences and occasion
4. Sends prompt to Ollama (llama3.2)
5. Returns AI-generated fashion advice

**Key Features**:
- Local LLM (no API costs)
- Personalized based on wardrobe
- Considers user preferences
- Context-aware suggestions

### **6. Outfit Generator Worker**

**Purpose**: Generate outfit combinations with advanced algorithms

**Queue**: `outfit_generation_queue`

**Routing Key**: `outfit.generate`

**Process**:
1. Receives outfit generation request
2. Fetches user's clothing items
3. Applies color harmony algorithm
4. Checks style compatibility
5. Filters by weather appropriateness
6. Ranks outfits by composite score
7. Returns top N suggestions

**Algorithms**:
- **Color Harmony**: Complementary, analogous, neutral matching
- **Style Compatibility**: Formal/casual grouping, compatibility scores
- **Weather Scoring**: Temperature-appropriate weight/fabric
- **Composite Scoring**: Weighted average of all factors

---

## 📚 API Documentation

### **Authentication**

All protected endpoints require JWT token in Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

### **User Service API**

#### **Register User**

```http
POST /api/users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "username": "johndoe"
}

Response: 201 Created
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

#### **Login**

```http
POST /api/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}

Response: 200 OK
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

### **Wardrobe Service API**

#### **Upload Clothing Item**

```http
POST /api/wardrobe/clothing
Authorization: Bearer <token>
Content-Type: multipart/form-data

- file: <image file>
- category: "tops"
- primaryColor: "blue"
- brand: "Nike"
- season: "summer,spring"

Response: 201 Created
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "userId": "507f1f77bcf86cd799439011",
    "category": "tops",
    "color": {
      "primary": "blue",
      "secondary": []
    },
    "imageUrl": "/gridfs/507f1f77bcf86cd799439013",
    "thumbnailUrl": "/gridfs/507f1f77bcf86cd799439014",
    "aiAnalysis": null,  // Will be populated by worker
    "createdAt": "2024-11-25T19:00:00.000Z"
  }
}
```

#### **Get All Clothing Items**

```http
GET /api/wardrobe/clothing?category=tops&color=blue&season=summer
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "count": 5,
  "total": 50,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "category": "tops",
      "color": { "primary": "blue" },
      "imageUrl": "/gridfs/...",
      "aiAnalysis": {
        "category": "tops",
        "colors": ["blue", "white"],
        "style": "casual",
        "confidence": 0.95
      }
    }
  ]
}
```

### **Outfit Service API**

#### **Get Daily Outfit**

```http
POST /api/outfits/daily
Authorization: Bearer <token>
Content-Type: application/json

{
  "city": "Hartford",
  "occasion": "casual",
  "includeAI": true
}

Response: 200 OK
{
  "success": true,
  "data": {
    "weather": {
      "temp": 72,
      "condition": "Clear",
      "description": "clear sky",
      "city": "Hartford"
    },
    "outfits": [
      {
        "items": [
          {
            "_id": "...",
            "category": "tops",
            "color": { "primary": "blue" },
            "imageUrl": "..."
          },
          {
            "_id": "...",
            "category": "bottoms",
            "color": { "primary": "black" },
            "imageUrl": "..."
          }
        ],
        "score": 87,
        "colorHarmony": 0.92,
        "styleMatch": 0.88,
        "weatherScore": 0.85
      }
    ],
    "aiAdvice": "Based on the weather, I recommend..."
  }
}
```

#### **Get Weekly Forecast**

```http
GET /api/outfits/weekly?city=Hartford
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "date": "2024-11-26",
      "weather": {
        "temp": 68,
        "condition": "Clouds"
      },
      "outfit": { ... },
      "recommendations": ["Light jacket recommended"]
    }
  ]
}
```

---

## 🧪 Testing

### **Test Coverage**

```
Overall Coverage: 28.33%

User Service:    64% coverage, 163 tests
Wardrobe Service: (Not shown in current stats)
Outfit Service:  28% coverage, 138 tests

Controllers:     97% coverage ✅
Algorithms:      42% coverage
Services:        27% coverage
```

### **Running Tests**

```bash
# Run all tests with coverage
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- outfit.test.js

# Run tests with verbose output
npm test -- --verbose

# Generate coverage report
npm test -- --coverage
```

### **Test Structure**

```
services/
  user-service/
    tests/
      auth.test.js              # Authentication tests
      user-logic.test.js        # Business logic tests
      controller-real.test.js   # Integration tests
  
  wardrobe-service/
    tests/
      clothing.test.js
      gridfs.test.js
      integration.test.js
  
  outfit-service/
    tests/
      outfit.test.js            # 39 tests
      outfit-logic.test.js      # 48 tests
      outfit-controller-real.test.js  # 13 tests
      colorMatching-real.test.js     # 80 tests
      styleMatching-real.test.js     # 70 tests
```

### **Test Examples**

```javascript
// Integration Test Example
describe('Outfit Controller - Real Source Code Tests', () => {
  test('should generate daily outfit successfully', async () => {
    const mockReq = {
      user: { userId: 'user123', email: 'test@example.com' },
      body: { city: 'New York' }
    };
    const mockRes = {
      json: jest.fn(),
      status: jest.fn(() => mockRes)
    };
    
    await controller.getDailyOutfit(mockReq, mockRes);
    
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          weather: expect.any(Object),
          outfits: expect.any(Array)
        })
      })
    );
  });
});
```

---

## 🚢 Deployment

### **Kubernetes Deployment**

#### **Prerequisites**

- Kubernetes cluster (1.28+)
- kubectl configured
- Harbor registry access
- MongoDB StatefulSet
- RabbitMQ deployment

#### **Namespace Setup**

```bash
# Create namespace
kubectl create namespace closetx

# Create Harbor registry secret
kubectl create secret docker-registry harbor-registry \
  --docker-server=harbor.javajon.duckdns.org \
  --docker-username=your-username \
  --docker-password=your-password \
  --namespace closetx
```

#### **Create ConfigMap**

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: closetx-config
  namespace: closetx
data:
  OPENWEATHER_API_KEY: "75b4246ff3ecccbef11f5cdc6ed5341f"
  GOOGLE_VISION_API_KEY: "AIzaSyAF2pdB28_C2wYSQl-JtDY4v4Io2z7OgkI"
  FRONTEND_URL: "http://closetx.local"
  NODE_ENV: "production"
EOF
```

#### **Deploy MongoDB**

```bash
kubectl apply -f k8s/mongodb-statefulset.yaml
kubectl apply -f k8s/mongodb-service.yaml
```

#### **Deploy RabbitMQ**

```bash
kubectl apply -f k8s/rabbitmq-deployment.yaml
kubectl apply -f k8s/rabbitmq-service.yaml
```

#### **Deploy Services**

```bash
# User Service
kubectl apply -f k8s/user-service-deployment.yaml
kubectl apply -f k8s/user-service-service.yaml

# Wardrobe Service
kubectl apply -f k8s/wardrobe-service-deployment.yaml
kubectl apply -f k8s/wardrobe-service-service.yaml

# Outfit Service
kubectl apply -f k8s/outfit-service-deployment.yaml
kubectl apply -f k8s/outfit-service-service.yaml
```

#### **Deploy Workers**

```bash
kubectl apply -f k8s/image-processor-deployment.yaml
kubectl apply -f k8s/fashion-advice-deployment.yaml
kubectl apply -f k8s/outfit-generator-deployment.yaml
```

#### **Deploy Ingress**

```bash
kubectl apply -f k8s/ingress.yaml
```

### **Scaling**

```bash
# Scale outfit service
kubectl scale deployment outfit-service --replicas=3 -n closetx

# Scale workers
kubectl scale deployment image-processor --replicas=2 -n closetx

# Auto-scaling (HPA)
kubectl autoscale deployment outfit-service \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n closetx
```

### **CI/CD Pipeline**

#### **GitHub Actions Workflow**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Kubernetes

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker images
        run: |
          docker build -t harbor.javajon.duckdns.org/kates/user-service:${{ github.sha }} services/user-service
          docker build -t harbor.javajon.duckdns.org/kates/wardrobe-service:${{ github.sha }} services/wardrobe-service
          docker build -t harbor.javajon.duckdns.org/kates/outfit-service:${{ github.sha }} services/outfit-service
      
      - name: Push to Harbor
        run: |
          docker login harbor.javajon.duckdns.org -u ${{ secrets.HARBOR_USERNAME }} -p ${{ secrets.HARBOR_PASSWORD }}
          docker push harbor.javajon.duckdns.org/kates/user-service:${{ github.sha }}
          docker push harbor.javajon.duckdns.org/kates/wardrobe-service:${{ github.sha }}
          docker push harbor.javajon.duckdns.org/kates/outfit-service:${{ github.sha }}
      
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/user-service user-service=harbor.javajon.duckdns.org/kates/user-service:${{ github.sha }} -n closetx
          kubectl set image deployment/wardrobe-service wardrobe-service=harbor.javajon.duckdns.org/kates/wardrobe-service:${{ github.sha }} -n closetx
          kubectl set image deployment/outfit-service outfit-service=harbor.javajon.duckdns.org/kates/outfit-service:${{ github.sha }} -n closetx
```

---

## 📊 Monitoring

### **Health Checks**

```bash
# Check service health
kubectl get pods -n closetx

# Check service logs
kubectl logs -f deployment/outfit-service -n closetx

# Check RabbitMQ
kubectl port-forward svc/rabbitmq 15672:15672 -n closetx
# Access: http://localhost:15672

# Check MongoDB
kubectl exec -it mongodb-0 -n closetx -- mongosh
```

### **Metrics**

```bash
# Get resource usage
kubectl top pods -n closetx
kubectl top nodes

# Get deployment status
kubectl get deployments -n closetx
kubectl describe deployment outfit-service -n closetx
```

### **RabbitMQ Monitoring**

Access RabbitMQ Management UI:
```bash
kubectl port-forward svc/rabbitmq 15672:15672 -n closetx
```

Navigate to: http://localhost:15672
- **Username**: guest
- **Password**: guest

**Key Metrics to Monitor**:
- Queue depth (messages ready)
- Consumer count
- Message rate (publish/deliver)
- Unacknowledged messages
- Connection status

---

## 👥 Team

### **Team Kates**

- **[Your Name]** - Project Lead, Database Design, Testing, Kubernetes Deployment
- **Kuany Kuany** - CI/CD Pipeline, DevOps
- **Hanna Saffi** - AI Integration, Workers

### **Course Information**

- **Course**: CPSC 415 - Building Cloud Native Apps
- **Semester**: Fall 2024
- **University**: [Your University Name]
- **Presentation Date**: December 2, 2025

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenWeather API** for weather data
- **Google Vision AI** for image recognition
- **Ollama** for local LLM capabilities
- **Harbor** for private container registry
- **Kubernetes** community for excellent documentation

---

## 📞 Contact

For questions or support, please contact:
- **Email**: [your-email@example.com]
- **GitHub Issues**: [https://github.com/yourusername/Closet-X/issues]

---

## 🗺️ Roadmap

### **Future Enhancements**

- [ ] Mobile app (React Native)
- [ ] Social features (share outfits, follow users)
- [ ] Virtual try-on using AR
- [ ] Outfit calendar and planning
- [ ] Shopping recommendations
- [ ] Sustainability tracking (cost per wear)
- [ ] Style analytics and insights
- [ ] Integration with clothing brands
- [ ] Machine learning for better recommendations
- [ ] Multi-language support

---

**Built with ❤️ by Team Kates**