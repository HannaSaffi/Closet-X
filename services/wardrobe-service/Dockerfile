# services/wardrobe-service/Dockerfile

FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .

FROM node:18-alpine

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install imagemagick for image processing
RUN apk add --no-cache imagemagick

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Create upload directory
RUN mkdir -p /app/uploads && chown nodejs:nodejs /app/uploads

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

USER nodejs

CMD ["node", "src/server.js"]