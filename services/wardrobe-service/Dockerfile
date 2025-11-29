# services/wardrobe-service/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production --legacy-peer-deps   # ✅ This works!
COPY src ./src
# Copy OpenAPI spec
COPY wardrobe-service-openapi.yaml ./
EXPOSE 3003
CMD ["node", "src/index.js"]