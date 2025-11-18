# services/user-service/Dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies WITH legacy peer deps flag
RUN npm install --legacy-peer-deps && npm cache clean --force

# Copy application files
COPY . .

# Production stage
FROM node:18-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy package files and install production dependencies WITH legacy peer deps
COPY package*.json ./
RUN npm install --production --legacy-peer-deps && npm cache clean --force

# Copy application from builder (including src directory)
COPY --from=builder --chown=nodejs:nodejs /app/src ./src

# Create logs directory
RUN mkdir -p logs && chown nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application directly with node (not npm run dev)
CMD ["node", "src/index.js"]
