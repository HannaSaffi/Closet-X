#!/bin/bash

set -e

echo "🚀 Deploying Closet-X to GKE Cluster..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed${NC}"
    exit 1
fi

# Switch to GKE context
echo -e "${YELLOW}🔄 Switching to GKE cluster...${NC}"
kubectl config use-context gke_horizontal-ray-375222_us-central1_autopilot-cluster-2

# Verify connection
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}❌ Cannot connect to GKE cluster${NC}"
    echo "Please check your kubeconfig"
    exit 1
fi

echo -e "${GREEN}✅ Connected to GKE cluster${NC}"

# Apply manifests
echo ""
echo -e "${YELLOW}📦 Step 1: Creating namespace...${NC}"
kubectl apply -f k8s/gke/00-namespace.yaml

echo ""
echo -e "${YELLOW}🔐 Step 2: Creating image pull secret...${NC}"
kubectl apply -f k8s/gke/01-imagepullsecret.yaml

echo ""
echo -e "${YELLOW}⚙️  Step 3: Creating config and secrets...${NC}"
kubectl apply -f k8s/gke/02-config-secrets.yaml

echo ""
echo -e "${YELLOW}🗄️  Step 4: Deploying MongoDB...${NC}"
kubectl apply -f k8s/gke/03-mongodb.yaml

echo ""
echo -e "${YELLOW}⏳ Waiting for MongoDB to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=mongodb -n kates-closetx --timeout=300s || true

echo ""
echo -e "${YELLOW}🚀 Step 5: Deploying microservices...${NC}"
kubectl apply -f k8s/gke/04-user-service.yaml
kubectl apply -f k8s/gke/05-wardrobe-service.yaml
kubectl apply -f k8s/gke/06-outfit-service.yaml
kubectl apply -f k8s/gke/07-advice-service.yaml

echo ""
echo -e "${YELLOW}👷 Step 6: Deploying workers...${NC}"
kubectl apply -f k8s/gke/08-image-processor.yaml
kubectl apply -f k8s/gke/09-outfit-generator.yaml
kubectl apply -f k8s/gke/10-fashion-advice.yaml

echo ""
echo -e "${YELLOW}🌐 Step 7: Creating ingress...${NC}"
kubectl apply -f k8s/gke/11-ingress.yaml

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📊 Checking deployment status..."
echo ""

kubectl get all -n kates-closetx

echo ""
echo -e "${GREEN}🎉 Closet-X is deployed to GKE!${NC}"
echo ""
echo "🔍 To check pod status:"
echo "   kubectl get pods -n kates-closetx"
echo ""
echo "📝 To view logs:"
echo "   kubectl logs -f deployment/user-service -n kates-closetx"
echo ""
echo "🌐 Access your application at:"
echo "   http://kates-closetx.javajon-gke.duckdns.org"
echo ""
echo "🔧 To delete deployment:"
echo "   kubectl delete namespace kates-closetx"
echo ""