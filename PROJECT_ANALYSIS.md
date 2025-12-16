# Closet-X Project Analysis for Presentation

## Table of Contents
1. [Kubernetes Resources Overview](#1-kubernetes-resources-overview)
2. [Finding and Locating Resources](#2-finding-and-locating-resources)
3. [Monitoring History & Status](#3-monitoring-history--status)
4. [MongoDB Configuration & Integration](#4-mongodb-configuration--integration)
5. [Microservices Connectivity](#5-microservices-connectivity)
6. [CI/CD Pipeline (GitHub Actions)](#6-cicd-pipeline-github-actions)
7. [Presentation Key Points](#7-presentation-key-points)

---

## 1. Kubernetes Resources Overview

### 1.1 Namespace
**Location**: `k8s/gke/00-namespace.yaml` or `k8s/homelab/00-namespace.yaml`

```yaml
Namespace: kates-closetx
```

All resources are deployed in this namespace.

### 1.2 Pods (Deployments)

| Pod/Deployment | Replicas | Port | Image |
|----------------|----------|------|-------|
| `user-service` | 2 | 3001 | harbor.javajon.duckdns.org/library/user-service:v8.0.8 |
| `wardrobe-service` | 2 | 3003 | harbor.javajon.duckdns.org/library/wardrobe-service:v8.0.8 |
| `outfit-service` | 2 | 3002 | harbor.javajon.duckdns.org/library/outfit-service:v8.0.8 |
| `ai-advice-service` | 2 | 3004 | harbor.javajon.duckdns.org/library/ai-advice-service:v8.0.8 |
| `image-processor` | 1 | N/A | harbor.javajon.duckdns.org/library/image-processor:v8.0.8 |
| `outfit-generator` | 1 | N/A | harbor.javajon.duckdns.org/library/outfit-generator:v8.0.8 |
| `fashion-advice` | 1 | N/A | harbor.javajon.duckdns.org/library/fashion-advice:v8.0.8 |
| `frontend` | 1 | 80 | harbor.javajon.duckdns.org/library/frontend:v8.0.8 |
| `mongodb` | 1 (StatefulSet) | 27017 | mongo:4.4 |

**File Locations**:
- `k8s/gke/04-user-service.yaml`
- `k8s/gke/05-wardrobe-service.yaml`
- `k8s/gke/06-outfit-service.yaml`
- `k8s/gke/07-ai-advice-service.yaml`
- `k8s/gke/08-image-processor.yaml`
- `k8s/gke/09-outfit-generator.yaml`
- `k8s/gke/10-fashion-advice.yaml`
- `k8s/gke/13-frontend.yaml`
- `k8s/gke/03-mongodb.yaml`

### 1.3 Services (ClusterIP)

| Service Name | Port | Target Port | Type |
|--------------|------|-------------|------|
| `user-service` | 3001 | 3001 | ClusterIP |
| `wardrobe-service` | 3003 | 3003 | ClusterIP |
| `outfit-service` | 3002 | 3002 | ClusterIP |
| `ai-advice-service` | 3004 | 3004 | ClusterIP |
| `mongodb-service` | 27017 | 27017 | ClusterIP (Headless) |
| `frontend` | 80 | 80 | ClusterIP |

**Internal DNS Names** (how services communicate):
```
user-service.kates-closetx.svc.cluster.local:3001
wardrobe-service.kates-closetx.svc.cluster.local:3003
outfit-service.kates-closetx.svc.cluster.local:3002
ai-advice-service.kates-closetx.svc.cluster.local:3004
mongodb-service.kates-closetx.svc.cluster.local:27017
rabbitmq.rabbitmq.svc.cluster.local:5672
```

### 1.4 ConfigMap

**Name**: `closetx-config`
**Location**: `k8s/gke/02-config-secrets.yaml`

```yaml
data:
  RABBITMQ_URL: "amqp://guest:guest@rabbitmq.rabbitmq.svc.cluster.local:5672"
  RABBITMQ_USER: "admin"
  USER_SERVICE_URL: "http://user-service.kates-closetx.svc.cluster.local:3001"
  WARDROBE_SERVICE_URL: "http://wardrobe-service.kates-closetx.svc.cluster.local:3003"
  OUTFIT_SERVICE_URL: "http://outfit-service.kates-closetx.svc.cluster.local:3002"
  AI_SERVICE_URL: "http://ai-advice-service.kates-closetx.svc.cluster.local:3004"
  MONGODB_HOST: "mongodb-service.kates-closetx.svc.cluster.local"
  JWT_EXPIRE: "7d"
  NODE_ENV: "production"
  WEATHER_PROVIDER: "openweather"
```

### 1.5 Secrets

**Name**: `closetx-secrets`
**Location**: `k8s/gke/02-config-secrets.yaml`

```yaml
stringData:
  # MongoDB credentials
  MONGODB_ROOT_USERNAME: "closetxuser"
  MONGODB_ROOT_PASSWORD: "supersecurepassword123"
  
  # Service-specific MongoDB URIs
  USER_SERVICE_MONGODB_URI: "mongodb://user_service:service_password_123@mongodb-service..."
  WARDROBE_SERVICE_MONGODB_URI: "mongodb://wardrobe_service:service_password_123@mongodb-service..."
  OUTFIT_SERVICE_MONGODB_URI: "mongodb://outfit_service:service_password_123@mongodb-service..."
  
  # API Keys
  JWT_SECRET: "closetx-super-secret-production-key-change-me-12345678"
  OPENWEATHER_API_KEY: "75b4246ff3ecccbef11f5cdc6ed5341f"
  GOOGLE_VISION_API_KEY: "AIzaSyAF2pdB28_C2wYSQl-JtDY4v4Io2z7OgkI"
  REMOVEBG_API_KEY: "47xDFqrQNEqUqetxtPLi7JL2"
  OPENAI_API_KEY: ""
  GEMINI_API_KEY: ""
```

### 1.6 Ingress

**Name**: `closetx-ingress`
**Location**: `k8s/gke/11-ingress.yaml`

```yaml
Routes:
  /api/auth     → user-service:3001
  /api/wardrobe → wardrobe-service:3003
  /api/daily-outfit → outfit-service:3002
  /api/outfits  → outfit-service:3002
  /api/ai       → ai-advice-service:3004
  /             → frontend:80 (catch-all)
```

**External URL**: `http://kates-closetx.javajon.duckdns.org`

### 1.7 Horizontal Pod Autoscaler (HPA)

**Location**: `k8s/gke/12-hpa.yaml`

| HPA Name | Min | Max | CPU Target | Memory Target |
|----------|-----|-----|------------|---------------|
| `user-service-hpa` | 2 | 5 | 70% | 80% |
| `wardrobe-service-hpa` | 2 | 5 | 70% | 80% |
| `outfit-service-hpa` | 2 | 5 | 70% | 80% |
| `ai-advice-service-hpa` | 2 | 10 | 70% | 80% |
| `image-processor-hpa` | 1 | 5 | 80% | 85% |
| `outfit-generator-hpa` | 1 | 5 | 80% | - |
| `fashion-advice-hpa` | 1 | 5 | 80% | - |

---

## 2. Finding and Locating Resources

### 2.1 Kubernetes Resources Location

```
k8s/
├── namespaces.yaml              # Namespace definition
├── README.md                    # K8s documentation
├── gke/                         # Google Kubernetes Engine configs
│   ├── 00-namespace.yaml        # Namespace
│   ├── 02-config-secrets.yaml   # ConfigMap + Secrets
│   ├── 03-mongodb.yaml          # MongoDB StatefulSet + Service
│   ├── 04-user-service.yaml     # User Service Deployment + Service
│   ├── 05-wardrobe-service.yaml # Wardrobe Service
│   ├── 06-outfit-service.yaml   # Outfit Service
│   ├── 07-ai-advice-service.yaml# AI Advice Service
│   ├── 08-image-processor.yaml  # Image Processor Worker
│   ├── 09-outfit-generator.yaml # Outfit Generator Worker
│   ├── 10-fashion-advice.yaml   # Fashion Advice Worker
│   ├── 11-ingress.yaml          # Ingress Routes
│   ├── 12-hpa.yaml              # Horizontal Pod Autoscalers
│   └── 13-frontend.yaml         # Frontend Deployment
├── homelab/                     # Same structure for homelab cluster
└── infrastructure/
    ├── mongodb.yaml             # Alternative MongoDB config
    └── rabbitmq.yaml            # RabbitMQ Deployment
```

### 2.2 How to View Resources in Cluster

```bash
# List all pods
kubectl get pods -n kates-closetx

# List all services
kubectl get services -n kates-closetx

# List configmaps
kubectl get configmaps -n kates-closetx

# List secrets
kubectl get secrets -n kates-closetx

# List deployments
kubectl get deployments -n kates-closetx

# List ingress
kubectl get ingress -n kates-closetx

# List HPAs
kubectl get hpa -n kates-closetx

# Get all resources in namespace
kubectl get all -n kates-closetx
```

---

## 3. Monitoring History & Status

### 3.1 GitHub Actions - View CI/CD History

**Location**: `.github/workflows/ci-cd.yml`

**To view history**:
1. Go to GitHub repository: `https://github.com/HannaSaffi/Closet-X`
2. Click on **"Actions"** tab
3. View all workflow runs with status (✓ success, ✗ failed, ⏳ running)

**URL for Actions**: `https://github.com/HannaSaffi/Closet-X/actions`

### 3.2 Checking Pod Status & History

```bash
# Get current pod status
kubectl get pods -n kates-closetx

# Get pod details (events, status)
kubectl describe pod <pod-name> -n kates-closetx

# Get pod logs
kubectl logs <pod-name> -n kates-closetx

# Get logs from previous crashed container
kubectl logs <pod-name> -n kates-closetx --previous

# Watch pods in real-time
kubectl get pods -n kates-closetx -w

# Get events (shows failures)
kubectl get events -n kates-closetx --sort-by='.lastTimestamp'
```

### 3.3 Identifying Failed Pods

```bash
# List pods not in Running state
kubectl get pods -n kates-closetx --field-selector=status.phase!=Running

# Get pods with restart count > 0
kubectl get pods -n kates-closetx -o wide

# Check for CrashLoopBackOff
kubectl get pods -n kates-closetx | grep -E "CrashLoop|Error|Pending"
```

### 3.4 CI/CD Pipeline Stages

The GitHub Actions workflow has these stages:

1. **Testing Jobs** (Run in parallel):
   - `test-user-service`
   - `test-wardrobe-service`
   - `test-outfit-service`
   - `test-ai-service`
   - `test-image-processor`
   - `test-outfit-generator`
   - `test-fashion-advice`
   - `test-frontend`

2. **Build & Push** (After all tests pass):
   - Build Docker images for all 8 services
   - Push to Harbor registry: `harbor.javajon.duckdns.org`

3. **Deploy to Kubernetes** (Only on main branch):
   - Apply namespace
   - Apply configs/secrets
   - Deploy MongoDB
   - Deploy services
   - Deploy workers
   - Deploy frontend
   - Deploy ingress
   - Deploy HPAs

4. **Smoke Tests**:
   - Health check user-service
   - Health check wardrobe-service

---

## 4. MongoDB Configuration & Integration

### 4.1 MongoDB Installation (Kubernetes)

**Type**: StatefulSet (for persistent storage)
**Image**: `mongo:4.4`
**Location**: `k8s/gke/03-mongodb.yaml`

```yaml
StatefulSet:
  name: mongodb
  replicas: 1
  storage: 5Gi PersistentVolumeClaim
  ports: 27017
```

### 4.2 MongoDB Databases

Each microservice has its own database:

| Database | Service | User |
|----------|---------|------|
| `closetx_users` | user-service | user_service |
| `closetx_wardrobe` | wardrobe-service | wardrobe_service |
| `closetx_outfits` | outfit-service | outfit_service |
| `closetx_ai` | ai-advice-service | ai_service |

### 4.3 MongoDB Connection Strings

```
# User Service
mongodb://user_service:service_password_123@mongodb-service.kates-closetx.svc.cluster.local:27017/closetx_users?authSource=admin

# Wardrobe Service
mongodb://wardrobe_service:service_password_123@mongodb-service.kates-closetx.svc.cluster.local:27017/closetx_wardrobe?authSource=admin

# Outfit Service
mongodb://outfit_service:service_password_123@mongodb-service.kates-closetx.svc.cluster.local:27017/closetx_outfits?authSource=admin
```

### 4.4 MongoDB Initialization Script

**Location**: `k8s/gke/03-mongodb.yaml` (embedded ConfigMap)

Creates users for each service on startup:
```javascript
db.createUser({
  user: 'user_service',
  pwd: 'service_password_123',
  roles: [{ role: 'readWrite', db: 'closetx_users' }]
});
// ... similar for other services
```

### 4.5 Checking MongoDB Status

```bash
# Check MongoDB pod
kubectl get pods -n kates-closetx -l app=mongodb

# Get MongoDB logs
kubectl logs mongodb-0 -n kates-closetx

# Connect to MongoDB shell
kubectl exec -it mongodb-0 -n kates-closetx -- mongosh -u closetxuser -p supersecurepassword123 --authenticationDatabase admin

# Show databases
use closetx_users
db.getCollectionNames()
```

---

## 5. Microservices Connectivity

### 5.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│                      (React + Vite, Port 80)                            │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │      NGINX INGRESS        │
                    │   kates-closetx.javajon   │
                    └─────────────┬─────────────┘
                                  │
        ┌─────────────┬───────────┼───────────┬─────────────┐
        │             │           │           │             │
        ▼             ▼           ▼           ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ USER SERVICE │ │  WARDROBE    │ │   OUTFIT     │ │  AI-ADVICE   │
│   :3001      │ │   SERVICE    │ │   SERVICE    │ │   SERVICE    │
│              │ │    :3003     │ │    :3002     │ │    :3004     │
│ - Auth/Login │ │ - Clothing   │ │ - Outfits    │ │ - AI Chat    │
│ - JWT Tokens │ │ - Images     │ │ - Weather    │ │ - Gemini     │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │                │
       │                │                │                │
       └────────────────┴────────┬───────┴────────────────┘
                                 │
                         ┌───────▼───────┐
                         │   MONGODB     │
                         │   :27017      │
                         │               │
                         │ closetx_users │
                         │ closetx_wardrobe│
                         │ closetx_outfits │
                         │ closetx_ai    │
                         └───────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          MESSAGE QUEUE (RabbitMQ)                       │
│                              :5672 / :15672                             │
│                                                                         │
│  Queues:                                                                │
│  - image_processing_queue   (image analysis jobs)                       │
│  - fashion_advice_queue     (AI advice requests)                        │
│  - outfit_generation_queue  (outfit generation jobs)                    │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  IMAGE PROCESSOR │    │  FASHION ADVICE  │    │ OUTFIT GENERATOR │
│     WORKER       │    │     WORKER       │    │     WORKER       │
│                  │    │                  │    │                  │
│ - Google Vision  │    │ - Ollama LLM     │    │ - Color Matching │
│ - Clarifai       │    │ - Gemini API     │    │ - Style Matching │
│ - RemoveBG       │    │ - OpenAI API     │    │ - Algorithms     │
└──────────────────┘    └──────────────────┘    └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL APIs                                   │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ OpenWeather │  │Google Vision│  │   Gemini    │  │  OpenAI     │   │
│  │     API     │  │     API     │  │     API     │  │    API      │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 RabbitMQ Connectivity

**Location**: `k8s/infrastructure/rabbitmq.yaml` and `shared/config/rabbitmq.js`

**Connection URL**: 
```
amqp://guest:guest@rabbitmq.rabbitmq.svc.cluster.local:5672
```

**Queues**:
| Queue Name | Purpose | Consumer |
|------------|---------|----------|
| `image_processing_queue` | Process uploaded images | image-processor worker |
| `fashion_advice_queue` | Generate AI fashion advice | fashion-advice worker |
| `outfit_generation_queue` | Generate outfit combinations | outfit-generator worker |

**Message Flow**:
1. **Wardrobe Service** → `image_processing_queue` (when user uploads photo)
2. **Outfit Service** → `fashion_advice_queue` (when user requests AI advice)
3. **Outfit Service** → `outfit_generation_queue` (for batch outfit generation)

### 5.3 Weather API Connectivity (OpenWeather)

**API Key Location**: `k8s/gke/02-config-secrets.yaml`
```yaml
OPENWEATHER_API_KEY: "75b4246ff3ecccbef11f5cdc6ed5341f"
```

**Used By**: `outfit-service`

**Endpoints Called**:
```
https://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}
https://api.openweathermap.org/data/2.5/forecast?q={city}&appid={API_KEY}
```

### 5.4 AI Services Connectivity

#### Google Gemini API
**Location**: `k8s/gke/02-config-secrets.yaml`
```yaml
GEMINI_API_KEY: ""  # Not configured
GOOGLE_GEMINI_API_KEY: ""
```
**Used By**: `ai-advice-service`
**Status**: API keys not populated (using fallback)

#### OpenAI API
**Location**: `k8s/gke/02-config-secrets.yaml`
```yaml
OPENAI_API_KEY: ""  # Not configured
```
**Used By**: `ai-advice-service` (fallback)
**Status**: API key not populated

#### Ollama (Local LLM)
**Used By**: `fashion-advice worker`
**Model**: llama3.2
**Status**: Primary AI provider (free, local)

### 5.5 Image Processing APIs

#### Google Vision API
```yaml
GOOGLE_VISION_API_KEY: "AIzaSyAF2pdB28_C2wYSQl-JtDY4v4Io2z7OgkI"
```
**Used By**: `image-processor worker`
**Purpose**: Automatic clothing categorization, color detection

#### Clarifai API
```yaml
CLARIFAI_PAT: ""  # Not configured
```
**Used By**: `image-processor worker` (backup)

#### RemoveBG API
```yaml
REMOVEBG_API_KEY: "47xDFqrQNEqUqetxtPLi7JL2"
```
**Used By**: `image-processor worker`
**Purpose**: Remove background from clothing photos

### 5.6 Service-to-Service Communication

```
outfit-service → wardrobe-service
  URL: http://wardrobe-service.kates-closetx.svc.cluster.local:3003
  Purpose: Get user's clothing items for outfit generation

outfit-service → ai-advice-service
  URL: http://ai-advice-service.kates-closetx.svc.cluster.local:3004
  Purpose: Get AI-powered fashion advice

All Services → user-service
  URL: http://user-service.kates-closetx.svc.cluster.local:3001
  Purpose: JWT token validation
```

---

## 6. CI/CD Pipeline (GitHub Actions)

### 6.1 Workflow File

**Location**: `.github/workflows/ci-cd.yml`

### 6.2 Pipeline Stages

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TRIGGER: Push to main/develop                     │
│                    TRIGGER: Pull Request to main/develop             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         TESTING (Parallel)                          │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │test-user-   │  │test-wardrobe│  │test-outfit- │  │test-ai-     │ │
│  │service      │  │-service     │  │service      │  │service      │ │
│  │(npm test)   │  │(npm test)   │  │(npm test)   │  │(pytest)     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │test-image-  │  │test-outfit- │  │test-fashion │  │test-        │ │
│  │processor    │  │generator    │  │-advice      │  │frontend     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                          (All tests must pass)
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BUILD & PUSH (Matrix Strategy)                   │
│                                                                     │
│  For each service:                                                  │
│  1. Setup Docker Buildx                                             │
│  2. Login to Harbor Registry                                        │
│  3. Build Docker image                                              │
│  4. Push to: harbor.javajon.duckdns.org/library/{service}:v8.0.8   │
│                                                                     │
│  Services: user-service, wardrobe-service, outfit-service,          │
│            ai-advice-service, image-processor, outfit-generator,    │
│            fashion-advice, frontend                                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                          (Only on main branch)
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DEPLOY TO KUBERNETES                           │
│                                                                     │
│  1. Configure kubectl with cluster credentials                      │
│  2. kubectl apply -f k8s/homelab/00-namespace.yaml                  │
│  3. kubectl apply -f k8s/homelab/02-config-secrets.yaml             │
│  4. kubectl apply -f k8s/homelab/03-mongodb.yaml                    │
│  5. Wait for MongoDB ready                                          │
│  6. kubectl apply services (04-07)                                  │
│  7. kubectl apply workers (08-10)                                   │
│  8. kubectl apply frontend (13)                                     │
│  9. kubectl apply ingress (11)                                      │
│  10. kubectl apply HPA (12)                                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SMOKE TESTS                                 │
│                                                                     │
│  curl http://user-service:3001/health                               │
│  curl http://wardrobe-service:3003/health                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        NOTIFICATIONS                                │
│                                                                     │
│  Success: "🎉 CI/CD Pipeline Completed Successfully!"               │
│  Failure: "❌ CI/CD Pipeline Failed"                                │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Viewing Pipeline History

**GitHub URL**: `https://github.com/HannaSaffi/Closet-X/actions`

| Status | Meaning |
|--------|---------|
| ✅ Green | All stages passed |
| ❌ Red | One or more stages failed |
| 🟡 Yellow | Pipeline in progress |
| ⏭️ Skipped | Conditional stage not executed |

---

## 7. Presentation Key Points

### 7.1 Architecture Highlights

1. **Microservices Architecture**
   - 4 main services + 3 background workers
   - Each service has its own database (Database-per-Service pattern)
   - Services communicate via REST APIs and RabbitMQ

2. **Event-Driven Architecture**
   - RabbitMQ for asynchronous processing
   - Message queues decouple services
   - Workers process heavy tasks in background

3. **Cloud-Native Practices**
   - Containerized with Docker
   - Orchestrated with Kubernetes
   - Auto-scaling with HPA
   - CI/CD with GitHub Actions

### 7.2 Key Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Database | MongoDB | Flexible schema, GridFS for images |
| Message Queue | RabbitMQ | Simple, reliable, low latency |
| AI Provider | Ollama (local) | Free, private, no API costs |
| Container Registry | Harbor | Private, self-hosted |
| Orchestration | Kubernetes | Industry standard, auto-scaling |

### 7.3 Data Flow Examples

**User Uploads Clothing Photo**:
```
Frontend → Wardrobe Service → GridFS (store image)
                           → RabbitMQ (image_processing_queue)
                           → Image Processor Worker
                           → Google Vision API
                           → Update MongoDB with AI analysis
```

**User Requests Daily Outfit**:
```
Frontend → Outfit Service → OpenWeather API (get weather)
                         → Wardrobe Service (get clothes)
                         → Apply algorithms (color, style, weather)
                         → Return top 5 outfits
```

### 7.4 Scalability Features

- **Horizontal Pod Autoscaling**: Services scale from 2-10 replicas
- **Stateless Services**: Any replica can handle any request
- **Database Separation**: Each service scales independently
- **Message Queues**: Workers scale based on queue depth

### 7.5 Security Features

- **JWT Authentication**: All API calls require valid token
- **Kubernetes Secrets**: No hardcoded credentials
- **Non-root Containers**: Security best practice
- **Network Policies**: Service-to-service isolation

### 7.6 External API Dependencies

| API | Purpose | Status |
|-----|---------|--------|
| OpenWeather | Weather data | ✅ Active |
| Google Vision | Image analysis | ✅ Active |
| Gemini/OpenAI | AI advice | ⚠️ No keys configured |
| RemoveBG | Background removal | ✅ Active |
| Ollama | Local LLM | ✅ Primary AI |

### 7.7 Commands for Demo

```bash
# Show all running pods
kubectl get pods -n kates-closetx

# Show services
kubectl get svc -n kates-closetx

# Show ingress
kubectl get ingress -n kates-closetx

# Show HPA status
kubectl get hpa -n kates-closetx

# Show logs of a service
kubectl logs -f deployment/outfit-service -n kates-closetx

# Scale a service
kubectl scale deployment outfit-service --replicas=5 -n kates-closetx

# Check events
kubectl get events -n kates-closetx --sort-by='.lastTimestamp'
```

### 7.8 Application URL

**Production**: `http://kates-closetx.javajon.duckdns.org`

---

## Summary

This Closet-X project demonstrates a complete cloud-native microservices architecture with:

- **8 containerized services** deployed on Kubernetes
- **MongoDB** as the primary database with GridFS for image storage
- **RabbitMQ** for asynchronous message processing
- **Multiple AI integrations** (Google Vision, Ollama, optional OpenAI/Gemini)
- **Weather API integration** for smart outfit recommendations
- **Complete CI/CD pipeline** with GitHub Actions
- **Auto-scaling** with Horizontal Pod Autoscalers
- **Secure configuration** with Kubernetes ConfigMaps and Secrets

The system follows cloud-native best practices including the 12-factor app methodology, microservices independence, and event-driven architecture.
