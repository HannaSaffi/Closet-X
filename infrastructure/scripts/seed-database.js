// infrastructure/scripts/seed-database.js
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../../services/user-service/src/models/User');
const Clothing = require('../../services/wardrobe-service/src/models/Clothing');
const Outfit = require('../../services/outfit-service/src/models/Outfit');
const UsageHistory = require('../../services/outfit-service/src/models/UsageHistory');

// Sample data
const sampleUsers = [
  {
    email: 'demo@closetx.com',
    password: 'Demo123456!',
    name: 'Demo User',
    preferences: {
      style: 'casual',
      favoriteColors: ['blue', 'black', 'white'],
      weatherPreferences: {
        coldTolerance: 'medium',
        rainPreference: 'avoid'
      },
      sizes: {
        top: 'M',
        bottom: '32',
        shoes: '10'
      }
    }
  },
  {
    email: 'jane@closetx.com',
    password: 'Jane123456!',
    name: 'Jane Fashionista',
    preferences: {
      style: 'trendy',
      favoriteColors: ['pink', 'purple', 'gold'],
      weatherPreferences: {
        coldTolerance: 'low',
        rainPreference: 'neutral'
      },
      sizes: {
        top: 'S',
        bottom: '28',
        shoes: '8'
      }
    }
  }
];

