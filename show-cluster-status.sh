#!/bin/bash
# ============================================
# Closet-X Kubernetes Resources Demo
# ============================================
echo "=========================================="
echo "CLOSET-X KUBERNETES CLUSTER STATUS"
echo "=========================================="
echo ""

# 1. Show all namespaces
echo "📦 NAMESPACES:"
kubectl get namespaces | grep kates
echo ""

# 2. Show all pods in kates-closetx namespace
echo "🔷 PODS (kates-closetx namespace):"
kubectl get pods -n kates-closetx -o wide
echo ""

# 3. Show deployments
echo "🚀 DEPLOYMENTS:"
kubectl get deployments -n kates-closetx
echo ""

# 4. Show services
echo "🌐 SERVICES:"
kubectl get svc -n kates-closetx
echo ""

# 5. Show ingress
echo "🔀 INGRESS:"
kubectl get ingress -n kates-closetx
echo ""

# 6. Show HPA
echo "📊 HORIZONTAL POD AUTOSCALERS:"
kubectl get hpa -n kates-closetx
echo ""

# 7. Show nodes
echo "🖥️  CLUSTER NODES:"
kubectl get nodes -o wide
echo ""

# 8. Show logs from outfit service
echo "📝 RECENT LOGS (Outfit Service):"
kubectl logs -n kates-closetx deployment/outfit-service --tail=10
echo ""

# 9. Show RabbitMQ connection status
echo "🐰 RABBITMQ CONNECTIONS:"
kubectl logs -n kates-closetx deployment/image-processor --tail=5 | grep RabbitMQ
echo ""

echo "=========================================="
echo "✅ Demo Complete!"
echo "=========================================="
