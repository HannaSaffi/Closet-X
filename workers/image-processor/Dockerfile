# workers/image-processor/Dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files
COPY workers/image-processor/package*.json ./

# Install all dependencies
RUN npm install && npm cache clean --force

# Copy src and shared folders
COPY workers/image-processor/src ./src
COPY shared ./shared

# Copy Ollama service and config from outfit-service
COPY services/outfit-service/src/services/ollamaService.js ./src/services/ollamaService.js
COPY services/outfit-service/src/config/ollama.js ./src/config/ollama.js

# Copy the Clothing model
COPY services/wardrobe-service/src/models/Clothing.js ./src/models/Clothing.js

# Production stage
FROM node:18-alpine

RUN apk add --no-cache vips-dev build-base python3

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
WORKDIR /app

COPY package*.json ./
RUN npm install --production && npm cache clean --force

COPY --from=builder --chown=nodejs:nodejs /app .

RUN mkdir -p uploads logs && chown -R nodejs:nodejs uploads logs

USER nodejs
EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health',(r)=>{process.exit(r.statusCode===200?0:1)})"

CMD ["node", "src/worker.js"]
