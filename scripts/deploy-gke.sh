#!/bin/bash
# Deploy Closet-X to GKE Cluster
# Team Kates

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Deploying Closet-X to GKE Cluster...${NC}"
echo ""

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
echo ""

# Apply manifests in order
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
sleep 10

echo ""
echo -e "${YELLOW}🚀 Step 5: Deploying microservices...${NC}"
kubectl apply -f k8s/gke/04-user-service.yaml
kubectl apply -f k8s/gke/05-wardrobe-service.yaml
kubectl apply -f k8s/gke/06-outfit-service.yaml
kubectl apply -f k8s/gke/07-ai-advice-service.yaml

echo ""
echo -e "${YELLOW}👷 Step 6: Deploying workers...${NC}"
kubectl apply -f k8s/gke/08-image-processor.yaml
kubectl apply -f k8s/gke/09-outfit-generator.yaml
kubectl apply -f k8s/gke/10-fashion-advice.yaml

echo ""
echo -e "${YELLOW}🌐 Step 7: Deploying frontend...${NC}"
kubectl apply -f k8s/gke/13-frontend.yaml

echo ""
echo -e "${YELLOW}🔀 Step 8: Creating ingress...${NC}"
kubectl apply -f k8s/gke/11-ingress.yaml

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

# Wait for deployments
echo -e "${YELLOW}⏳ Waiting for pods to be ready...${NC}"
sleep 30

echo ""
echo "📊 Checking deployment status..."
echo ""
kubectl get all -n kates-closetx

echo ""
echo -e "${GREEN}🎉 Closet-X is deployed to GKE!${NC}"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo ""
echo "🔍 Check pod status:"
echo "   kubectl get pods -n kates-closetx"
echo ""
echo "📝 View logs:"
echo "   kubectl logs -f deployment/user-service -n kates-closetx"
echo ""
echo "🔍 Check RabbitMQ connections:"
echo "   kubectl logs -n kates-closetx deployment/image-processor --tail=20 | grep -i rabbitmq"
echo ""
echo "🌐 Access your application:"
echo "   http://kates-closetx.javajon-gke.duckdns.org"
echo ""
echo "🔧 To delete deployment:"
echo "   kubectl delete namespace kates-closetx"
echo ""
