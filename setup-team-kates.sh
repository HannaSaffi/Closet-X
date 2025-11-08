#!/bin/bash

# ============================================================================
# Team Kates - Automated Configuration Update Script
# ============================================================================
# This script updates all Closet-X configuration files for Team Kates
# 
# Usage: ./setup-team-kates.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Team Configuration
TEAM_PREFIX="kates"
HARBOR_REGISTRY="harbor.javajon.duckdns.org"
HARBOR_PROJECT="kates"
K8S_CONTEXT="team-kates@homelab-k8s-1"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Team Kates - Closet-X Configuration Setup             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if in Closet-X directory
if [ ! -d "services" ] || [ ! -d "k8s" ]; then
    echo -e "${RED}Error: Please run this script from the Closet-X project root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Creating backup of existing files...${NC}"
BACKUP_DIR="backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup existing files
if [ -f "k8s/services/user-service/deployment.yaml" ]; then
    cp k8s/services/user-service/deployment.yaml "$BACKUP_DIR/" 2>/dev/null || true
fi
if [ -f "k8s/services/outfit-service/deployment.yaml" ]; then
    cp k8s/services/outfit-service/deployment.yaml "$BACKUP_DIR/" 2>/dev/null || true
fi
if [ -f "k8s/ingress.yaml" ]; then
    cp k8s/ingress.yaml "$BACKUP_DIR/" 2>/dev/null || true
fi

echo -e "${GREEN}✓ Backup created in $BACKUP_DIR${NC}"
echo ""

echo -e "${YELLOW}Step 2: Updating Kubernetes deployment files...${NC}"

# Update user-service deployment
if [ -f "k8s/services/user-service/deployment.yaml" ]; then
    echo "  → Updating user-service deployment..."
    sed -i.bak "s|namespace: closet-x|namespace: ${TEAM_PREFIX}-services|g" \
        k8s/services/user-service/deployment.yaml
    sed -i.bak "s|image: closetx/user-service:latest|image: ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/closetx-user-service:1.0.0|g" \
        k8s/services/user-service/deployment.yaml
    sed -i.bak "s|image: closetx-user-service:latest|image: ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/closetx-user-service:1.0.0|g" \
        k8s/services/user-service/deployment.yaml
    rm k8s/services/user-service/deployment.yaml.bak 2>/dev/null || true
    echo -e "  ${GREEN}✓ User service updated${NC}"
fi

# Update outfit-service deployment
if [ -f "k8s/services/outfit-service/deployment.yaml" ]; then
    echo "  → Updating outfit-service deployment..."
    sed -i.bak "s|namespace: closet-x|namespace: ${TEAM_PREFIX}-services|g" \
        k8s/services/outfit-service/deployment.yaml
    sed -i.bak "s|image: closetx/outfit-service:latest|image: ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/closetx-outfit-service:1.0.0|g" \
        k8s/services/outfit-service/deployment.yaml
    sed -i.bak "s|image: closetx-outfit-service:latest|image: ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/closetx-outfit-service:1.0.0|g" \
        k8s/services/outfit-service/deployment.yaml
    rm k8s/services/outfit-service/deployment.yaml.bak 2>/dev/null || true
    echo -e "  ${GREEN}✓ Outfit service updated${NC}"
fi

