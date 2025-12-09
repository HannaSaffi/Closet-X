# 🔨 Build Instructions

This guide covers building all Docker containers for the Closet-X project and pushing them to the Harbor registry.

---

## 📋 Prerequisites

### Required Tools
- **Docker**: Version 24.0+ with BuildKit enabled
- **Docker Buildx**: For multi-platform builds
- **Harbor Account**: Access to harbor.javajon.duckdns.org
- **Git**: For cloning the repository

### Harbor Registry Credentials

**Registry URL:** `harbor.javajon.duckdns.org`

**Credentials:**
- Username: `robot$library+developer`
- Password: Found in `homelab-harbor-credentials.txt`

---

## 🏗️ Project Containers

Closet-X consists of **7 containerized services**:

1. **frontend** - React application (Vite + Tailwind)
2. **user-service** - Authentication & user management
3. **wardrobe-service** - Clothing item management  
4. **outfit-service** - Outfit recommendations
5. **image-processor** - Background image analysis worker
6. **outfit-generator** - Background outfit generation worker
7. **fashion-advice** - Background AI fashion advice worker

---

## 🔐 Harbor Registry Setup

### Login to Harbor

```bash
# Login to Harbor registry
docker login harbor.javajon.duckdns.org

Username: robot$library+developer
Password: [paste from homelab-harbor-credentials.txt]
```

**Verify Login:**
```bash
cat ~/.docker/config.json | grep harbor
# Should show harbor.javajon.duckdns.org in auth
```

### Registry Structure

All images are pushed to the `library` project:
```
harbor.javajon.duckdns.org/library/
├── frontend:v3.4.x
├── user-service:v1.0.x
├── wardrobe-service:v1.0.x
├── outfit-service:v3.4.x
├── image-processor:v1.0.x
├── outfit-generator:v1.0.x
└── fashion-advice:v1.0.x
```

---

## 🛠️ Building Individual Containers

### Frontend (React Application)

**Dockerfile Location:** `frontend/Dockerfile`

**Build Command:**
```bash
docker buildx build \
  --platform linux/amd64 \
  -f frontend/Dockerfile \
  -t harbor.javajon.duckdns.org/library/frontend:v3.4.6 \
  --push \
  frontend
```

**What It Does:**
1. Uses Node 18 Alpine base image
2. Installs dependencies (npm install)
3. Builds production bundle (npm run build)
4. Serves via Nginx on port 80

**Environment Variables (set at runtime):**
- `VITE_API_URL` - Backend API endpoint

**Image Size:** ~150 MB

---

### User Service

**Dockerfile Location:** `services/user-service/Dockerfile`

**Build Command:**
```bash
docker buildx build \
  --platform linux/amd64 \
  -f services/user-service/Dockerfile \
  -t harbor.javajon.duckdns.org/library/user-service:v1.0.5 \
  --push \
  services/user-service
```

**What It Does:**
1. Uses Node 18 Alpine
2. Installs production dependencies
3. Exposes port 3001
4. Runs Node.js Express server

**Runtime Environment Variables:**
- `PORT` - Server port (default: 3001)
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT tokens
- `JWT_EXPIRES_IN` - Token expiration (default: 7d)

**Image Size:** ~200 MB

---

### Wardrobe Service

**Dockerfile Location:** `services/wardrobe-service/Dockerfile`

**Build Command:**
```bash
docker buildx build \
  --platform linux/amd64 \
  -f services/wardrobe-service/Dockerfile \
  -t harbor.javajon.duckdns.org/library/wardrobe-service:v1.0.5 \
  --push \
  services/wardrobe-service
```

**What It Does:**
1. Uses Node 18 Alpine
2. Installs dependencies including Sharp for image processing
3. Exposes port 3003
4. Connects to MongoDB GridFS for image storage

**Runtime Environment Variables:**
- `PORT` - Server port (default: 3003)
- `MONGO_URI` - MongoDB connection string
- `USER_SERVICE_URL` - User service endpoint
- `RABBITMQ_URL` - RabbitMQ connection
- `REMOVE_BG_API_KEY` - Background removal API key

**Image Size:** ~250 MB (includes Sharp libraries)

---

### Outfit Service

**Dockerfile Location:** `services/outfit-service/Dockerfile`

**Build Command:**
```bash
docker buildx build \
  --platform linux/amd64 \
  -f services/outfit-service/Dockerfile \
  -t harbor.javajon.duckdns.org/library/outfit-service:v3.4.3 \
  --push \
  services/outfit-service
```

**What It Does:**
1. Uses Node 18 Alpine
2. Installs dependencies
3. Exposes port 3002
4. Integrates with OpenWeather API

**Runtime Environment Variables:**
- `PORT` - Server port (default: 3002)
- `MONGO_URI` - MongoDB connection string
- `USER_SERVICE_URL` - User service endpoint
- `WARDROBE_SERVICE_URL` - Wardrobe service endpoint
- `RABBITMQ_URL` - RabbitMQ connection
- `OPENWEATHER_API_KEY` - Weather API key
- `GOOGLE_API_KEY` - Google Gemini API key (optional)

