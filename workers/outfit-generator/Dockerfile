# workers/outfit-generator/Dockerfile

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY workers/outfit-generator/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy worker source - FIX THIS LINE
COPY workers/outfit-generator/src ./src

# Copy shared code from project root
COPY shared ./shared

EXPOSE 3000

CMD ["node", "src/index.js"]