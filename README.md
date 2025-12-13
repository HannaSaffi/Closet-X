# 🧥 Closet-X: AI-Powered Digital Wardrobe

**A cloud-native microservices application for intelligent wardrobe management and outfit recommendations**

[![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=flat&logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=flat&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)

---

## 🚀 Live Demo

**Try Closet-X Now:** [https://kates-closetx.javajon.duckdns.org/](https://kates-closetx.javajon.duckdns.org/)

**Demo Credentials:**
- **Email:** `apostolo@trincoll.edu`
- **Password:** `12345678`

> 💡 See our [User Guide](USER_GUIDE.md) for a complete walkthrough of all features!

---

## 📋 Table of Contents

- [Live Demo](#-live-demo)
- [Overview](#-overview)
- [Features](#-features)
- [Documentation](#-documentation)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Quick Start](#-quick-start)
- [Team](#-team)

---

## 📚 Documentation

Comprehensive documentation for developers and users:

- 📖 **[User Guide](USER_GUIDE.md)** - Complete walkthrough with screenshots and feature descriptions
- 🏗️ **[Architecture Documentation](docs/ARCHITECTURE.md)** - System design, PlantUML diagrams, and component relationships
- 📚 **[API Documentation](docs/API_DOCUMENTATION.md)** - Complete REST API reference with examples
- 🗄️ **[Database Schema](docs/DATABASE_SCHEMA.md)** - MongoDB collections, indexes, and relationships
- 🔨 **[Build Instructions](docs/BUILD_INSTRUCTIONS.md)** - Container build guide and Harbor registry setup
- 🚀 **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Kubernetes deployment to Harbor and clusters
- 🧪 **[Testing Guide](docs/TESTING.md)** - Test coverage, running tests, and CI/CD integration

---

## 🎯 Overview

**Closet-X** is a comprehensive digital wardrobe management application built with cloud-native principles. It helps users organize their clothing, get AI-powered outfit recommendations based on weather and occasion, and discover new styling possibilities from their existing wardrobe.

### Core Value Proposition

> **"What Should I Wear Today?"** - Get personalized, AI-powered outfit recommendations that consider weather, occasion, and your personal style preferences.

### Key Differentiators

- 🤖 **AI-Powered Analysis**: Automatic clothing categorization and color/style detection using Google Vision AI
- 🌤️ **Weather Integration**: Real-time weather-based outfit suggestions using OpenWeather API
- 🎨 **Smart Algorithms**: Color harmony and style compatibility matching
- ☁️ **Cloud-Native**: Built with microservices architecture, deployed on Kubernetes
- 🔄 **Asynchronous Processing**: RabbitMQ message queues for scalable background tasks

---

## ✨ Features

### User Features

- **Digital Wardrobe Management**
  - Upload clothing photos with automatic AI categorization
  - Organize items by category, color, season, brand
  - Track purchase dates, prices, and wear frequency
  - Add custom tags and notes

- **Intelligent Outfit Recommendations**
  - Daily outfit suggestions based on weather
  - Color harmony and style compatibility analysis
  - Occasion-specific outfit filtering (casual, business, formal, athletic)
  - AI-powered fashion advice using natural language chat

- **Weather Integration**
  - Real-time weather data from OpenWeather API
  - 7-day forecast for weekly outfit planning
  - Temperature-appropriate clothing recommendations
  - Precipitation alerts and rain gear suggestions

- **User Preferences**
  - Customizable style preferences
  - Favorite outfits and combinations
  - Preferred colors and styles
  - Size and fit preferences

### Technical Features

- **Microservices Architecture**: 4 independent services with clear boundaries
- **Message Queues**: Asynchronous processing with RabbitMQ
- **Container Orchestration**: Kubernetes deployment with auto-scaling
- **Image Storage**: MongoDB GridFS for efficient image management
- **CI/CD Pipeline**: Automated testing and deployment
- **Monitoring**: Health checks and logging

---

## 🏗️ Architecture

Closet-X follows cloud-native microservices architecture with **4 core services**, **3 background workers**, and **asynchronous message processing** via RabbitMQ.

### High-Level Overview

```
React Frontend (Vite + Tailwind)
         ↓
   Kubernetes Ingress
         ↓
┌────────────────────────────┐
│  Microservices Layer       │
│  - User Service (Auth)     │
│  - Wardrobe Service        │
│  - Outfit Service          │
│  - AI Advice Service       │
└────────────────────────────┘
         ↓
    RabbitMQ Queue
         ↓
┌────────────────────────────┐
│  Background Workers        │
│  - Image Processor         │
│  - Outfit Generator        │
│  - Fashion Advisor         │
└────────────────────────────┘
         ↓
  MongoDB + GridFS
```

**For detailed architecture diagrams and component relationships, see:**
- 📐 **[Architecture Documentation](docs/ARCHITECTURE.md)** - PlantUML diagrams, service communication flows, and design decisions

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **HTTP Client**: Axios
- **Routing**: React Router v6

### Backend Services
- **Runtime**: Node.js 18 LTS
- **Framework**: Express.js
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Image Processing**: Multer, Sharp
- **Testing**: Jest, Supertest

### Workers
- **Message Queue**: RabbitMQ (amqplib)
- **AI/ML**: Google Vision API, Ollama (local LLM)

### Database
- **Primary Database**: MongoDB 6.0
- **Image Storage**: MongoDB GridFS
- **ODM**: Mongoose

### External APIs
- **Weather**: OpenWeather API
- **Image Recognition**: Google Vision AI
- **AI Model**: Ollama (llama3.2)

### Infrastructure
- **Container Runtime**: Docker 24.0
- **Orchestration**: Kubernetes 1.28
- **Registry**: Harbor (private registry)
- **CI/CD**: GitHub Actions
- **Reverse Proxy**: Nginx Ingress Controller

---

## 🚀 Quick Start

### For Users
Visit [https://kates-closetx.javajon.duckdns.org/](https://kates-closetx.javajon.duckdns.org/) and log in with demo credentials. See [User Guide](USER_GUIDE.md) for features.

### For Developers

**Local Development:**
```bash
git clone https://github.com/HannaSaffi/Closet-X.git
cd Closet-X
npm install
docker-compose up -d  # Start MongoDB + RabbitMQ
npm run dev           # Start all services
```

**Kubernetes Deployment:**
```bash
# Build and push containers
./build-and-push.sh

# Deploy to Kubernetes
kubectl apply -f k8s/homelab/
```

**Detailed Instructions:**
- 🔨 [Build Instructions](docs/BUILD_INSTRUCTIONS.md) - Build containers for Harbor
- 🚀 [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) - Deploy to Kubernetes clusters

---

## 👥 Team

### Team Kates

- **Hanna Saffi** - Frontend Development, AI Integration, Workers
- **Kuany Kuany** - DevOps, CI/CD Pipeline, Infrastructure
- **Ale Apostolo** - Backend Services, Database Design, Testing

### Course Information

- **Course**: CPSC 415 - Building Cloud Native Apps
- **Semester**: Fall 2024
- **Institution**: Trinity College
- **Instructor**: Professor Jonathan Johnson
- **Presentation Date**: December 9, 2024

---

## 🗺️ Project Structure

```
Closet-X/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   └── services/        # API client services
│   └── Dockerfile
├── services/                 # Microservices
│   ├── user-service/        # Authentication & user management
│   ├── wardrobe-service/    # Clothing item management
│   ├── outfit-service/      # Outfit recommendations
│   └── ai-advice-service/   # AI-powered fashion advice
├── workers/                  # Background workers
│   ├── image-processor/     # Image analysis with Google Vision
│   ├── outfit-generator/    # Outfit combination logic
│   └── fashion-advice/      # AI fashion recommendations
├── k8s/                      # Kubernetes manifests
│   ├── homelab/             # Homelab cluster configs
│   └── gke/                 # Google Kubernetes Engine configs
├── docs/                     # Documentation
│   ├── API_DOCUMENTATION.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── TESTING.md
│   └── diagrams/            # PlantUML architecture diagrams
├── USER_GUIDE.md            # End-user documentation
└── README.md                # This file
```

---

## 📊 Key Metrics

- **Test Coverage**: 28.33% overall
  - User Service: 64%
  - Outfit Service: 28%
  - Controllers: 97%
- **Total Tests**: 301 passing
- **Container Images**: 7 services
- **Kubernetes Pods**: 10 running
- **API Endpoints**: 25+
- **Database Collections**: 5

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenWeather API** for weather data
- **Google Vision AI** for image recognition
- **Gemini** for local LLM capabilities
- **Harbor** for private container registry
- **Kubernetes** community for excellent documentation
- **Professor Jonathan Johnson** for guidance and support

---

**Built with ❤️ by Team Kates | Trinity College | Fall 2024**
