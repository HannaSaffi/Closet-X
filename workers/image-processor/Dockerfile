# workers/image-processor/Dockerfile

FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .

FROM node:18-alpine

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install image processing dependencies
RUN apk add --no-cache \
    imagemagick \
    graphicsmagick \
    libwebp-tools

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

USER nodejs

CMD ["node", "src/index.js"]