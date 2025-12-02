# workers/outfit-generator/Dockerfile

FROM node:18-alpine AS builder

WORKDIR /app

# 1) Package files (they live in this folder)
COPY package*.json ./
RUN npm ci --only=production

# 2) Worker source (also in this folder)
COPY src ./src

# 3) Shared code: we DON’T have shared/ in this context,
# so either:
# - remove this line for now, OR
# - vendor the shared code into this folder
# For now, safest is: comment it out if not strictly needed yet
# COPY shared /app/shared

# then the rest of your Dockerfile...
