# Closet-X Deployment Guide

**Version:** 1.0  
**Last Updated:** November 25, 2025  
**Target Environment**: Kubernetes Homelab Cluster  
**Team:** Team Kates

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Verification & Testing](#verification--testing)
5. [Troubleshooting](#troubleshooting)
6. [Rollback Procedures](#rollback-procedures)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Scaling Guide](#scaling-guide)

---

## Prerequisites

### **Required Tools**

```bash
# Verify installations
kubectl version --client  # v1.28+
docker --version          # v24.0+
git --version            # v2.30+
```

### **Access Requirements**

- ✅ Kubernetes cluster access (kubeconfig configured)
- ✅ Harbor registry credentials
- ✅ GitHub repository access
- ✅ OpenWeather API key
- ✅ Google Vision API key

### **Cluster Requirements**

**Minimum Resources**:
- **Nodes**: 1 (multi-node recommended)
- **CPU**: 4 cores total
- **RAM**: 8GB total
- **Storage**: 50GB persistent storage

**Required Components**:
- Kubernetes 1.28+
- Ingress Controller (Nginx or Traefik)
- StorageClass for persistent volumes
- LoadBalancer or NodePort access

---

## Pre-Deployment Checklist

### **1. Clone Repository**

```bash
git clone https://github.com/yourusername/Closet-X.git
cd Closet-X
```

### **2. Verify Cluster Access**

```bash
# Check cluster connection
kubectl cluster-info

# Expected output:
# Kubernetes control plane is running at https://...
# CoreDNS is running at https://...
```

### **3. Create Namespace**

```bash
kubectl create namespace closetx

# Verify
kubectl get namespaces | grep closetx
```

### **4. Set kubectl Context**

```bash
# Set default namespace
kubectl config set-context --current --namespace=closetx

# Verify
kubectl config view --minify | grep namespace:
```

---

## Step-by-Step Deployment

### **Step 1: Configure Secrets**

#### **1.1 Harbor Registry Secret**

```bash
# Create Docker registry secret for Harbor
kubectl create secret docker-registry harbor-registry \
  --docker-server=harbor.javajon.duckdns.org \
  --docker-username=YOUR_HARBOR_USERNAME \
  --docker-password=YOUR_HARBOR_PASSWORD \
  --docker-email=YOUR_EMAIL \
  --namespace closetx

# Verify
kubectl get secret harbor-registry -n closetx
```

#### **1.2 API Keys Secret**

```bash
# Create secret for external API keys
kubectl create secret generic api-keys \
  --from-literal=OPENWEATHER_API_KEY=75b4246ff3ecccbef11f5cdc6ed5341f \
  --from-literal=GOOGLE_VISION_API_KEY=AIzaSyAF2pdB28_C2wYSQl-JtDY4v4Io2z7OgkI \
  --from-literal=JWT_SECRET=$(openssl rand -base64 32) \
  --namespace closetx

# Verify
kubectl get secret api-keys -n closetx
kubectl describe secret api-keys -n closetx
```

#### **1.3 MongoDB Credentials Secret**

```bash
# Generate secure password
MONGO_PASSWORD=$(openssl rand -base64 20)

kubectl create secret generic mongodb-credentials \
  --from-literal=MONGO_ROOT_PASSWORD=$MONGO_PASSWORD \
  --namespace closetx

# Save password securely for later use
echo "MongoDB Root Password: $MONGO_PASSWORD" >> ~/closetx-credentials.txt
chmod 600 ~/closetx-credentials.txt
```

---

### **Step 2: Create ConfigMap**

```bash
# Create ConfigMap with environment variables
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: closetx-config
  namespace: closetx
data:
  # Common config
  NODE_ENV: "production"
  FRONTEND_URL: "https://closetx.local"
  
  # MongoDB
  MONGO_HOST: "mongodb"
  MONGO_PORT: "27017"
  
  # RabbitMQ
  RABBITMQ_HOST: "rabbitmq"
  RABBITMQ_PORT: "5672"
  RABBITMQ_USER: "guest"
  RABBITMQ_PASS: "guest"
  
  # Service URLs (internal)
  USER_SERVICE_URL: "http://user-service:3001"
  WARDROBE_SERVICE_URL: "http://wardrobe-service:3003"
  OUTFIT_SERVICE_URL: "http://outfit-service:3002"
EOF

# Verify
kubectl get configmap closetx-config -n closetx
kubectl describe configmap closetx-config -n closetx
```

---

### **Step 3: Deploy MongoDB**

#### **3.1 Create Persistent Volume Claim**

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongodb-pvc
  namespace: closetx
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: standard  # Adjust to your StorageClass
EOF

# Verify PVC is bound
kubectl get pvc mongodb-pvc -n closetx
```

#### **3.2 Deploy MongoDB StatefulSet**

```bash
kubectl apply -f kubernetes/mongodb-statefulset.yaml

# Wait for MongoDB to be ready
kubectl wait --for=condition=ready pod -l app=mongodb -n closetx --timeout=300s

# Check status
kubectl get statefulset mongodb -n closetx
kubectl get pods -l app=mongodb -n closetx
```

#### **3.3 Create MongoDB Service**

```bash
kubectl apply -f kubernetes/mongodb-service.yaml

# Verify service
kubectl get service mongodb -n closetx
```

#### **3.4 Initialize MongoDB Databases**

```bash
# Port forward to MongoDB
kubectl port-forward svc/mongodb 27017:27017 -n closetx &
PF_PID=$!

# Wait for port forward
sleep 5

# Create databases
mongosh --eval "
  use closetx_users;
  db.createCollection('users');
  
  use closetx_wardrobe;
  db.createCollection('clothingitems');
  
  use closetx_outfits;
  db.createCollection('outfits');
  
  print('✅ Databases created successfully');
"

# Create indexes
mongosh --eval "
  use closetx_users;
  db.users.createIndex({ email: 1 }, { unique: true });
  
  use closetx_wardrobe;
  db.clothingitems.createIndex({ userId: 1 });
  db.clothingitems.createIndex({ userId: 1, category: 1 });
  
  use closetx_outfits;
  db.outfits.createIndex({ userId: 1, createdAt: -1 });
  
  print('✅ Indexes created successfully');
"

# Stop port forward
kill $PF_PID
```

---

### **Step 4: Deploy RabbitMQ**

#### **4.1 Deploy RabbitMQ**

```bash
kubectl apply -f kubernetes/rabbitmq-deployment.yaml

# Wait for RabbitMQ to be ready
kubectl wait --for=condition=ready pod -l app=rabbitmq -n closetx --timeout=180s

# Check status
kubectl get deployment rabbitmq -n closetx
kubectl get pods -l app=rabbitmq -n closetx
```

#### **4.2 Create RabbitMQ Service**

```bash
kubectl apply -f kubernetes/rabbitmq-service.yaml

# Verify service
kubectl get service rabbitmq -n closetx
```

#### **4.3 Initialize RabbitMQ Queues**

```bash
# Port forward to RabbitMQ management UI
kubectl port-forward svc/rabbitmq 15672:15672 -n closetx &
PF_PID=$!

# Wait for port forward
sleep 5

# Access management UI: http://localhost:15672
# Login: guest / guest

# Create queues programmatically (optional)
curl -u guest:guest -X PUT http://localhost:15672/api/queues/%2F/image_processing_queue \
  -H "content-type: application/json" \
  -d '{"durable":true}'

curl -u guest:guest -X PUT http://localhost:15672/api/queues/%2F/fashion_advice_queue \
  -H "content-type: application/json" \
  -d '{"durable":true}'

curl -u guest:guest -X PUT http://localhost:15672/api/queues/%2F/outfit_generation_queue \
  -H "content-type: application/json" \
  -d '{"durable":true}'

# Create exchange
curl -u guest:guest -X PUT http://localhost:15672/api/exchanges/%2F/closetx_events \
  -H "content-type: application/json" \
  -d '{"type":"topic","durable":true}'

echo "✅ RabbitMQ queues created"

# Stop port forward
kill $PF_PID
```

---

### **Step 5: Deploy Microservices**

#### **5.1 Deploy User Service**

```bash
# Apply deployment
kubectl apply -f kubernetes/user-service-deployment.yaml

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=user-service -n closetx --timeout=180s

# Create service
kubectl apply -f kubernetes/user-service-service.yaml

# Verify
kubectl get deployment user-service -n closetx
kubectl get pods -l app=user-service -n closetx
kubectl get service user-service -n closetx

# Check logs
kubectl logs -l app=user-service -n closetx --tail=50
```

#### **5.2 Deploy Wardrobe Service**

```bash
kubectl apply -f kubernetes/wardrobe-service-deployment.yaml
kubectl wait --for=condition=ready pod -l app=wardrobe-service -n closetx --timeout=180s
kubectl apply -f kubernetes/wardrobe-service-service.yaml

# Verify
kubectl get all -l app=wardrobe-service -n closetx
kubectl logs -l app=wardrobe-service -n closetx --tail=50
```

#### **5.3 Deploy Outfit Service**

```bash
kubectl apply -f kubernetes/outfit-service-deployment.yaml
kubectl wait --for=condition=ready pod -l app=outfit-service -n closetx --timeout=180s
kubectl apply -f kubernetes/outfit-service-service.yaml

# Verify
kubectl get all -l app=outfit-service -n closetx
kubectl logs -l app=outfit-service -n closetx --tail=50
```

---

### **Step 6: Deploy Workers**

#### **6.1 Deploy Image Processor Worker**

```bash
kubectl apply -f kubernetes/image-processor-deployment.yaml

# Wait for worker to be ready
kubectl wait --for=condition=ready pod -l app=image-processor -n closetx --timeout=180s

# Verify
kubectl get deployment image-processor -n closetx
kubectl logs -l app=image-processor -n closetx --tail=50
```

#### **6.2 Deploy Fashion Advice Worker**

```bash
kubectl apply -f kubernetes/fashion-advice-deployment.yaml
kubectl wait --for=condition=ready pod -l app=fashion-advice -n closetx --timeout=180s

kubectl get deployment fashion-advice -n closetx
kubectl logs -l app=fashion-advice -n closetx --tail=50
```

#### **6.3 Deploy Outfit Generator Worker**

```bash
kubectl apply -f kubernetes/outfit-generator-deployment.yaml
kubectl wait --for=condition=ready pod -l app=outfit-generator -n closetx --timeout=180s

kubectl get deployment outfit-generator -n closetx
kubectl logs -l app=outfit-generator -n closetx --tail=50
```

---

### **Step 7: Configure Ingress**

#### **7.1 Deploy Ingress Resource**

```bash
kubectl apply -f kubernetes/ingress.yaml

# Verify ingress
kubectl get ingress closetx-ingress -n closetx
kubectl describe ingress closetx-ingress -n closetx
```

#### **7.2 Configure Local DNS (Optional)**

For local testing, add to `/etc/hosts`:

```bash
# Add this line to /etc/hosts
echo "192.168.1.100 closetx.local" | sudo tee -a /etc/hosts

# Replace 192.168.1.100 with your cluster IP
```

---

### **Step 8: Verify Complete Deployment**

#### **8.1 Check All Resources**

```bash
# Get all resources in namespace
kubectl get all -n closetx

# Expected output:
# - 1 StatefulSet (mongodb)
# - 7 Deployments (3 services + 4 workers + rabbitmq)
# - 7+ Pods (all Running)
# - 4 Services (user, wardrobe, outfit, mongodb, rabbitmq)
# - 1 Ingress
```

#### **8.2 Check Pod Health**

```bash
# All pods should be Running
kubectl get pods -n closetx

# Check for any restarts
kubectl get pods -n closetx -o custom-columns=NAME:.metadata.name,RESTARTS:.status.containerStatuses[0].restartCount
```

#### **8.3 Check Services**

```bash
# Verify all services have endpoints
kubectl get endpoints -n closetx
```

---

## Verification & Testing

### **Test 1: Service Health Checks**

```bash
# Test user-service health
kubectl port-forward svc/user-service 3001:3001 -n closetx &
curl http://localhost:3001/health
# Expected: {"status":"healthy"}

# Test wardrobe-service health
kubectl port-forward svc/wardrobe-service 3003:3003 -n closetx &
curl http://localhost:3003/health

# Test outfit-service health
kubectl port-forward svc/outfit-service 3002:3002 -n closetx &
curl http://localhost:3002/health

# Clean up port forwards
killall kubectl
```

### **Test 2: User Registration & Login**

```bash
# Register test user
curl -X POST http://closetx.local/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "username": "testuser"
  }'

# Expected: { "success": true, "token": "eyJ...", "user": {...} }

# Login
curl -X POST http://closetx.local/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'

# Save token for next tests
TOKEN="<token-from-response>"
```

### **Test 3: Upload Clothing Item**

```bash
# Upload test image
curl -X POST http://closetx.local/api/wardrobe/clothing \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-image.jpg" \
  -F "category=tops" \
  -F "primaryColor=blue"

# Expected: { "success": true, "data": { "_id": "...", ... } }
```

### **Test 4: RabbitMQ Message Processing**

```bash
# Check RabbitMQ UI
kubectl port-forward svc/rabbitmq 15672:15672 -n closetx

# Open browser: http://localhost:15672 (guest/guest)
# Verify:
# - 3 queues exist
# - Message was published to image_processing_queue
# - Message was consumed by image-processor worker
```

### **Test 5: Get Daily Outfit**

```bash
curl -X POST http://closetx.local/api/outfits/daily \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Hartford",
    "occasion": "casual"
  }'

# Expected: { "success": true, "data": { "weather": {...}, "outfits": [...] } }
```

---

## Troubleshooting

### **Issue 1: Pods Not Starting**

**Symptoms**: Pods stuck in `Pending`, `CrashLoopBackOff`, or `ImagePullBackOff`

**Diagnosis**:
```bash
kubectl describe pod <pod-name> -n closetx
kubectl logs <pod-name> -n closetx
```

**Common Causes & Solutions**:

1. **ImagePullBackOff**:
   ```bash
   # Check Harbor registry secret
   kubectl get secret harbor-registry -n closetx
   
   # Recreate if needed
   kubectl delete secret harbor-registry -n closetx
   kubectl create secret docker-registry harbor-registry ...
   ```

2. **CrashLoopBackOff**:
   ```bash
   # Check logs for errors
   kubectl logs <pod-name> -n closetx --previous
   
   # Common issues:
   # - Missing environment variables
   # - Can't connect to MongoDB/RabbitMQ
   # - Port already in use
   ```

3. **Pending (Insufficient Resources)**:
   ```bash
   # Check node resources
   kubectl describe nodes
   
   # Reduce resource requests in deployment
   ```

### **Issue 2: Can't Connect to MongoDB**

**Symptoms**: Services log "MongoNetworkError" or "ECONNREFUSED"

**Diagnosis**:
```bash
# Check MongoDB pod
kubectl get pods -l app=mongodb -n closetx
kubectl logs -l app=mongodb -n closetx

# Check MongoDB service
kubectl get service mongodb -n closetx
kubectl get endpoints mongodb -n closetx
```

**Solutions**:
```bash
# Verify MongoDB is running
kubectl exec -it mongodb-0 -n closetx -- mongosh --eval "db.adminCommand('ping')"

# Check service can resolve
kubectl exec -it <any-pod> -n closetx -- nslookup mongodb

# Restart services
kubectl rollout restart deployment user-service -n closetx
```

### **Issue 3: RabbitMQ Queue Not Working**

**Symptoms**: Workers not consuming messages, queue depth increasing

**Diagnosis**:
```bash
# Check RabbitMQ
kubectl port-forward svc/rabbitmq 15672:15672 -n closetx
# Open http://localhost:15672

# Check worker logs
kubectl logs -l app=image-processor -n closetx
```

**Solutions**:
```bash
# Restart RabbitMQ
kubectl rollout restart deployment rabbitmq -n closetx

# Restart workers
kubectl rollout restart deployment image-processor -n closetx
kubectl rollout restart deployment fashion-advice -n closetx
kubectl rollout restart deployment outfit-generator -n closetx

# Purge queue if needed (via RabbitMQ UI)
```

### **Issue 4: Ingress Not Working**

**Symptoms**: Can't access `http://closetx.local/api/users`

**Diagnosis**:
```bash
# Check ingress
kubectl get ingress closetx-ingress -n closetx
kubectl describe ingress closetx-ingress -n closetx

# Check ingress controller
kubectl get pods -n ingress-nginx  # or kube-system
```

**Solutions**:
```bash
# Verify ingress controller is running
kubectl get svc -n ingress-nginx

# Test service directly (bypass ingress)
kubectl port-forward svc/user-service 3001:3001 -n closetx
curl http://localhost:3001/health

# Check DNS resolution
ping closetx.local
```

### **Issue 5: Out of Storage**

**Symptoms**: Pods can't write, GridFS errors

**Diagnosis**:
```bash
# Check PVC usage
kubectl exec -it mongodb-0 -n closetx -- df -h

# Check node storage
kubectl describe nodes | grep -A 5 "Allocated resources"
```

**Solutions**:
```bash
# Expand PVC (if StorageClass supports it)
kubectl patch pvc mongodb-pvc -n closetx -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'

# Clean up old data
kubectl exec -it mongodb-0 -n closetx -- mongosh --eval "
  use closetx_outfits;
  db.outfithistory.deleteMany({ generatedAt: { \$lt: new Date('2024-01-01') } });
"
```

---

## Rollback Procedures

### **Rollback Deployment**

```bash
# View deployment history
kubectl rollout history deployment user-service -n closetx

# Rollback to previous version
kubectl rollout undo deployment user-service -n closetx

# Rollback to specific revision
kubectl rollout undo deployment user-service --to-revision=2 -n closetx

# Verify rollback
kubectl rollout status deployment user-service -n closetx
```

### **Complete System Rollback**

```bash
# Save current state
kubectl get all -n closetx -o yaml > backup-$(date +%Y%m%d).yaml

# Rollback all services
kubectl rollout undo deployment user-service -n closetx
kubectl rollout undo deployment wardrobe-service -n closetx
kubectl rollout undo deployment outfit-service -n closetx

# Rollback workers
kubectl rollout undo deployment image-processor -n closetx
kubectl rollout undo deployment fashion-advice -n closetx
kubectl rollout undo deployment outfit-generator -n closetx

# Verify all rollbacks
kubectl get pods -n closetx
```

### **Database Rollback**

```bash
# Restore from backup
kubectl exec -it mongodb-0 -n closetx -- mongorestore /backup/20241125

# Or restore specific database
kubectl exec -it mongodb-0 -n closetx -- mongorestore --db closetx_users /backup/20241125/closetx_users
```

---

## Monitoring & Maintenance

### **Daily Checks**

```bash
# Check pod health
kubectl get pods -n closetx

# Check resource usage
kubectl top pods -n closetx
kubectl top nodes

# Check logs for errors
kubectl logs -l app=user-service -n closetx --tail=100 | grep -i error
```

### **Weekly Maintenance**

```bash
# Database backup
kubectl exec -it mongodb-0 -n closetx -- mongodump --out /backup/$(date +%Y%m%d)

# Check database sizes
kubectl exec -it mongodb-0 -n closetx -- mongosh --eval "
  db.adminCommand('listDatabases').databases.forEach(function(d) {
    print(d.name + ': ' + (d.sizeOnDisk / 1024 / 1024).toFixed(2) + ' MB');
  });
"

# Clean up old outfit history
kubectl exec -it mongodb-0 -n closetx -- mongosh --eval "
  use closetx_outfits;
  db.outfithistory.deleteMany({ generatedAt: { \$lt: new Date(Date.now() - 90*24*60*60*1000) } });
"
```

### **Monthly Maintenance**

```bash
# Update Docker images
docker pull harbor.javajon.duckdns.org/kates/user-service:latest
# ... other images

# Rolling update
kubectl set image deployment/user-service user-service=harbor.javajon.duckdns.org/kates/user-service:latest -n closetx

# Database optimization
kubectl exec -it mongodb-0 -n closetx -- mongosh --eval "
  use closetx_wardrobe;
  db.clothingitems.reIndex();
  
  use closetx_outfits;
  db.outfits.reIndex();
"
```

---

## Scaling Guide

### **Horizontal Scaling (Add Replicas)**

```bash
# Scale services
kubectl scale deployment user-service --replicas=3 -n closetx
kubectl scale deployment wardrobe-service --replicas=3 -n closetx
kubectl scale deployment outfit-service --replicas=3 -n closetx

# Scale workers
kubectl scale deployment image-processor --replicas=2 -n closetx

# Verify
kubectl get deployments -n closetx
```

### **Auto-Scaling (HPA)**

```bash
# Enable HPA for outfit-service
kubectl autoscale deployment outfit-service \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n closetx

# Check HPA status
kubectl get hpa -n closetx
kubectl describe hpa outfit-service -n closetx
```

### **Vertical Scaling (More Resources)**

Edit deployment YAML:
```yaml
resources:
  requests:
    memory: "512Mi"  # increased from 256Mi
    cpu: "200m"      # increased from 100m
  limits:
    memory: "1Gi"    # increased from 512Mi
    cpu: "1000m"     # increased from 500m
```

Apply:
```bash
kubectl apply -f kubernetes/outfit-service-deployment.yaml
```

---

## Cleanup & Uninstall

### **Remove Deployment**

```bash
# Delete all resources in namespace
kubectl delete namespace closetx

# Or delete selectively
kubectl delete deployment --all -n closetx
kubectl delete service --all -n closetx
kubectl delete ingress --all -n closetx
kubectl delete pvc --all -n closetx
```

### **Preserve Data**

```bash
# Backup database before deletion
kubectl exec -it mongodb-0 -n closetx -- mongodump --out /backup/final-backup

# Copy backup to local machine
kubectl cp closetx/mongodb-0:/backup/final-backup ./mongodb-backup

# Then delete namespace
kubectl delete namespace closetx
```

---

## Production Deployment Best Practices

### **Security Hardening**

- ✅ Use non-root containers
- ✅ Enable Pod Security Policies
- ✅ Network Policies for pod isolation
- ✅ Secrets encryption at rest
- ✅ Regular security scans (Trivy, Harbor)

### **High Availability**

- ✅ Multi-node cluster (3+ nodes)
- ✅ MongoDB replica set (3 replicas)
- ✅ RabbitMQ cluster (3 nodes)
- ✅ Service replicas >= 2
- ✅ Pod anti-affinity rules

### **Disaster Recovery**

- ✅ Daily database backups
- ✅ Off-site backup storage
- ✅ Documented restore procedure
- ✅ Regular restore testing
- ✅ GitOps for infrastructure

---

**Deployment Guide Version**: 1.0  
**Last Updated**: November 25, 2025  
**Maintained By**: Team Kates  
**Support**: deployment@closetx.com