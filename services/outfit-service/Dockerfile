# services/outfit-service/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY src ./src

# Copy OpenAPI spec
COPY outfit-service-openapi.yaml ./

EXPOSE 3002

CMD ["node", "src/index.js"]