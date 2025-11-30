# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Set environment variables for build
ENV VITE_API_BASE_URL=https://kates-closetx.javajon.duckdns.org
ENV VITE_USER_SERVICE_URL=https://kates-closetx.javajon.duckdns.org/api/auth
ENV VITE_WARDROBE_SERVICE_URL=https://kates-closetx.javajon.duckdns.org/api/wardrobe
ENV VITE_OUTFIT_SERVICE_URL=https://kates-closetx.javajon.duckdns.org/api/outfits

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]