**Image Size:** ~200 MB

---

### Image Processor Worker

**Dockerfile Location:** `workers/image-processor/Dockerfile`

**Build Command:**
```bash
docker buildx build \
  --platform linux/amd64 \
  -f workers/image-processor/Dockerfile \
  -t harbor.javajon.duckdns.org/library/image-processor:v1.0.3 \
  --push \
  workers/image-processor
```

**What It Does:**
1. Background worker consuming RabbitMQ queue
2. Processes uploaded clothing images
3. Calls Google Vision API for analysis
4. Updates MongoDB with AI metadata

**Runtime Environment Variables:**
- `MONGO_URI` - MongoDB connection string
- `RABBITMQ_URL` - RabbitMQ connection
- `GOOGLE_VISION_API_KEY` - Google Vision API credentials

**Image Size:** ~180 MB

---

### Outfit Generator Worker

**Dockerfile Location:** `workers/outfit-generator/Dockerfile`

**Build Command:**
```bash
docker buildx build \
  --platform linux/amd64 \
  -f workers/outfit-generator/Dockerfile \
  -t harbor.javajon.duckdns.org/library/outfit-generator:v1.0.3 \
  --push \
  workers/outfit-generator
```

**What It Does:**
1. Background worker for outfit generation
2. Implements color harmony algorithms
3. Style compatibility matching
4. Weather-appropriate recommendations

**Runtime Environment Variables:**
- `MONGO_URI` - MongoDB connection string
- `RABBITMQ_URL` - RabbitMQ connection
- `OPENWEATHER_API_KEY` - Weather API key

**Image Size:** ~180 MB

---

### Fashion Advice Worker

**Dockerfile Location:** `workers/fashion-advice/Dockerfile`

**Build Command:**
```bash
docker buildx build \
  --platform linux/amd64 \
  -f workers/fashion-advice/Dockerfile \
  -t harbor.javajon.duckdns.org/library/fashion-advice:v1.0.3 \
  --push \
  workers/fashion-advice
```

**What It Does:**
1. Background worker for AI fashion advice
2. Uses Ollama (llama3.2) for natural language
3. Generates personalized styling suggestions

**Runtime Environment Variables:**
- `MONGO_URI` - MongoDB connection string
- `RABBITMQ_URL` - RabbitMQ connection
- `OLLAMA_BASE_URL` - Ollama server URL (optional)
- `OLLAMA_MODEL` - Model name (default: llama3.2)

**Image Size:** ~180 MB

---

## 🚀 Build All Containers (Automated)

### Using build-and-push.sh Script

The repository includes a helper script to build and push all containers:

```bash
#!/bin/bash
# build-and-push.sh

# Set version
VERSION="v3.4.6"

# Login to Harbor
docker login harbor.javajon.duckdns.org

# Build and push all services
docker buildx build --platform linux/amd64 \
  -f frontend/Dockerfile \
  -t harbor.javajon.duckdns.org/library/frontend:$VERSION \
  --push frontend

docker buildx build --platform linux/amd64 \
  -f services/user-service/Dockerfile \
  -t harbor.javajon.duckdns.org/library/user-service:$VERSION \
  --push services/user-service

docker buildx build --platform linux/amd64 \
  -f services/wardrobe-service/Dockerfile \
  -t harbor.javajon.duckdns.org/library/wardrobe-service:$VERSION \
  --push services/wardrobe-service

docker buildx build --platform linux/amd64 \
  -f services/outfit-service/Dockerfile \
  -t harbor.javajon.duckdns.org/library/outfit-service:$VERSION \
  --push services/outfit-service

docker buildx build --platform linux/amd64 \
  -f workers/image-processor/Dockerfile \
  -t harbor.javajon.duckdns.org/library/image-processor:$VERSION \
  --push workers/image-processor

docker buildx build --platform linux/amd64 \
  -f workers/outfit-generator/Dockerfile \
  -t harbor.javajon.duckdns.org/library/outfit-generator:$VERSION \
  --push workers/outfit-generator

docker buildx build --platform linux/amd64 \
  -f workers/fashion-advice/Dockerfile \
  -t harbor.javajon.duckdns.org/library/fashion-advice:$VERSION \
  --push workers/fashion-advice

echo "✅ All containers built and pushed successfully!"
```

**Usage:**
```bash
chmod +x build-and-push.sh
./build-and-push.sh
```

**Estimated Build Time:**
- All containers: ~15-20 minutes (first build)
- Incremental builds: ~3-5 minutes

---

## 📦 Version Tagging Strategy

### Semantic Versioning

Format: `vMAJOR.MINOR.PATCH`

**Examples:**
- `v1.0.0` - Initial release
- `v1.0.1` - Bug fix
- `v1.1.0` - New feature (backward compatible)
- `v2.0.0` - Breaking changes

