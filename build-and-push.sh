#!/bin/bash

# Harbor configuration
HARBOR_REGISTRY="harbor.javajon.duckdns.org"
HARBOR_PROJECT="kates"
VERSION="v1.0.0"

echo "🏗️  Building and pushing Closet-X images to Harbor..."
echo "Registry: $HARBOR_REGISTRY"
echo "Project: $HARBOR_PROJECT"
echo "Version: $VERSION"
echo ""

# Function to build and push
build_and_push() {
    local service=$1
    local context=$2
    local dockerfile=$3
    
    echo "📦 Building $service..."
    docker build -t $service:$VERSION -f $context/$dockerfile $context
    
    echo "🏷️  Tagging $service for Harbor..."
    docker tag $service:$VERSION $HARBOR_REGISTRY/$HARBOR_PROJECT/$service:$VERSION
    docker tag $service:$VERSION $HARBOR_REGISTRY/$HARBOR_PROJECT/$service:latest
    
    echo "⬆️  Pushing $service to Harbor..."
    docker push $HARBOR_REGISTRY/$HARBOR_PROJECT/$service:$VERSION
    docker push $HARBOR_REGISTRY/$HARBOR_PROJECT/$service:latest
    
    echo "✅ $service pushed successfully!"
    echo ""
}

# Build and push each service
build_and_push "user-service" "services/user-service" "Dockerfile"
build_and_push "wardrobe-service" "services/wardrobe-service" "Dockerfile"
build_and_push "outfit-service" "services/outfit-service" "Dockerfile"
build_and_push "ai-advice-service" "services/ai-advice-service" "Dockerfile"
build_and_push "image-processor" "workers/image-processor" "Dockerfile"

echo "🎉 All images pushed to Harbor successfully!"
echo ""
echo "Images available at:"
echo "  - $HARBOR_REGISTRY/$HARBOR_PROJECT/user-service:$VERSION"
echo "  - $HARBOR_REGISTRY/$HARBOR_PROJECT/wardrobe-service:$VERSION"
echo "  - $HARBOR_REGISTRY/$HARBOR_PROJECT/outfit-service:$VERSION"
echo "  - $HARBOR_REGISTRY/$HARBOR_PROJECT/ai-advice-service:$VERSION"
echo "  - $HARBOR_REGISTRY/$HARBOR_PROJECT/image-processor:$VERSION"
