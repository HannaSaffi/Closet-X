#!/bin/bash
# Build and push all images to Harbor

set -e

HARBOR_REGISTRY="harbor.javajon.duckdns.org"
HARBOR_PROJECT="kates"
VERSION="1.0.0"

echo "Building images..."

# User Service
cd services/user-service
docker build -t closetx-user-service:${VERSION} .
docker tag closetx-user-service:${VERSION} ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/closetx-user-service:${VERSION}
cd ../..

# Outfit Service
cd services/outfit-service
docker build -t closetx-outfit-service:${VERSION} .
docker tag closetx-outfit-service:${VERSION} ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/closetx-outfit-service:${VERSION}
cd ../..

# Outfit Generator Worker
cd workers/outfit-generator
docker build -t closetx-outfit-generator:${VERSION} .
docker tag closetx-outfit-generator:${VERSION} ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/closetx-outfit-generator:${VERSION}
cd ../..

echo "Pushing images to Harbor..."
echo "Make sure you're logged in: docker login ${HARBOR_REGISTRY}"

docker push ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/closetx-user-service:${VERSION}
docker push ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/closetx-outfit-service:${VERSION}
docker push ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/closetx-outfit-generator:${VERSION}

echo "✓ All images pushed successfully!"