### Service-Specific Versioning

Services can have different versions:
- Frontend: `v3.4.6` (frequent UI updates)
- Backend services: `v1.0.x` (stable)
- Workers: `v1.0.x` (stable)

### Tagging Best Practices

**Tag both specific version AND latest:**
```bash
# Build with specific version
docker buildx build ... -t harbor.javajon.duckdns.org/library/frontend:v3.4.6

# Also tag as latest
docker tag harbor.javajon.duckdns.org/library/frontend:v3.4.6 \
           harbor.javajon.duckdns.org/library/frontend:latest

# Push both
docker push harbor.javajon.duckdns.org/library/frontend:v3.4.6
docker push harbor.javajon.duckdns.org/library/frontend:latest
```

---

## 🔍 Verifying Builds

### Check Image in Harbor

1. Visit https://harbor.javajon.duckdns.org
2. Login with credentials
3. Navigate to **Projects** → **library**
4. Verify your images are listed
5. Check image size, tags, and scan results

### Test Container Locally

```bash
# Pull image from Harbor
docker pull harbor.javajon.duckdns.org/library/frontend:v3.4.6

# Run locally to test
docker run -p 8080:80 harbor.javajon.duckdns.org/library/frontend:v3.4.6

# Visit http://localhost:8080
```

### Check Image Layers

```bash
# Inspect image
docker inspect harbor.javajon.duckdns.org/library/frontend:v3.4.6

# Check image history
docker history harbor.javajon.duckdns.org/library/frontend:v3.4.6
```

---

## 🐛 Troubleshooting

### Build Failures

**Problem:** `docker login` fails
```bash
Error response from daemon: Get https://harbor.javajon.duckdns.org/v2/: unauthorized
```
**Solution:**
- Verify credentials in homelab-harbor-credentials.txt
- Check Harbor service is running
- Try logging in via web UI first

---

**Problem:** Build fails with "no space left on device"
```bash
Error: write /var/lib/docker/...: no space left on device
```
**Solution:**
```bash
# Clean up Docker
docker system prune -a --volumes

# Check disk space
df -h
```

---

**Problem:** Push fails with "unauthorized"
```bash
unauthorized: unauthorized to access repository: library/frontend
```
**Solution:**
- Ensure you're using `robot$library+developer` account
- Check robot account has push permissions in Harbor

---

**Problem:** Multi-platform build fails
```bash
ERROR: multiple platforms feature is currently not supported for docker driver
```
**Solution:**
```bash
# Create buildx builder
docker buildx create --use

# Retry build
docker buildx build --platform linux/amd64 ...
```

---

### Image Size Issues

**Problem:** Images too large (>500MB)

**Solutions:**
1. Use Alpine base images (`node:18-alpine`)
2. Use multi-stage builds
3. Remove dev dependencies
4. Use `.dockerignore` file

**Example .dockerignore:**
```
node_modules
npm-debug.log
.git
.env
*.md
tests
.vscode
```

---

### Slow Builds

**Problem:** Builds take 30+ minutes

**Solutions:**
1. **Use BuildKit cache:**
   ```bash
   export DOCKER_BUILDKIT=1
   ```

2. **Layer caching - order matters:**
   ```dockerfile
   # Copy package files first (changes rarely)
   COPY package*.json ./
   RUN npm install

   # Copy source code last (changes frequently)
   COPY . .
   ```

3. **Use Docker layer caching in CI/CD**

---

## 📊 Build Metrics

**Average Build Times (Clean Build):**
- Frontend: ~5 minutes
- Backend Services: ~3 minutes each
- Workers: ~3 minutes each
- Total: ~20 minutes

**Image Sizes:**
- Frontend: 150 MB
- User Service: 200 MB
- Wardrobe Service: 250 MB (includes Sharp)
- Outfit Service: 200 MB
- Workers: 180 MB each

**Registry Storage:**
- All images (7 services × 3 versions): ~4 GB
- Recommended Harbor storage: 50 GB

---

## 🔗 Related Documentation

- 🚀 **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - How to deploy containers to Kubernetes
- 🏗️ **[Architecture](ARCHITECTURE.md)** - System design and container relationships
- 📚 **[API Documentation](API_DOCUMENTATION.md)** - Service endpoints and contracts

---

## ✅ Build Checklist

Before pushing to production:

- [ ] All tests pass locally (`npm test`)
- [ ] Environment variables documented
- [ ] Version number incremented appropriately
- [ ] Dockerfile optimized (multi-stage, Alpine base)
- [ ] .dockerignore file present
- [ ] Images tagged correctly
- [ ] Images pushed to Harbor
- [ ] Images verified in Harbor web UI
- [ ] Deployment manifests updated with new image tags
- [ ] Release notes updated

---

**Happy Building! 🐳**

Team Kates | Trinity College | Fall 2024
