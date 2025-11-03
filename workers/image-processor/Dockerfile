# workers/image-processor/Dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install && npm cache clean --force

# Copy both the worker and the shared code
COPY shared ./shared

# Then copy the rest of the worker files
COPY . .

# Production stage
FROM node:18-alpine
RUN apk add --no-cache vips-dev build-base python3
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
WORKDIR /app

COPY package*.json ./
RUN npm install --production && npm cache clean --force

# Copy everything from builder
COPY --from=builder --chown=nodejs:nodejs /app .

RUN mkdir -p uploads logs && chown -R nodejs:nodejs uploads logs
USER nodejs
EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health',(r)=>{process.exit(r.statusCode===200?0:1)})"

CMD ["node", "src/worker.js"]
