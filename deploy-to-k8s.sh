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
