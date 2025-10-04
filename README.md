# 👗 Closet-X - Your Digital Closet Assistant

> AI-powered wardrobe management app that helps you organize your closet, get outfit suggestions, and make smarter fashion decisions based on weather and usage patterns.

## 🌟 Overview

Closet-X is a digital closet web and mobile application that revolutionizes how you manage your wardrobe. Upload photos of your clothing items and let AI handle the rest! Get personalized outfit suggestions, track your most-worn items, receive weather-based recommendations, and even get suggestions on items you might want to sell.

## ✨ Key Features

- 📸 **Photo Upload** - Easily upload or take photos of your clothing items
- 🤖 **AI-Powered Outfit Suggestions** - Get fashion-forward outfit combinations based on your wardrobe
- 🌤️ **Weather Integration** - Receive outfit recommendations tailored to current weather conditions
- 📊 **Usage Tracking** - See which items you wear most and least frequently
- 💰 **Smart Sell Suggestions** - Get notified about items you rarely wear that could be sold
- 🎨 **Fashion Trend Analysis** - AI integrates with Pinterest and fashion datasets for trendy suggestions
- 📱 **Cross-Platform** - Access your digital closet on web and mobile devices

## 🛠️ Tech Stack

### Frontend
- **Web App**: React.js
- **Mobile App**: React Native / Flutter
- **Styling**: Material-UI / Tailwind CSS
- **State Management**: React Context / Redux

### Backend
- **Server**: Node.js + Express
- **Authentication**: JWT, OAuth (Google/Facebook)
- **Image Storage**: Multer / Amazon S3
- **AI/ML**: IBM Watson / Clarifai / Google Vision AI
- **Weather API**: OpenWeather / Weatherstack
- **Fashion Data**: Pinterest API

### Database
- **Database**: MongoDB (NoSQL)

### Testing
- **Frontend**: React Testing Library
- **Backend**: Jest / Mocha
- **API Testing**: Postman

## 📋 Project Structure

```
Closet-X/
├── frontend/           # React web app
├── mobile/            # React Native mobile app
├── backend/           # Node.js API
├── database/          # MongoDB schemas and models
└── docs/              # Documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone git@github.com:HannaSaffi/Closet-X.git
cd Closet-X
```

2. Install dependencies for frontend
```bash
cd frontend
npm install
```

3. Install dependencies for backend
```bash
cd ../backend
npm install
```

4. Set up environment variables
```bash
cp .env.example .env
# Add your API keys and configuration
```

5. Start MongoDB
```bash
mongod
```

6. Run the development servers
```bash
# Backend
cd backend
npm run dev

# Frontend (in a new terminal)
cd frontend
npm start
```

## 📱 Features Breakdown

### 🖥️ Frontend (React Web & Mobile)

#### Web App Components
- **Clothing Upload**: Drag-and-drop interface with image preview
- **Closet Display**: Grid/list view with filtering by type, color, season
- **Outfit Suggestions**: AI-generated outfit ideas with fashion inspiration
- **Most-Worn Tracker**: Visual analytics of frequently worn items
- **Sell Suggestions**: Smart recommendations for underutilized items
- **Weather Integration**: Real-time outfit suggestions based on weather

#### Mobile App
- Cross-platform iOS/Android support
- Built-in camera functionality for direct photo capture
- Optimized UI for smaller screens
- Push notifications for outfit reminders

### 🔧 Backend (Node.js)

#### API Endpoints
- User authentication and registration
- Image upload and storage
- Closet management (CRUD operations)
- Outfit generation
- Weather-based recommendations
- Usage tracking and analytics

#### AI Integration
- **Image Recognition**: Automatic clothing categorization (shirts, pants, jackets, etc.)
- **Fashion Prediction**: Trend-based outfit combinations
- **Usage Analytics**: Track wear patterns and suggest items to sell
- **Weather Matching**: Context-aware outfit recommendations

### 🗄️ Database (MongoDB)

#### Collections
- **Users**: User profiles, preferences, authentication
- **Clothes**: Item metadata, images, usage tracking
- **Outfits**: Generated outfit combinations
- **Usage History**: Wear patterns and timestamps

#### Example Schemas
```javascript
Clothing: { 
  imageURL, 
  category, 
  color, 
  fabric, 
  dateUploaded, 
  wearCount, 
  tags 
}

Outfit: { 
  outfitName, 
  clothingItems[], 
  generatedTime, 
  fashionRating, 
  userId 
}
```

## 🎯 Roadmap

- [ ] Complete frontend UI components
- [ ] Implement backend API endpoints
- [ ] Integrate AI fashion prediction model
- [ ] Connect weather API
- [ ] Build usage tracking algorithm
- [ ] Develop mobile app
- [ ] Add payment gateway for selling features
- [ ] Implement push notifications
- [ ] Launch beta testing

## 🤝 Contributing

This is a team project with 3 developers. Please follow these guidelines:

1. Create a new branch for each feature
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes and commit
```bash
git add .
git commit -m "Add: description of your changes"
```

3. Push your branch
```bash
git push origin feature/your-feature-name
```

4. Create a Pull Request for review

## 📝 License

This project is licensed under the MIT License.

## 👥 Team

- Developer 1
- Developer 2  
- Developer 3

## 📧 Contact

For questions or suggestions, please open an issue or contact the team.

---

Made with ❤️ and AI by the Closet-X Team
