// infrastructure/scripts/mongo-init.js
// This script initializes MongoDB databases and creates users

db = db.getSiblingDB('admin');

// Create databases and users for each microservice
const databases = [
  { name: 'closetx_users', user: 'user_service' },
  { name: 'closetx_wardrobe', user: 'wardrobe_service' },
  { name: 'closetx_outfits', user: 'outfit_service' }
];

databases.forEach(database => {
  db = db.getSiblingDB(database.name);
  
  // Create user with read/write permissions
  db.createUser({
    user: database.user,
    pwd: 'service_password_123',
    roles: [
      {
        role: 'readWrite',
        db: database.name
      }
    ]
  });
  
  print(`✅ Created database: ${database.name} with user: ${database.user}`);
});

// Create indexes for better performance
print('\n📊 Creating indexes...');

// User database indexes
db = db.getSiblingDB('closetx_users');
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: -1 });
print('✅ User indexes created');

// Wardrobe database indexes
db = db.getSiblingDB('closetx_wardrobe');
db.clothings.createIndex({ userId: 1, category: 1 });
db.clothings.createIndex({ userId: 1, wearCount: -1 });
db.clothings.createIndex({ userId: 1, lastWorn: -1 });
db.clothings.createIndex({ userId: 1, isActive: 1 });
print('✅ Wardrobe indexes created');

// Outfit database indexes
db = db.getSiblingDB('closetx_outfits');
db.outfits.createIndex({ userId: 1, occasion: 1 });
db.outfits.createIndex({ userId: 1, season: 1 });
db.outfits.createIndex({ userId: 1, isFavorite: 1 });
db.usagehistories.createIndex({ userId: 1, wornDate: -1 });
db.usagehistories.createIndex({ clothingId: 1, wornDate: -1 });
print('✅ Outfit indexes created');

print('\n🎉 MongoDB initialization completed!');