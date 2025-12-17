#!/bin/bash
# Build and push all images to Harbor
# Team Kates - Closet-X

set -e

HARBOR_REGISTRY="harbor.javajon.duckdns.org"
HARBOR_PROJECT="library"
VERSION="v8.0.8"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Building and pushing Closet-X containers to Harbor${NC}"
echo -e "${BLUE}Registry: ${HARBOR_REGISTRY}/${HARBOR_PROJECT}${NC}"
echo -e "${BLUE}Version: ${VERSION}${NC}"
echo ""

# Check if logged in to Harbor
echo -e "${YELLOW}Checking Harbor login...${NC}"
if ! docker info | grep -q "${HARBOR_REGISTRY}"; then
    echo -e "${YELLOW}Please login to Harbor:${NC}"
    echo "  docker login ${HARBOR_REGISTRY}"
    exit 1
fi

echo -e "${GREEN}✓ Harbor login verified${NC}"
echo ""

# Function to build and push
build_and_push() {
    local SERVICE_NAME=$1
    local SERVICE_PATH=$2
    
    echo -e "${YELLOW}Building ${SERVICE_NAME}...${NC}"
    cd ${SERVICE_PATH}
    docker build -t ${SERVICE_NAME}:${VERSION} .
    docker tag ${SERVICE_NAME}:${VERSION} ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${SERVICE_NAME}:${VERSION}
    
    echo -e "${YELLOW}Pushing ${SERVICE_NAME}...${NC}"
    docker push ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${SERVICE_NAME}:${VERSION}
    
    echo -e "${GREEN}✓ ${SERVICE_NAME} complete${NC}"
    echo ""
    cd - > /dev/null
}

# Build all services
build_and_push "user-service" "services/user-service"
build_and_push "wardrobe-service" "services/wardrobe-service"
build_and_push "outfit-service" "services/outfit-service"
build_and_push "ai-advice-service" "services/ai-advice-service"

# Build all workers
build_and_push "image-processor" "workers/image-processor"
build_and_push "outfit-generator" "workers/outfit-generator"
build_and_push "fashion-advice" "workers/fashion-advice"

# Build frontend
build_and_push "frontend" "frontend"

echo ""
echo -e "${GREEN}✅ All 8 images built and pushed successfully!${NC}"
echo ""
echo -e "${BLUE}Images pushed:${NC}"
echo "  - ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/user-service:${VERSION}"
echo "  - ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/wardrobe-service:${VERSION}"
echo "  - ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/outfit-service:${VERSION}"
echo "  - ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/ai-advice-service:${VERSION}"
echo "  - ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/image-processor:${VERSION}"
echo "  - ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/outfit-generator:${VERSION}"
echo "  - ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/fashion-advice:${VERSION}"
echo "  - ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/frontend:${VERSION}"
echo ""
echo -e "${GREEN}Ready to deploy!${NC}"
