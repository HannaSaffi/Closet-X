/**
 * Migration: Initial Schema Setup
 * Creates all necessary collections and indexes
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://closetxuser:supersecurepassword@localhost:27017';

async function up() {
  const client = await MongoClient.connect(MONGO_URI, { useUnifiedTopology: true });
  
  try {
    console.log('🔄 Running migration: Initial Schema Setup');

    // ========== USER DATABASE ==========
    const usersDb = client.db('closetx_users');
    
    // Create users collection with validation
    await usersDb.createCollection('users', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: {
              bsonType: 'string',
              pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
            },
            password: { bsonType: 'string', minLength: 6 },
            name: { bsonType: 'string', minLength: 1 },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' }
          }
        }
      }
    });

    // Create indexes
    await usersDb.collection('users').createIndex({ email: 1 }, { unique: true });
    await usersDb.collection('users').createIndex({ createdAt: -1 });
    console.log('✅ Created users collection and indexes');

    // ========== WARDROBE DATABASE ==========
    const wardrobeDb = client.db('closetx_wardrobe');
    
    // Create clothing collection
    await wardrobeDb.createCollection('clothing', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'category', 'color'],
          properties: {
            userId: { bsonType: 'string' },
            category: {
              enum: ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories']
            },
            color: {
              bsonType: 'object',
              required: ['primary'],
              properties: {
                primary: { bsonType: 'string' },
                secondary: { bsonType: 'string' }
              }
            },
            season: {
              bsonType: 'array',
              items: {
                enum: ['spring', 'summer', 'fall', 'winter', 'all-season']
              }
            },
            isActive: { bsonType: 'bool' }
          }
        }
      }
    });

    // Create indexes
    await wardrobeDb.collection('clothing').createIndex({ userId: 1 });
    await wardrobeDb.collection('clothing').createIndex({ userId: 1, category: 1 });
    await wardrobeDb.collection('clothing').createIndex({ userId: 1, isActive: 1 });
    await wardrobeDb.collection('clothing').createIndex({ createdAt: -1 });
    console.log('✅ Created clothing collection and indexes');

    // ========== OUTFIT DATABASE ==========
    const outfitsDb = client.db('closetx_outfits');
    
    // Create outfits collection
    await outfitsDb.createCollection('outfits');
    await outfitsDb.collection('outfits').createIndex({ userId: 1 });
    await outfitsDb.collection('outfits').createIndex({ createdAt: -1 });
    console.log('✅ Created outfits collection and indexes');

    // Create usage history collection
    await outfitsDb.createCollection('usage_history');
    await outfitsDb.collection('usage_history').createIndex({ userId: 1, wornDate: -1 });
    await outfitsDb.collection('usage_history').createIndex({ clothingId: 1 });
    console.log('✅ Created usage_history collection and indexes');

    // ========== AI DATABASE ==========
    const aiDb = client.db('closetx_ai');
    
    // Create fashion_advice collection
    await aiDb.createCollection('fashion_advice');
    await aiDb.collection('fashion_advice').createIndex({ user_id: 1, created_at: -1 });
    console.log('✅ Created fashion_advice collection and indexes');

    // Create image_analyses collection
    await aiDb.createCollection('image_analyses');
    await aiDb.collection('image_analyses').createIndex({ user_id: 1 });
    console.log('✅ Created image_analyses collection and indexes');

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

async function down() {
  const client = await MongoClient.connect(MONGO_URI, { useUnifiedTopology: true });
  
  try {
    console.log('🔄 Rolling back migration: Initial Schema Setup');

    await client.db('closetx_users').dropDatabase();
    await client.db('closetx_wardrobe').dropDatabase();
    await client.db('closetx_outfits').dropDatabase();
    await client.db('closetx_ai').dropDatabase();

    console.log('✅ Rollback completed successfully!');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

module.exports = { up, down };

// Run migration if executed directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'up') {
    up().then(() => process.exit(0)).catch(() => process.exit(1));
  } else if (command === 'down') {
    down().then(() => process.exit(0)).catch(() => process.exit(1));
  } else {
    console.log('Usage: node 001_initial_schema.js [up|down]');
    process.exit(1);
  }
}