const sampleClothing = (userId) => [
  {
    userId,
    imageURL: 'https://via.placeholder.com/300/0000FF/FFFFFF?text=Blue+T-Shirt',
    category: 'tops',
    subcategory: 't-shirt',
    color: { primary: 'blue', secondary: ['white'], hex: '#0000FF' },
    fabric: 'cotton',
    season: ['spring', 'summer', 'fall'],
    brand: 'Generic Brand',
    size: 'M',
    wearCount: 5,
    tags: ['casual', 'comfortable'],
    occasion: ['casual', 'athletic'],
    aiMetadata: {
      processed: true,
      confidence: 95,
      dominantColors: ['blue', 'white'],
      pattern: 'solid',
      style: ['casual']
    }
  },
  {
    userId,
    imageURL: 'https://via.placeholder.com/300/000000/FFFFFF?text=Black+Jeans',
    category: 'bottoms',
    subcategory: 'jeans',
    color: { primary: 'black', hex: '#000000' },
    fabric: 'denim',
    season: ['fall', 'winter', 'spring'],
    brand: 'Levi\'s',
    size: '32',
    wearCount: 10,
    tags: ['casual', 'versatile'],
    occasion: ['casual', 'work'],
    aiMetadata: {
      processed: true,
      confidence: 98,
      dominantColors: ['black'],
      pattern: 'solid',
      style: ['casual']
    }
  },
  {
    userId,
    imageURL: 'https://via.placeholder.com/300/8B4513/FFFFFF?text=Leather+Jacket',
    category: 'outerwear',
    subcategory: 'jacket',
    color: { primary: 'brown', hex: '#8B4513' },
    fabric: 'leather',
    season: ['fall', 'winter'],
    brand: 'Wilson',
    size: 'M',
    wearCount: 3,
    tags: ['stylish', 'warm'],
    occasion: ['casual', 'party'],
    aiMetadata: {
      processed: true,
      confidence: 92,
      dominantColors: ['brown'],
      pattern: 'solid',
      style: ['casual', 'formal']
    }
  },
  {
    userId,
    imageURL: 'https://via.placeholder.com/300/FFFFFF/000000?text=White+Sneakers',
    category: 'shoes',
    subcategory: 'sneakers',
    color: { primary: 'white', hex: '#FFFFFF' },
    fabric: 'synthetic',
    season: ['all-season'],
    brand: 'Nike',
    size: '10',
    wearCount: 15,
    tags: ['comfortable', 'sporty'],
    occasion: ['casual', 'athletic'],
    aiMetadata: {
      processed: true,
      confidence: 96,
      dominantColors: ['white'],
      pattern: 'solid',
      style: ['sporty', 'casual']
    }
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/closetx', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Clothing.deleteMany({});
    await Outfit.deleteMany({});
    await UsageHistory.deleteMany({});
    console.log('✅ Existing data cleared\n');

    // Seed Users
    console.log('👤 Seeding users...');
    const users = await User.insertMany(sampleUsers);
    console.log(`✅ Created ${users.length} users\n`);

    // Seed Clothing for each user
    console.log('👕 Seeding clothing items...');
    let allClothingItems = [];
    for (const user of users) {
      const clothing = sampleClothing(user._id);
      const createdClothing = await Clothing.insertMany(clothing);
      allClothingItems.push(...createdClothing);
      console.log(`  ✅ Created ${createdClothing.length} items for ${user.name}`);
    }
    console.log(`✅ Total clothing items created: ${allClothingItems.length}\n`);

    // Seed Outfits
    console.log('👔 Seeding outfits...');
    const outfits = [];
    for (const user of users) {
      const userClothing = allClothingItems.filter(
        item => item.userId.toString() === user._id.toString()
      );
      
      if (userClothing.length >= 3) {
        const outfit = {
          userId: user._id,
          outfitName: 'Casual Day Out',
          clothingItems: [
            userClothing[0]._id, // Top
            userClothing[1]._id, // Bottom
            userClothing[3]._id  // Shoes
          ],
          occasion: 'casual',
          weatherCondition: {
            condition: 'sunny',
            temperature: { min: 65, max: 75, unit: 'fahrenheit' },
            precipitation: 'none'
          },
          season: 'spring',
          isAIGenerated: true,
          isFavorite: false,
          timesWorn: 2,
          fashionRating: 8,
          tags: ['comfortable', 'everyday'],
          styleProfile: 'casual'
        };
        outfits.push(outfit);
      }
    }
    const createdOutfits = await Outfit.insertMany(outfits);
    console.log(`✅ Created ${createdOutfits.length} outfits\n`);

    // Seed Usage History
    console.log('📊 Seeding usage history...');
    const usageHistory = [];
    for (const outfit of createdOutfits) {
      // Create 2 usage records for each outfit
      for (let i = 0; i < 2; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const wornDate = new Date();
        wornDate.setDate(wornDate.getDate() - daysAgo);
        
        const history = {
          userId: outfit.userId,
          outfitId: outfit._id,
          clothingId: outfit.clothingItems[0], // Reference first item
          wornDate,
          weatherOnDay: {
            condition: 'sunny',
            temperature: { value: 70, unit: 'fahrenheit' },
            humidity: 60,
            windSpeed: 5,
            precipitation: 'none'
          },
          occasion: outfit.occasion,
          rating: {
            comfort: Math.floor(Math.random() * 2) + 4, // 4-5
            style: Math.floor(Math.random() * 2) + 4,
            appropriateness: 5
          },
          feedback: {
            tooHot: false,
            tooCold: false,
            uncomfortable: false,
            receivedCompliments: Math.random() > 0.5,
            feltConfident: true,
            wouldWearAgain: true
          }
        };
        usageHistory.push(history);
      }
    }
    const createdHistory = await UsageHistory.insertMany(usageHistory);
    console.log(`✅ Created ${createdHistory.length} usage history records\n`);

    // Print summary
    console.log('📈 Database Seeding Summary:');
    console.log('================================');
    console.log(`👤 Users: ${users.length}`);
    console.log(`👕 Clothing Items: ${allClothingItems.length}`);
    console.log(`👔 Outfits: ${createdOutfits.length}`);
    console.log(`📊 Usage History: ${createdHistory.length}`);
    console.log('================================\n');

    console.log('✨ Database seeding completed successfully!\n');
    console.log('🔐 Demo Credentials:');
    console.log('   Email: demo@closetx.com');
    console.log('   Password: Demo123456!\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
}

// Run seeding
seedDatabase();