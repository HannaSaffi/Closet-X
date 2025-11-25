#!/bin/bash

#!/bin/bash

set -e

echo "🏗️  Building and Pushing Docker Images to Both Registries..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Registries
HOMELAB_REGISTRY="harbor.javajon.duckdns.org"
GKE_REGISTRY="harbor.javajon-gke.duckdns.org"
PROJECT="library"
VERSION="v1.0.0"

# Services to build
SERVICES=(
  "services/user-service:user-service"
  "services/wardrobe-service:wardrobe-service"
  "services/outfit-service:outfit-service"
  "services/ai-advice-service:ai-advice-service"
  "workers/image-processor:image-processor"
  "workers/outfit-generator:outfit-generator"
  "workers/fashion-advice:fashion-advice"
)

echo ""
echo -e "${YELLOW}🔐 Step 1: Login to both Harbor registries...${NC}"

echo "Logging into Homelab Harbor..."
docker login $HOMELAB_REGISTRY
# Username: robot$library+developer
# Password: lLsVuArzCPmWkXbXPNlQSiAMUf1zClvV

echo ""
echo "Logging into GKE Harbor..."
docker login $GKE_REGISTRY
# Username: robot$library+developer
# Password: c5d9eRvmIQlOiZCagsKZp4XAi3qwRAba

echo ""
echo -e "${GREEN}✅ Logged into both registries${NC}"

# Build and push each service
for service_path in "${SERVICES[@]}"; do
  IFS=':' read -r path name <<< "$service_path"
  
  echo ""
  echo -e "${YELLOW}🏗️  Building $name...${NC}"
  
  # Build image
  docker build -t $name:$VERSION ./$path
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to build $name${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✅ Built $name${NC}"
  
  # Tag for Homelab
  echo -e "${YELLOW}🏷️  Tagging for Homelab...${NC}"
  docker tag $name:$VERSION $HOMELAB_REGISTRY/$PROJECT/$name:$VERSION
  docker tag $name:$VERSION $HOMELAB_REGISTRY/$PROJECT/$name:latest
  
  # Push to Homelab
  echo -e "${YELLOW}📤 Pushing to Homelab Harbor...${NC}"
  docker push $HOMELAB_REGISTRY/$PROJECT/$name:$VERSION
  docker push $HOMELAB_REGISTRY/$PROJECT/$name:latest
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to push $name to Homelab${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✅ Pushed $name to Homelab${NC}"
  
  # Tag for GKE
  echo -e "${YELLOW}🏷️  Tagging for GKE...${NC}"
  docker tag $name:$VERSION $GKE_REGISTRY/$PROJECT/$name:$VERSION
  docker tag $name:$VERSION $GKE_REGISTRY/$PROJECT/$name:latest
  
  # Push to GKE
  echo -e "${YELLOW}📤 Pushing to GKE Harbor...${NC}"
  docker push $GKE_REGISTRY/$PROJECT/$name:$VERSION
  docker push $GKE_REGISTRY/$PROJECT/$name:latest
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to push $name to GKE${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✅ Pushed $name to GKE${NC}"
done

echo ""
echo -e "${GREEN}🎉 All images built and pushed to both registries!${NC}"
echo ""
echo "Images available in:"
echo "  - Homelab: https://harbor.javajon.duckdns.org"
echo "  - GKE: https://harbor.javajon-gke.duckdns.org"
echo ""
echo "Next steps:"
echo "  1. Deploy to Homelab: ./deploy-homelab.sh"
echo "  2. Or deploy to GKE: ./deploy-gke.sh"
echo ""