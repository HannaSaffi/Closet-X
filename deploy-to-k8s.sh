#!/bin/bash
echo "🚀 Deploying Closet-X to Kubernetes (kates team)..."

kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-imagepullsecret.yaml
kubectl apply -f k8s/02-config-secrets.yaml
kubectl apply -f k8s/03-mongodb.yaml

echo "⏳ Waiting for MongoDB..."
kubectl wait --for=condition=ready pod -l app=mongodb -n kates-closetx --timeout=120s

kubectl apply -f k8s/04-user-service.yaml
kubectl apply -f k8s/05-wardrobe-service.yaml
kubectl apply -f k8s/06-outfit-service.yaml
kubectl apply -f k8s/07-ai-advice-service.yaml
kubectl apply -f k8s/08-image-processor.yaml

echo "✅ Deployment complete!"
echo "Check status: kubectl get all -n kates-closetx"
