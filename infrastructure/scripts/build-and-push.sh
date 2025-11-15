#!/bin/bash
# infrastructure/scripts/build-and-push-harbor.sh
# Complete script to build and push all Docker images to Harbor

set -e  # Exit on error

# ============================================
# CONFIGURATION
# ============================================
# TODO: Read your kates-harbor-credentials.txt and update these:

HARBOR_URL="harbor.example.com"     # REPLACE: Your Harbor URL from kates-harbor-credentials.txt
HARBOR_PROJECT="closet-x"            # Your project name
HARBOR_USERNAME="kate"               # REPLACE: Your username from credentials file
HARBOR_PASSWORD="your-password"      # REPLACE: Your password from credentials file
VERSION="v1.0.0"                     # Image version tag

# Colors for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# FUNCTIONS
# ============================================

print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_success "Docker is installed"
    
    # Check Docker is running
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    print_success "Docker is running"
    
    # Check if Dockerfiles exist
    if [ ! -f "services/user-service/Dockerfile" ]; then
        print_error "Dockerfiles not found. Make sure you're in the project root directory."
        exit 1
    fi
    print_success "Project structure looks good"
}

login_to_harbor() {
    print_header "Logging into Harbor Registry"
    
    echo "$HARBOR_PASSWORD" | docker login "$HARBOR_URL" -u "$HARBOR_USERNAME" --password-stdin
    
    if [ $? -eq 0 ]; then
        print_success "Logged into Harbor registry"
    else
        print_error "Failed to login to Harbor"
        exit 1
    fi
}

build_and_push_service() {
    local service_name=$1
    local service_path=$2
    
    print_header "Building $service_name"
    
    # Check if Dockerfile exists
    if [ ! -f "$service_path/Dockerfile" ]; then
        print_error "Dockerfile not found at $service_path/Dockerfile"
        return 1
    fi
    
    # Full image name with tags
    IMAGE_NAME="$HARBOR_URL/$HARBOR_PROJECT/$service_name"
    IMAGE_VERSION="$IMAGE_NAME:$VERSION"
    IMAGE_LATEST="$IMAGE_NAME:latest"
    
    print_info "Building image: $IMAGE_VERSION"
    
    # Build the image
    docker build \
        -t "$IMAGE_VERSION" \
        -t "$IMAGE_LATEST" \
        "$service_path" \
        2>&1 | grep -E "(Step|Successfully|Error)" || true
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        print_success "Built $service_name"
    else
        print_error "Failed to build $service_name"
        return 1
    fi
    
    # Push version tag
    print_info "Pushing $IMAGE_VERSION..."
    docker push "$IMAGE_VERSION" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Pushed $IMAGE_VERSION"
    else
        print_error "Failed to push $IMAGE_VERSION"
        return 1
    fi
    
    # Push latest tag
    print_info "Pushing $IMAGE_LATEST..."
    docker push "$IMAGE_LATEST" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Pushed $IMAGE_LATEST"
    else
        print_error "Failed to push $IMAGE_LATEST"
        return 1
    fi
    
    echo ""
    return 0
}

# ============================================
# MAIN SCRIPT
# ============================================

print_header "Closet-X Docker Build & Push to Harbor"
echo ""

# Check prerequisites
check_prerequisites
echo ""

# Login to Harbor
login_to_harbor
echo ""

# Track success/failure
declare -a SUCCESSFUL_BUILDS
declare -a FAILED_BUILDS

# Build and push each service
print_header "Building and Pushing Services"
echo ""

# User Service
if build_and_push_service "user-service" "services/user-service"; then
    SUCCESSFUL_BUILDS+=("user-service")
else
    FAILED_BUILDS+=("user-service")
fi

# Wardrobe Service
if build_and_push_service "wardrobe-service" "services/wardrobe-service"; then
    SUCCESSFUL_BUILDS+=("wardrobe-service")
else
    FAILED_BUILDS+=("wardrobe-service")
fi

# Outfit Service
if build_and_push_service "outfit-service" "services/outfit-service"; then
    SUCCESSFUL_BUILDS+=("outfit-service")
else
    FAILED_BUILDS+=("outfit-service")
fi

# Image Processor Worker
if build_and_push_service "image-processor" "workers/image-processor"; then
    SUCCESSFUL_BUILDS+=("image-processor")
else
    FAILED_BUILDS+=("image-processor")
fi

# Summary
print_header "Build Summary"
echo ""
echo "Harbor Registry: $HARBOR_URL"
echo "Project: $HARBOR_PROJECT"
echo "Version: $VERSION"
echo ""

if [ ${#SUCCESSFUL_BUILDS[@]} -gt 0 ]; then
    print_success "Successfully built and pushed ${#SUCCESSFUL_BUILDS[@]} images:"
    for service in "${SUCCESSFUL_BUILDS[@]}"; do
        echo "  ✅ $service"
    done
    echo ""
fi

if [ ${#FAILED_BUILDS[@]} -gt 0 ]; then
    print_error "Failed to build ${#FAILED_BUILDS[@]} images:"
    for service in "${FAILED_BUILDS[@]}"; do
        echo "  ❌ $service"
    done
    echo ""
    exit 1
fi

print_success "All images built and pushed successfully!"
echo ""
print_info "Verify images at: https://$HARBOR_URL"
echo ""
print_info "Next steps:"
echo "  1. Update Kubernetes deployment files with Harbor URL: $HARBOR_URL"
echo "  2. Apply image pull secret: kubectl apply -f kates-imagepullsecret.yaml"
echo "  3. Deploy services: ./deploy-to-k8s.sh"