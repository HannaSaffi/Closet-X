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
kubectl get namespaces
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

# 6. Show persistent volumes
echo "💾 PERSISTENT VOLUMES:"
kubectl get pv
echo ""

# 7. Show persistent volume claims
echo "📎 PERSISTENT VOLUME CLAIMS:"
kubectl get pvc -n kates-closetx
echo ""

# 8. Show nodes
echo "🖥️  CLUSTER NODES:"
kubectl get nodes -o wide
echo ""

# 9. Show replica sets
echo "♻️  REPLICA SETS:"
kubectl get rs -n kates-closetx
echo ""

# 10. Show logs from outfit service
echo "📝 RECENT LOGS (Outfit Service):"
kubectl logs -n kates-closetx deployment/outfit-service --tail=10
echo ""

echo "=========================================="
echo "✅ Demo Complete!"
echo "=========================================="
