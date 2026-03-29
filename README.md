# 🧥 Closet-X: AI-Powered Digital Wardrobe

**A cloud-native microservices application for intelligent wardrobe management and outfit recommendations**

[![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=flat&logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=flat&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#️-architecture)
- [Technology Stack](#️-technology-stack)
- [Documentation](#-documentation)
- [Quick Start](#-quick-start)
- [Key Metrics](#-key-metrics)
- [Team](#-team)

---

## 📚 Documentation

- 📖 **[User Guide](USER_GUIDE.md)** - Complete walkthrough with screenshots
- 🏗️ **[Architecture Documentation](docs/ARCHITECTURE.md)** - System design and diagrams
- 📚 **[API Documentation](docs/API_DOCUMENTATION.md)** - REST API reference
- 🗄️ **[Database Schema](docs/DATABASE_SCHEMA.md)** - MongoDB collections and indexes
- 🔨 **[Build Instructions](docs/BUILD_INSTRUCTIONS.md)** - Container build guide
- 🚀 **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Kubernetes deployment
- 🧪 **[Testing Guide](docs/TESTING.md)** - Test coverage and CI/CD

---

## 🎯 Overview

**Closet-X** is a comprehensive digital wardrobe management application built with cloud-native principles. It helps users organize their clothing, get AI-powered outfit recommendations based on weather and occasion, and discover new styling possibilities from their existing wardrobe.

### Key Features

- 🤖 **AI-Powered Analysis**: Automatic clothing categorization and color detection using Google Vision AI
- 🌤️ **Weather Integration**: Real-time weather-based outfit suggestions using OpenWeather API
- 🎨 **Smart Algorithms**: Color harmony and style compatibility matching
- ☁️ **Cloud-Native**: Microservices architecture deployed on Kubernetes
- 🔄 **Asynchronous Processing**: RabbitMQ message queues for scalable background tasks

---

## ✨ Features

### User Features

- **Digital Wardrobe Management**
  - Upload clothing photos with automatic background removal
  - AI-powered categorization and tagging
  - Color detection and style analysis

- **Intelligent Outfit Recommendations**
  - Daily outfit suggestions based on real-time weather
  - Occasion-specific outfit filtering (casual, business, formal, athletic)
  - AI-powered fashion advice using natural language chat

- **Weather Integration**
  - Real-time weather data from OpenWeather API
  - Temperature-appropriate clothing recommendations

---

## 🏗️ Architecture

Closet-X follows cloud-native microservices architecture with **4 core services**, **3 background workers**, and **asynchronous message processing** via RabbitMQ.

### High-Level Overview

```
React Frontend (Vite + Tailwind)
         ↓
   Kubernetes Ingress (nginx)
         ↓
┌────────────────────────────────────┐
│     Microservices Layer            │
│  - User Service (Auth) :3001       │
│  - Wardrobe Service :3003          │
│  - Outfit Service :3002            │
│  - AI Advice Service :3004         │
└────────────────┬───────────────────┘
                 ↓
┌────────────────────────────────────┐
│       RabbitMQ Queue               │
│     (rabbitmq.rabbitmq)            │
│  - image_processing queue          │
│  - outfit_generation queue         │
│  - fashion_advice queue            │
└────────────────┬───────────────────┘
                 ↓
┌────────────────────────────────────┐
│     Background Workers             │
│  - Image Processor (Node.js)       │
│  - Outfit Generator (Node.js)      │
│  - Fashion Advice (Python)         │
└────────────────┬───────────────────┘
                 ↓
┌──────────┬─────────────────────────┐
│ MongoDB  │    External APIs        │
│ + GridFS │  - OpenWeather API      │
│          │  - Google Vision AI     │
│          │  - Google Gemini        │
│          │  - Remove.bg            │
└──────────┴─────────────────────────┘
```

### Message Queue Architecture

Closet-X uses **RabbitMQ** for asynchronous task processing:

- **Image Processing Queue**: Automatic clothing categorization, color detection, and background removal
- **Outfit Generation Queue**: AI-powered outfit recommendations with weather integration  
- **Fashion Advice Queue**: Real-time AI chat responses

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Routing**: React Router v6

### Backend Services (Node.js)
- **Runtime**: Node.js 18 LTS
- **Framework**: Express.js
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Image Processing**: Multer, Sharp
- **Testing**: Jest, Supertest
- **Message Queue**: amqplib (RabbitMQ)

### Background Workers
- **Languages**: Node.js, Python
- **Message Queue**: RabbitMQ (amqplib)
- **Image Processing**: Google Vision API
- **AI/ML**: Google Gemini API

### Database & Storage
- **Primary Database**: MongoDB 6.0 (StatefulSet)
- **Image Storage**: MongoDB GridFS

### External APIs
- **Weather Data**: OpenWeather API
- **Image Recognition**: Google Vision AI
- **Background Removal**: Remove.bg API
- **AI Chat**: Google Gemini API

### Infrastructure
- **Container Runtime**: Docker 24.0
- **Orchestration**: Kubernetes 1.28+
- **Registry**: Harbor (private registry)
- **Message Queue**: RabbitMQ 3.x
- **Ingress**: Nginx Ingress Controller
- **DNS**: DuckDNS

### Programming Languages
- **JavaScript/Node.js**: Backend services and workers
- **JavaScript/React**: Frontend application
- **Python**: AI Advice Service worker

---

## 📚 Documentation

- 📖 **[User Guide](USER_GUIDE.md)** - Complete walkthrough with screenshots
- 🏗️ **[Architecture Documentation](docs/ARCHITECTURE.md)** - System design and diagrams
- 📚 **[API Documentation](docs/API_DOCUMENTATION.md)** - REST API reference
- 🗄️ **[Database Schema](docs/DATABASE_SCHEMA.md)** - MongoDB collections and indexes
- 🔨 **[Build Instructions](docs/BUILD_INSTRUCTIONS.md)** - Container build guide
- 🚀 **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Kubernetes deployment
- 🧪 **[Testing Guide](docs/TESTING.md)** - Test coverage and CI/CD

---

## 🚀 Quick Start

### For Users
Visit [https://kates-closetx.javajon.duckdns.org/](https://kates-closetx.javajon.duckdns.org/) and log in:
- Email: `apostolo@trincoll.edu`
- Password: `12345678`

### For Developers

**Prerequisites:**
- Kubernetes cluster access
- Harbor registry access
- kubectl configured

**Deploy:**
```bash
git clone https://github.com/HannaSaffi/Closet-X.git
cd Closet-X

# Build and push to Harbor
./build-and-push.sh

# Deploy to Kubernetes
kubectl apply -f k8s/homelab/ -n kates-closetx

# Verify
kubectl get pods -n kates-closetx
```

---

## 📊 Key Metrics

- **Test Coverage**: 97.4% pass rate (301 passing tests)
- **Container Images**: 8 services
- **Kubernetes Pods**: 14 running (all with 0 restarts)
- **API Endpoints**: 25+
- **Database Collections**: 5 (users, wardrobe_items, outfits, fs.files, fs.chunks)

---

## 🗺️ Project Structure

```
Closet-X/
├── frontend/                 # React application
├── services/                 # Microservices
│   ├── user-service/        # Authentication (Node.js)
│   ├── wardrobe-service/    # Wardrobe management (Node.js)
│   ├── outfit-service/      # Outfit recommendations (Node.js)
│   └── ai-advice-service/   # Fashion advice (Node.js)
├── workers/                  # Background workers
│   ├── image-processor/     # Image analysis (Node.js)
│   ├── outfit-generator/    # Outfit generation (Node.js)
│   └── fashion-advice/      # AI recommendations (Python)
├── k8s/                      # Kubernetes manifests
│   ├── homelab/             # Homelab cluster configs
│   └── gke/                 # GKE configs
├── docs/                     # Documentation
└── USER_GUIDE.md
```

---

## 👥 Team

### Team Kates

- **Hanna Saffi** - Frontend Development, AI Integration, Workers
- **Kuany Kuany** - DevOps, CI/CD Pipeline, Infrastructure
- **Aleksandra Postolov** - Backend Services, Database Design, Testing

### Course Information

- **Course**: CPSC 415 - Building Cloud Native Apps
- **Semester**: Fall 2025
- **Institution**: Trinity College
- **Instructor**: Professor Jonathan Johnson
- **Presentation Date**: December 17, 2025

---

## 🙏 Acknowledgments

- **OpenWeather API** for weather data
- **Google Vision AI** for image recognition
- **Google Gemini** for AI recommendations
- **Remove.bg** for background removal
- **Harbor** for container registry
- **Professor Jonathan Johnson** for guidance and infrastructure support

---

## 📞 Contact

- **GitHub**: [https://github.com/HannaSaffi/Closet-X](https://github.com/HannaSaffi/Closet-X)
- **Issues**: [https://github.com/HannaSaffi/Closet-X/issues](https://github.com/HannaSaffi/Closet-X/issues)

---

Built with help of Claude and ❤️ by Team Kates | Trinity College | Fall 2025