# Update service YAML files
for service_file in k8s/services/*/service.yaml; do
    if [ -f "$service_file" ]; then
        echo "  → Updating $service_file..."
        sed -i.bak "s|namespace: closet-x|namespace: ${TEAM_PREFIX}-services|g" "$service_file"
        rm "${service_file}.bak" 2>/dev/null || true
    fi
done

echo -e "${GREEN}✓ Deployment files updated${NC}"
echo ""

echo -e "${YELLOW}Step 3: Creating namespace configuration...${NC}"

# Create namespace YAML
cat > k8s/namespaces.yaml << EOF
# Team Kates Namespaces
apiVersion: v1
kind: Namespace
metadata:
  name: ${TEAM_PREFIX}-services
  labels:
    team: ${TEAM_PREFIX}
    purpose: services
---
apiVersion: v1
kind: Namespace
metadata:
  name: ${TEAM_PREFIX}-workers
  labels:
    team: ${TEAM_PREFIX}
    purpose: workers
---
apiVersion: v1
kind: Namespace
metadata:
  name: ${TEAM_PREFIX}-infrastructure
  labels:
    team: ${TEAM_PREFIX}
    purpose: infrastructure
EOF

echo -e "${GREEN}✓ Namespace configuration created${NC}"
echo ""

echo -e "${YELLOW}Step 4: Creating MongoDB & RabbitMQ deployments...${NC}"

# Create infrastructure directory if it doesn't exist
mkdir -p k8s/infrastructure

# MongoDB deployment
cat > k8s/infrastructure/mongodb.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb
  namespace: kates-infrastructure
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:7.0
        ports:
        - containerPort: 27017
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          value: "closetxuser"
        - name: MONGO_INITDB_ROOT_PASSWORD
          value: "SecurePassword123!"
        volumeMounts:
        - name: mongodb-data
          mountPath: /data/db
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
      volumes:
      - name: mongodb-data
        persistentVolumeClaim:
          claimName: mongodb-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  namespace: kates-infrastructure
spec:
  selector:
    app: mongodb
  ports:
  - port: 27017
    targetPort: 27017
  type: ClusterIP
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongodb-pvc
  namespace: kates-infrastructure
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
EOF

# RabbitMQ deployment
cat > k8s/infrastructure/rabbitmq.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rabbitmq
  namespace: kates-infrastructure
spec:
  replicas: 1
  selector:
    matchLabels:
      app: rabbitmq
  template:
    metadata:
      labels:
        app: rabbitmq
    spec:
      containers:
      - name: rabbitmq
        image: rabbitmq:3.12-management-alpine
        ports:
        - containerPort: 5672
          name: amqp
        - containerPort: 15672
          name: management
        env:
        - name: RABBITMQ_DEFAULT_USER
          value: "guest"
        - name: RABBITMQ_DEFAULT_PASS
          value: "guest"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: rabbitmq
  namespace: kates-infrastructure
spec:
  selector:
    app: rabbitmq
  ports:
  - port: 5672
    targetPort: 5672
    name: amqp
  - port: 15672
    targetPort: 15672
    name: management
  type: ClusterIP
EOF

echo -e "${GREEN}✓ Infrastructure deployments created${NC}"
echo ""

echo -e "${YELLOW}Step 5: Creating helper scripts...${NC}"

# Create build and push script
cat > build-and-push.sh << 'EOF'
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
EOF

chmod +x build-and-push.sh

# Create deployment script
cat > deploy-to-k8s.sh << 'EOF'
#!/bin/bash
# Deploy Closet-X to Kubernetes

set -e

NAMESPACE_SERVICES="kates-services"
NAMESPACE_WORKERS="kates-workers"
NAMESPACE_INFRA="kates-infrastructure"

echo "Deploying Closet-X to Kubernetes..."

# Switch context
kubectl config use-context team-kates@homelab-k8s-1

# Create namespaces
echo "→ Creating namespaces..."
kubectl apply -f k8s/namespaces.yaml

# Deploy infrastructure
echo "→ Deploying MongoDB..."
kubectl apply -f k8s/infrastructure/mongodb.yaml
kubectl wait --for=condition=ready pod -l app=mongodb -n ${NAMESPACE_INFRA} --timeout=300s

echo "→ Deploying RabbitMQ..."
kubectl apply -f k8s/infrastructure/rabbitmq.yaml
kubectl wait --for=condition=ready pod -l app=rabbitmq -n ${NAMESPACE_INFRA} --timeout=300s

# Deploy services
echo "→ Deploying user-service..."
kubectl apply -f k8s/services/user-service/

echo "→ Deploying outfit-service..."
kubectl apply -f k8s/services/outfit-service/

echo "→ Checking deployment status..."
kubectl get pods -n ${NAMESPACE_SERVICES}
kubectl get pods -n ${NAMESPACE_INFRA}

echo "✓ Deployment complete!"
echo ""
echo "Check status with:"
echo "  kubectl get pods -n ${NAMESPACE_SERVICES}"
echo "  kubectl get pods -n ${NAMESPACE_INFRA}"
EOF

chmod +x deploy-to-k8s.sh

echo -e "${GREEN}✓ Helper scripts created${NC}"
echo ""

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  Configuration Complete!                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}What's been updated:${NC}"
echo "  ✓ Kubernetes deployments configured for Team Kates"
echo "  ✓ Namespaces: ${TEAM_PREFIX}-services, ${TEAM_PREFIX}-workers, ${TEAM_PREFIX}-infrastructure"
echo "  ✓ Harbor registry: ${HARBOR_REGISTRY}/${HARBOR_PROJECT}"
echo "  ✓ MongoDB and RabbitMQ deployments created"
echo "  ✓ Helper scripts created"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Login to Harbor:"
echo "     ${BLUE}docker login ${HARBOR_REGISTRY}${NC}"
echo ""
echo "  2. Build and push images:"
echo "     ${BLUE}./build-and-push.sh${NC}"
echo ""
echo "  3. Apply ImagePullSecret:"
echo "     ${BLUE}kubectl apply -f kates-imagepullsecret.yaml${NC}"
echo "     ${YELLOW}(Edit the file first to replace 'kates-NAMESPACE' with 'kates-services')${NC}"
echo ""
echo "  4. Create secrets and configmaps (see TEAM_KATES_DEPLOYMENT_GUIDE.md)"
echo ""
echo "  5. Deploy to Kubernetes:"
echo "     ${BLUE}./deploy-to-k8s.sh${NC}"
echo ""
echo -e "${GREEN}Backup location:${NC} $BACKUP_DIR"
echo ""
echo -e "${BLUE}For detailed instructions, see: TEAM_KATES_DEPLOYMENT_GUIDE.md${NC}"