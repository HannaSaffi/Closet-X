# services/wardrobe-service/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production --legacy-peer-deps   # ✅ This works!
COPY src ./src
EXPOSE 3003
CMD ["node", "src/index.js"]