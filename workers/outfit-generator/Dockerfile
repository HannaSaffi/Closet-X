#workers/outfit-generator/Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files from worker
COPY workers/outfit-generator/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy shared models
COPY --chown=nodejs:nodejs shared /app/shared

# Copy worker source code (but not package.json again)
COPY --chown=nodejs:nodejs workers/outfit-generator/src ./src

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose health check port (if applicable)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "console.log('healthy')" || exit 1

# Start the worker
CMD ["node", "src/index.js"]