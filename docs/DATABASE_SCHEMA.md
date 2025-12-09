# Closet-X Database Schema Documentation

**Version:** 1.0  
**Last Updated:** November 25, 2025  
**Database:** MongoDB 6.0  
**Team:** Team Kates

---

## Table of Contents

1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [Entity Relationship Diagram](#entity-relationship-diagram)
4. [Schema Definitions](#schema-definitions)
5. [GridFS Architecture](#gridfs-architecture)
6. [Indexes & Performance](#indexes--performance)
7. [Data Relationships](#data-relationships)
8. [Migration Scripts](#migration-scripts)

---

## Overview

Closet-X uses MongoDB as its primary database with a **database-per-service** architecture. Each microservice maintains its own database with complete data ownership. Services communicate via APIs, never through direct database access.

### **Database Strategy**

- **Type**: Document-based (MongoDB)
- **Pattern**: Database per microservice
- **Isolation**: Each service owns its data
- **Communication**: REST APIs only (no shared databases)
- **Consistency**: Eventual consistency model

### **Databases**

1. **closetx_users** - User authentication and profiles
2. **closetx_wardrobe** - Clothing items and images (with GridFS)
3. **closetx_outfits** - Saved outfits and generation history

---

## Database Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                  MongoDB Instance (Port 27017)                 │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Database: closetx_users                                  │ │
│  │  Owner: user-service                                      │ │
│  │                                                           │ │
│  │  Collections:                                             │ │
│  │    └─ users (authentication, profiles, preferences)       │ │
│  │                                                           │ │
│  │  Size: ~1MB per 1000 users                                │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Database: closetx_wardrobe                               │ │
│  │  Owner: wardrobe-service                                  │ │
│  │                                                           │ │
│  │  Collections:                                             │ │
│  │    ├─ clothingitems (clothing metadata)                   │ │
│  │    ├─ fs.files (GridFS file metadata)                     │ │
│  │    └─ fs.chunks (GridFS binary chunks)                    │ │
│  │                                                           │ │
│  │  Size: ~50MB per 1000 items (with images)                 │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Database: closetx_outfits                                │ │
│  │  Owner: outfit-service                                    │ │
│  │                                                           │ │
│  │  Collections:                                             │ │
│  │    ├─ outfits (saved outfits)                             │ │
│  │    └─ outfithistory (generation history)                  │ │
│  │                                                           │ │
│  │  Size: ~5MB per 1000 outfits                              │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Entity Relationship Diagram

### **Complete System ER Diagram**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLOSETX_USERS DATABASE                          │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────┐    │
│  │                         User Entity                            │    │
│  ├───────────────────────────────────────────────────────────────┤    │
│  │ _id: ObjectId (PK)                                            │    │
│  │ email: String (UNIQUE, INDEXED)                               │    │
│  │ password: String (bcrypt hashed)                              │    │
│  │ username: String                                              │    │
│  │ preferences: {                                                │    │
│  │   favoriteColors: [String]                                    │    │
│  │   favoriteStyles: [String]                                    │    │
│  │   sizes: {                                                    │    │
│  │     tops: String                                              │    │
│  │     bottoms: String                                           │    │
│  │     shoes: String                                             │    │
│  │   }                                                           │    │
│  │ }                                                             │    │
│  │ createdAt: Date                                               │    │
│  │ updatedAt: Date                                               │    │
│  └───────────────────────────────────────────────────────────────┘    │
│                                                                         │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             │ Referenced by userId (not enforced FK)
                             │
        ┌────────────────────┴─────────────────────┐
        │                                          │
        ▼                                          ▼
┌─────────────────────────────────────┐  ┌─────────────────────────────────┐
│   CLOSETX_WARDROBE DATABASE         │  │   CLOSETX_OUTFITS DATABASE      │
│                                     │  │                                 │
│  ┌──────────────────────────────┐  │  │  ┌──────────────────────────┐  │
│  │   ClothingItem Entity        │  │  │  │   Outfit Entity          │  │
│  ├──────────────────────────────┤  │  │  ├──────────────────────────┤  │
│  │ _id: ObjectId (PK)           │  │  │  │ _id: ObjectId (PK)       │  │
│  │ userId: ObjectId (INDEXED)   │──┼──┼──│ userId: ObjectId (INDEX) │  │
│  │ category: String             │  │  │  │ items: [                 │  │
│  │ color: {                     │  │  │  │   {                      │  │
│  │   primary: String            │  │  │  │     itemId: ObjectId ────┼──┤
│  │   secondary: [String]        │  │  │  │     category: String     │  │
│  │ }                            │  │  │  │     imageUrl: String     │  │
│  │ brand: String                │  │  │  │     color: Object        │  │
│  │ season: [String]             │  │  │  │   }                      │  │
│  │ occasion: [String]           │  │  │  │ ]                        │  │
│  │ style: [String]              │  │  │  │ weather: {               │  │
│  │ tags: [String]               │  │  │  │   temp: Number           │  │
│  │ imageUrl: String (GridFS ID) │──┼──┼──│   condition: String      │  │
│  │ thumbnailUrl: String         │  │  │  │   city: String           │  │
│  │ aiAnalysis: {                │  │  │  │ }                        │  │
│  │   category: String           │  │  │  │ occasion: String         │  │
│  │   colors: [String]           │  │  │  │ score: Number            │  │
│  │   style: String              │  │  │  │ colorHarmony: Number     │  │
│  │   fabric: String             │  │  │  │ styleMatch: Number       │  │
│  │   confidence: Number         │  │  │  │ weatherScore: Number     │  │
│  │   analyzedAt: Date           │  │  │  │ isFavorite: Boolean      │  │
│  │ }                            │  │  │  │ createdAt: Date          │  │
│  │ purchaseDate: Date           │  │  │  │ updatedAt: Date          │  │
│  │ price: Number                │  │  │  └──────────────────────────┘  │
│  │ wearCount: Number            │  │  │                                 │
│  │ createdAt: Date              │  │  │  ┌──────────────────────────┐  │
│  │ updatedAt: Date              │  │  │  │ OutfitHistory Entity     │  │
│  └──────────┬───────────────────┘  │  │  ├──────────────────────────┤  │
│             │                      │  │  │ _id: ObjectId (PK)       │  │
│             │ References           │  │  │ userId: ObjectId (INDEX) │  │
│             ▼                      │  │  │ outfit: Object           │  │
│  ┌──────────────────────────────┐  │  │  │ requestData: {           │  │
│  │   GridFS (fs.files)          │  │  │  │   city: String           │  │
│  ├──────────────────────────────┤  │  │  │   occasion: String       │  │
│  │ _id: ObjectId (PK)           │  │  │  │   includeAI: Boolean     │  │
│  │ length: Number               │  │  │  │ }                        │  │
│  │ chunkSize: Number            │  │  │  │ generatedAt: Date        │  │
│  │ uploadDate: Date             │  │  │  │ aiAdvice: String         │  │
│  │ filename: String             │  │  │  └──────────────────────────┘  │
│  │ contentType: String          │  │  │                                 │
│  │ metadata: {                  │  │  └─────────────────────────────────┘
│  │   userId: ObjectId           │  │
│  │   itemId: ObjectId           │  │
│  │   type: String               │  │
│  │ }                            │  │
│  └──────────┬───────────────────┘  │
│             │                      │
│             │ Splits into          │
│             ▼                      │
│  ┌──────────────────────────────┐  │
│  │   GridFS (fs.chunks)         │  │
│  ├──────────────────────────────┤  │
│  │ _id: ObjectId (PK)           │  │
│  │ files_id: ObjectId (FK)      │──┤
│  │ n: Number (chunk number)     │  │
│  │ data: Binary (255KB max)     │  │
│  └──────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘

Legend:
─────  Reference (not enforced FK in MongoDB)
PK     Primary Key (_id in MongoDB)
FK     Foreign Key reference
INDEX  Indexed field for performance
```

### **Simplified Relationship Diagram**

```
     User (closetx_users)
          │
          │ 1
          │
          │ owns
          │
    ┌─────┴─────┐
    │           │
    │ *         │ *
    │           │
    ▼           ▼
ClothingItem  Outfit
(wardrobe)   (outfits)
    │
    │ 1
    │
    │ stored in
    │
    │ *
    ▼
 GridFS
(fs.files + fs.chunks)


Cardinality:
- User : ClothingItem = 1:N (one user, many items)
- User : Outfit = 1:N (one user, many outfits)
- ClothingItem : GridFS = 1:2 (one item, two images: full + thumbnail)
- Outfit : ClothingItem = N:M (many outfits reference many items)
```

---

## Schema Definitions

### **1. User Schema (closetx_users.users)**

```javascript
const userSchema = new Schema({
  // Primary identifier
  _id: {
    type: Schema.Types.ObjectId,
    auto: true
  },
  
  // Authentication fields
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  
  password: {
    type: String,
    required: true,
    minlength: 8,
    // Stored as bcrypt hash: $2b$10$...
  },
  
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  
  // Style preferences
  preferences: {
    favoriteColors: {
      type: [String],
      default: [],
      enum: ['red', 'blue', 'green', 'yellow', 'black', 'white', 
             'gray', 'brown', 'pink', 'purple', 'orange', 'beige']
    },
    
    favoriteStyles: {
      type: [String],
      default: [],
      enum: ['casual', 'formal', 'business', 'athletic', 'vintage', 
             'modern', 'bohemian', 'preppy']
    },
    
    sizes: {
      tops: {
        type: String,
        enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']
      },
      bottoms: {
        type: String,
        enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']
      },
      shoes: {
        type: String
        // US sizes: 5-15
      }
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Auto-manage createdAt/updatedAt
  collection: 'users'
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });

// Pre-save hook: Hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method: Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
```

**Example Document**:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "email": "john.doe@example.com",
  "password": "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
  "username": "johndoe",
  "preferences": {
    "favoriteColors": ["blue", "black", "white"],
    "favoriteStyles": ["casual", "business"],
    "sizes": {
      "tops": "M",
      "bottoms": "L",
      "shoes": "10"
    }
  },
  "createdAt": "2024-11-01T10:30:00.000Z",
  "updatedAt": "2024-11-20T15:45:00.000Z"
}
```

**Storage Size**: ~500 bytes per user

---

### **2. ClothingItem Schema (closetx_wardrobe.clothingitems)**

```javascript
const clothingItemSchema = new Schema({
  // Primary identifier
  _id: {
    type: Schema.Types.ObjectId,
    auto: true
  },
  
  // User reference (NOT enforced foreign key)
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
    // References: closetx_users.users._id
    // But MongoDB doesn't enforce this relationship
  },
  
  // Clothing attributes
  category: {
    type: String,
    required: true,
    enum: ['tops', 'bottoms', 'shoes', 'outerwear', 'accessories', 
           'dresses', 'suits', 'activewear'],
    index: true
  },
  
  color: {
    primary: {
      type: String,
      required: true,
      index: true
    },
    secondary: {
      type: [String],
      default: []
    }
  },
  
  brand: {
    type: String,
    trim: true
  },
  
  season: {
    type: [String],
    default: ['all'],
    enum: ['summer', 'winter', 'spring', 'fall', 'all']
  },
  
  occasion: {
    type: [String],
    default: ['casual'],
    enum: ['casual', 'business', 'formal', 'athletic', 'party', 'outdoor']
  },
  
  style: {
    type: [String],
    default: ['casual'],
    enum: ['casual', 'formal', 'business', 'athletic', 'vintage', 
           'modern', 'bohemian', 'preppy', 'streetwear']
  },
  
  tags: {
    type: [String],
    default: []
  },
  
  // Image storage (GridFS references)
  imageUrl: {
    type: String,
    required: true
    // Format: /gridfs/<file_id>
    // Points to fs.files._id
  },
  
  thumbnailUrl: {
    type: String,
    required: true
    // Format: /gridfs/<file_id>
    // Points to fs.files._id for thumbnail
  },
  
  // AI Analysis results
  aiAnalysis: {
    category: String,
    colors: [String],
    style: String,
    fabric: String,
    occasion: [String],
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    labels: [String],
    analyzedAt: Date
  },
  
  // Shopping/usage data
  purchaseDate: Date,
  
  price: {
    type: Number,
    min: 0
  },
  
  wearCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  lastWornDate: Date,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'clothingitems'
});

// Compound indexes for common queries
clothingItemSchema.index({ userId: 1, category: 1 });
clothingItemSchema.index({ userId: 1, 'color.primary': 1 });
clothingItemSchema.index({ userId: 1, season: 1 });
clothingItemSchema.index({ userId: 1, occasion: 1 });
clothingItemSchema.index({ userId: 1, createdAt: -1 });
```

**Example Document**:
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439011",
  "category": "tops",
  "color": {
    "primary": "blue",
    "secondary": ["white"]
  },
  "brand": "Nike",
  "season": ["summer", "spring"],
  "occasion": ["casual", "athletic"],
  "style": ["casual", "athletic"],
  "tags": ["t-shirt", "workout", "favorite"],
  "imageUrl": "/gridfs/507f1f77bcf86cd799439013",
  "thumbnailUrl": "/gridfs/507f1f77bcf86cd799439014",
  "aiAnalysis": {
    "category": "tops",
    "colors": ["blue", "white"],
    "style": "casual",
    "fabric": "cotton",
    "occasion": ["casual", "athletic"],
    "confidence": 0.95,
    "labels": ["t-shirt", "clothing", "apparel", "blue", "sportswear"],
    "analyzedAt": "2024-11-15T14:30:00.000Z"
  },
  "purchaseDate": "2024-06-15T00:00:00.000Z",
  "price": 29.99,
  "wearCount": 12,
  "lastWornDate": "2024-11-20T00:00:00.000Z",
  "createdAt": "2024-11-15T14:25:00.000Z",
  "updatedAt": "2024-11-20T08:00:00.000Z"
}
```

**Storage Size**: ~1KB per item (without images, images in GridFS)

---

### **3. Outfit Schema (closetx_outfits.outfits)**

```javascript
const outfitSchema = new Schema({
  // Primary identifier
  _id: {
    type: Schema.Types.ObjectId,
    auto: true
  },
  
  // User reference
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
    // References: closetx_users.users._id
  },
  
  // Outfit items (references to ClothingItems)
  items: [{
    itemId: {
      type: Schema.Types.ObjectId,
      required: true
      // References: closetx_wardrobe.clothingitems._id
      // Stored for quick lookup, but not enforced
    },
    category: String,
    imageUrl: String,
    color: {
      primary: String,
      secondary: [String]
    },
    style: [String]
  }],
  
  // Weather context
  weather: {
    temp: Number,
    condition: String,
    description: String,
    city: String,
    date: Date
  },
  
  // Outfit metadata
  occasion: {
    type: String,
    enum: ['casual', 'business', 'formal', 'athletic', 'party', 'outdoor']
  },
  
  // Scoring
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  
  colorHarmony: {
    type: Number,
    min: 0,
    max: 1
  },
  
  styleMatch: {
    type: Number,
    min: 0,
    max: 1
  },
  
  weatherScore: {
    type: Number,
    min: 0,
    max: 1
  },
  
  // User interaction
  isFavorite: {
    type: Boolean,
    default: false
  },
  
  wornCount: {
    type: Number,
    default: 0
  },
  
  lastWornDate: Date,
  
  // AI advice
  aiAdvice: String,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'outfits'
});

// Indexes
outfitSchema.index({ userId: 1, createdAt: -1 });
outfitSchema.index({ userId: 1, isFavorite: 1 });
outfitSchema.index({ userId: 1, occasion: 1 });
```

**Example Document**:
```json
{
  "_id": "507f1f77bcf86cd799439020",
  "userId": "507f1f77bcf86cd799439011",
  "items": [
    {
      "itemId": "507f1f77bcf86cd799439012",
      "category": "tops",
      "imageUrl": "/gridfs/507f1f77bcf86cd799439013",
      "color": {
        "primary": "blue",
        "secondary": ["white"]
      },
      "style": ["casual"]
    },
    {
      "itemId": "507f1f77bcf86cd799439015",
      "category": "bottoms",
      "imageUrl": "/gridfs/507f1f77bcf86cd799439016",
      "color": {
        "primary": "black",
        "secondary": []
      },
      "style": ["casual"]
    },
    {
      "itemId": "507f1f77bcf86cd799439018",
      "category": "shoes",
      "imageUrl": "/gridfs/507f1f77bcf86cd799439019",
      "color": {
        "primary": "white",
        "secondary": []
      },
      "style": ["athletic"]
    }
  ],
  "weather": {
    "temp": 72,
    "condition": "Clear",
    "description": "clear sky",
    "city": "Hartford",
    "date": "2024-11-25T12:00:00.000Z"
  },
  "occasion": "casual",
  "score": 87,
  "colorHarmony": 0.92,
  "styleMatch": 0.88,
  "weatherScore": 0.85,
  "isFavorite": true,
  "wornCount": 3,
  "lastWornDate": "2024-11-24T00:00:00.000Z",
  "aiAdvice": "This is a great casual outfit for mild weather. The blue top pairs well with neutral black bottoms, and white shoes add a fresh touch. Consider adding a light jacket if you'll be out in the evening.",
  "createdAt": "2024-11-25T12:15:00.000Z",
  "updatedAt": "2024-11-25T12:15:00.000Z"
}
```

**Storage Size**: ~2KB per outfit

---

### **4. OutfitHistory Schema (closetx_outfits.outfithistory)**

```javascript
const outfitHistorySchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    auto: true
  },
  
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  
  outfit: {
    type: Schema.Types.Mixed,
    required: true
    // Complete outfit object at time of generation
  },
  
  requestData: {
    city: String,
    occasion: String,
    includeAI: Boolean,
    preferences: Schema.Types.Mixed
  },
  
  generatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  aiAdvice: String
}, {
  collection: 'outfithistory'
});

// TTL index: Auto-delete after 90 days
outfitHistorySchema.index(
  { generatedAt: 1 }, 
  { expireAfterSeconds: 7776000 } // 90 days
);
```

---

## GridFS Architecture

### **GridFS Overview**

GridFS is MongoDB's specification for storing large files. Files are split into chunks (default 255KB) and stored across two collections: `fs.files` (metadata) and `fs.chunks` (binary data).

### **GridFS Schema**

#### **fs.files Collection**

```javascript
{
  _id: ObjectId,              // Unique file identifier
  length: Number,             // File size in bytes
  chunkSize: Number,          // Chunk size (255KB default)
  uploadDate: Date,           // Upload timestamp
  filename: String,           // Original filename
  contentType: String,        // MIME type (e.g., "image/jpeg")
  metadata: {                 // Custom metadata
    userId: ObjectId,         // Owner of the file
    itemId: ObjectId,         // Associated clothing item
    type: String              // "full" or "thumbnail"
  }
}
```

**Example Document**:
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "length": 2048576,
  "chunkSize": 261120,
  "uploadDate": "2024-11-15T14:25:00.000Z",
  "filename": "blue-tshirt.jpg",
  "contentType": "image/jpeg",
  "metadata": {
    "userId": "507f1f77bcf86cd799439011",
    "itemId": "507f1f77bcf86cd799439012",
    "type": "full"
  }
}
```

#### **fs.chunks Collection**

```javascript
{
  _id: ObjectId,              // Unique chunk identifier
  files_id: ObjectId,         // Reference to fs.files._id
  n: Number,                  // Chunk number (0-indexed)
  data: Binary                // Binary data (max 255KB)
}
```

**Example Documents** (2MB file split into 8 chunks):
```json
[
  {
    "_id": "507f1f77bcf86cd799439030",
    "files_id": "507f1f77bcf86cd799439013",
    "n": 0,
    "data": "<Binary data 255KB>"
  },
  {
    "_id": "507f1f77bcf86cd799439031",
    "files_id": "507f1f77bcf86cd799439013",
    "n": 1,
    "data": "<Binary data 255KB>"
  },
  // ... chunks 2-6 ...
  {
    "_id": "507f1f77bcf86cd799439037",
    "files_id": "507f1f77bcf86cd799439013",
    "n": 7,
    "data": "<Binary data 229KB>"
  }
]
```

### **GridFS Storage Flow**

```
User uploads 2.5MB JPEG photo
         ↓
Multer middleware receives file
         ↓
GridFS createWriteStream()
         ↓
File split into chunks:
  - Chunk 0: 255KB
  - Chunk 1: 255KB
  - Chunk 2: 255KB
  - Chunk 3: 255KB
  - Chunk 4: 255KB
  - Chunk 5: 255KB
  - Chunk 6: 255KB
  - Chunk 7: 255KB
  - Chunk 8: 255KB
  - Chunk 9: 204KB (remainder)
         ↓
Chunks stored in fs.chunks
Metadata stored in fs.files
         ↓
Return file ID: "507f1f77bcf86cd799439013"
         ↓
Store in ClothingItem.imageUrl
```

### **GridFS Retrieval Flow**

```
Client requests image: GET /api/wardrobe/clothing/:id/image
         ↓
Server queries ClothingItem for imageUrl
         ↓
Extract GridFS file ID from imageUrl
         ↓
GridFS createReadStream(fileId)
         ↓
Query fs.files for metadata
         ↓
Query fs.chunks for all chunks (n: 0-9)
         ↓
Reassemble chunks in order
         ↓
Stream binary data to client
         ↓
Client receives complete image
```

---

## Indexes & Performance

### **Index Strategy**

Indexes improve query performance but slow down writes. Our strategy:
- Index frequently queried fields
- Use compound indexes for common filter combinations
- Avoid over-indexing (diminishing returns)

### **User Service Indexes**

```javascript
// Primary key (automatic)
db.users.createIndex({ "_id": 1 });

// Unique email for login
db.users.createIndex({ "email": 1 }, { unique: true });
```

**Query Performance**:
- Login by email: O(log n) - uses index
- Find user by ID: O(1) - primary key lookup

### **Wardrobe Service Indexes**

```javascript
// Primary key (automatic)
db.clothingitems.createIndex({ "_id": 1 });

// User's wardrobe
db.clothingitems.createIndex({ "userId": 1 });

// Filter by category
db.clothingitems.createIndex({ "userId": 1, "category": 1 });

// Filter by color
db.clothingitems.createIndex({ "userId": 1, "color.primary": 1 });

// Filter by season
db.clothingitems.createIndex({ "userId": 1, "season": 1 });

// Filter by occasion
db.clothingitems.createIndex({ "userId": 1, "occasion": 1 });

// Sort by newest
db.clothingitems.createIndex({ "userId": 1, "createdAt": -1 });

// GridFS indexes (automatic)
db.fs.files.createIndex({ "_id": 1 });
db.fs.chunks.createIndex({ "files_id": 1, "n": 1 });
```

**Query Performance Examples**:
```javascript
// Fast: Uses { userId: 1, category: 1 } index
db.clothingitems.find({ userId: "...", category: "tops" });

// Fast: Uses { userId: 1, "color.primary": 1 } index
db.clothingitems.find({ userId: "...", "color.primary": "blue" });

// Slow: No index for brand (full collection scan)
db.clothingitems.find({ userId: "...", brand: "Nike" });

// Solution: Add index if this query is common
db.clothingitems.createIndex({ "userId": 1, "brand": 1 });
```

### **Outfit Service Indexes**

```javascript
// Primary key (automatic)
db.outfits.createIndex({ "_id": 1 });

// User's outfits, sorted by newest
db.outfits.createIndex({ "userId": 1, "createdAt": -1 });

// User's favorite outfits
db.outfits.createIndex({ "userId": 1, "isFavorite": 1 });

// Filter by occasion
db.outfits.createIndex({ "userId": 1, "occasion": 1 });

// OutfitHistory TTL index (auto-deletion after 90 days)
db.outfithistory.createIndex(
  { "generatedAt": 1 }, 
  { expireAfterSeconds: 7776000 }
);
```

### **Index Size Analysis**

```
Collection: users (1000 documents)
  - _id index: ~32KB
  - email index: ~50KB
  - Total: ~82KB

Collection: clothingitems (10,000 documents)
  - _id index: ~320KB
  - userId index: ~320KB
  - userId + category index: ~400KB
  - userId + color.primary index: ~400KB
  - userId + createdAt index: ~400KB
  - Total: ~1.8MB

Collection: fs.files (20,000 documents - 2 per item)
  - _id index: ~640KB
  - Total: ~640KB

Collection: fs.chunks (200,000 documents - ~10 per file)
  - _id index: ~6.4MB
  - files_id + n index: ~7MB
  - Total: ~13.4MB

Collection: outfits (5,000 documents)
  - _id index: ~160KB
  - userId + createdAt index: ~200KB
  - Total: ~360KB

Grand Total Indexes: ~16.3MB (for 10,000 clothing items)
```

---

## Data Relationships

### **User ↔ ClothingItem Relationship**

**Type**: One-to-Many (1:N)

**Implementation**: userId stored in ClothingItem (not enforced)

**Query Examples**:
```javascript
// Get all clothing items for a user
db.clothingitems.find({ userId: "507f1f77bcf86cd799439011" });

// Count user's wardrobe size
db.clothingitems.countDocuments({ userId: "507f1f77bcf86cd799439011" });

// Delete user's wardrobe (cascade delete)
db.clothingitems.deleteMany({ userId: "507f1f77bcf86cd799439011" });
```

### **User ↔ Outfit Relationship**

**Type**: One-to-Many (1:N)

**Implementation**: userId stored in Outfit (not enforced)

**Query Examples**:
```javascript
// Get user's saved outfits
db.outfits.find({ userId: "507f1f77bcf86cd799439011" })
  .sort({ createdAt: -1 })
  .limit(20);

// Get user's favorite outfits
db.outfits.find({ 
  userId: "507f1f77bcf86cd799439011",
  isFavorite: true 
});
```

### **ClothingItem ↔ GridFS Relationship**

**Type**: One-to-Two (1:2)

**Implementation**: imageUrl and thumbnailUrl store GridFS file IDs

**Storage**:
- Full image: 1-5MB
- Thumbnail: 50-150KB

**Query Examples**:
```javascript
// Get image metadata
const fileId = clothingItem.imageUrl.replace('/gridfs/', '');
db.fs.files.findOne({ _id: ObjectId(fileId) });

// Get all chunks for an image
db.fs.chunks.find({ files_id: ObjectId(fileId) })
  .sort({ n: 1 });

// Delete image and all chunks
const file = db.fs.files.findOne({ _id: ObjectId(fileId) });
db.fs.chunks.deleteMany({ files_id: ObjectId(fileId) });
db.fs.files.deleteOne({ _id: ObjectId(fileId) });
```

### **Outfit ↔ ClothingItem Relationship**

**Type**: Many-to-Many (M:N)

**Implementation**: items array in Outfit stores itemId references (denormalized)

**Denormalization**: Each outfit stores complete item data (not just IDs) for fast retrieval

**Trade-off**:
- Pros: Fast outfit loading (no joins)
- Cons: Data duplication, stale data if item updated

**Query Examples**:
```javascript
// Find outfits containing a specific item
db.outfits.find({ "items.itemId": "507f1f77bcf86cd799439012" });

// Update outfit when item deleted (cleanup)
db.outfits.updateMany(
  { "items.itemId": "507f1f77bcf86cd799439012" },
  { $pull: { items: { itemId: "507f1f77bcf86cd799439012" } } }
);
```

---

## Migration Scripts

### **Initial Setup Script**

```javascript
// create_databases.js
// Run with: mongo < create_databases.js

// Create databases
use closetx_users;
db.createCollection("users");

use closetx_wardrobe;
db.createCollection("clothingitems");

use closetx_outfits;
db.createCollection("outfits");
db.createCollection("outfithistory");

print("✅ Databases created successfully");
```

### **Index Creation Script**

```javascript
// create_indexes.js

use closetx_users;
db.users.createIndex({ email: 1 }, { unique: true });
print("✅ User indexes created");

use closetx_wardrobe;
db.clothingitems.createIndex({ userId: 1 });
db.clothingitems.createIndex({ userId: 1, category: 1 });
db.clothingitems.createIndex({ userId: 1, "color.primary": 1 });
db.clothingitems.createIndex({ userId: 1, season: 1 });
db.clothingitems.createIndex({ userId: 1, occasion: 1 });
db.clothingitems.createIndex({ userId: 1, createdAt: -1 });
db.fs.chunks.createIndex({ files_id: 1, n: 1 });
print("✅ Wardrobe indexes created");

use closetx_outfits;
db.outfits.createIndex({ userId: 1, createdAt: -1 });
db.outfits.createIndex({ userId: 1, isFavorite: 1 });
db.outfits.createIndex({ userId: 1, occasion: 1 });
db.outfithistory.createIndex(
  { generatedAt: 1 }, 
  { expireAfterSeconds: 7776000 }
);
print("✅ Outfit indexes created");
```

### **Seed Data Script**

```javascript
// seed_data.js

use closetx_users;

// Insert test user
const testUser = {
  _id: ObjectId("507f1f77bcf86cd799439011"),
  email: "test@example.com",
  password: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
  username: "testuser",
  preferences: {
    favoriteColors: ["blue", "black"],
    favoriteStyles: ["casual"],
    sizes: {
      tops: "M",
      bottoms: "L",
      shoes: "10"
    }
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

db.users.insertOne(testUser);
print("✅ Test user created: test@example.com / password123");

use closetx_wardrobe;

// Insert sample clothing items
const sampleItems = [
  {
    userId: ObjectId("507f1f77bcf86cd799439011"),
    category: "tops",
    color: { primary: "blue", secondary: ["white"] },
    brand: "Nike",
    season: ["summer", "spring"],
    occasion: ["casual", "athletic"],
    style: ["casual"],
    tags: ["t-shirt", "workout"],
    imageUrl: "/gridfs/sample1",
    thumbnailUrl: "/gridfs/sample1_thumb",
    price: 29.99,
    wearCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    userId: ObjectId("507f1f77bcf86cd799439011"),
    category: "bottoms",
    color: { primary: "black", secondary: [] },
    brand: "Levi's",
    season: ["all"],
    occasion: ["casual"],
    style: ["casual"],
    tags: ["jeans"],
    imageUrl: "/gridfs/sample2",
    thumbnailUrl: "/gridfs/sample2_thumb",
    price: 59.99,
    wearCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

db.clothingitems.insertMany(sampleItems);
print("✅ Sample clothing items created");
```

### **Cleanup Script**

```javascript
// cleanup_old_data.js
// Run with: mongo < cleanup_old_data.js

use closetx_outfits;

// Delete outfit history older than 90 days
const ninetyDaysAgo = new Date();
ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

const result = db.outfithistory.deleteMany({
  generatedAt: { $lt: ninetyDaysAgo }
});

print(`✅ Deleted ${result.deletedCount} old outfit history records`);

// Delete orphaned outfits (items no longer exist)
// This would require application-level logic
print("⚠️  Orphaned outfit cleanup requires application logic");
```

---

## Data Integrity & Consistency

### **Referential Integrity**

MongoDB doesn't enforce foreign key constraints. Our approach:

1. **Application-Level Validation**: Services validate references before creating documents
2. **Eventual Consistency**: Accept temporary inconsistencies
3. **Cleanup Jobs**: Background jobs remove orphaned data

### **Cascade Delete Strategy**

**Scenario**: User deletes their account

**Implementation**:
```javascript
// userService.deleteAccount()

async function deleteAccount(userId) {
  // 1. Delete user
  await User.deleteOne({ _id: userId });
  
  // 2. Publish event to message queue
  await publishMessage('user.deleted', { userId });
  
  // 3. Other services handle cleanup asynchronously
}

// wardrobeService.handleUserDeleted()
async function handleUserDeleted(userId) {
  // Delete all clothing items
  const items = await ClothingItem.find({ userId });
  
  for (const item of items) {
    // Delete images from GridFS
    await deleteGridFSFile(item.imageUrl);
    await deleteGridFSFile(item.thumbnailUrl);
  }
  
  // Delete documents
  await ClothingItem.deleteMany({ userId });
}

// outfitService.handleUserDeleted()
async function handleUserDeleted(userId) {
  // Delete all outfits
  await Outfit.deleteMany({ userId });
  await OutfitHistory.deleteMany({ userId });
}
```

### **Data Validation**

**Mongoose Validation**:
- Required fields
- Enums for limited values
- Min/max ranges
- Custom validators

**Example**:
```javascript
category: {
  type: String,
  required: [true, 'Category is required'],
  enum: {
    values: ['tops', 'bottoms', 'shoes', 'outerwear'],
    message: '{VALUE} is not a valid category'
  }
}
```

---

## Storage Estimates

### **Per-User Storage**

```
User Profile: 500 bytes

Clothing Items (average 50 items):
  - Metadata: 50 items × 1KB = 50KB
  - Full images: 50 × 2MB = 100MB
  - Thumbnails: 50 × 100KB = 5MB
  - GridFS overhead: ~5MB
  - Total: ~110MB

Outfits (average 20 saved):
  - 20 × 2KB = 40KB

OutfitHistory (90 days):
  - ~100 generations × 2KB = 200KB

Total per user: ~110.3MB (dominated by images)
```

### **System-Wide Storage (1000 users)**

```
Users: 1000 × 500 bytes = 500KB

Clothing: 1000 × 110MB = 110GB

Outfits: 1000 × 40KB = 40MB

OutfitHistory: 1000 × 200KB = 200MB

Indexes: ~16MB

Total: ~110.3GB
```

**Storage Optimization**:
- Compress images (JPEG 80% quality)
- Thumbnail size: 300×300 (balance quality/size)
- TTL index on OutfitHistory (auto-delete old data)
- Monitor GridFS usage regularly

---

## Backup Strategy

### **MongoDB Backup**

```bash
# Full backup (all databases)
mongodump --out /backup/$(date +%Y%m%d)

# Specific database backup
mongodump --db closetx_wardrobe --out /backup/wardrobe_$(date +%Y%m%d)

# Restore from backup
mongorestore /backup/20241125

# Incremental backup using oplog
mongodump --oplog --out /backup/incremental_$(date +%Y%m%d)
```

### **Backup Schedule**

- **Full backup**: Daily at 2 AM
- **Incremental backup**: Every 6 hours
- **Retention**: 30 days of full backups, 7 days of incrementals
- **Storage**: Persistent volume in Kubernetes

---

## Performance Monitoring

### **Key Metrics**

```javascript
// Collection statistics
db.clothingitems.stats();

// Index usage
db.clothingitems.aggregate([
  { $indexStats: {} }
]);

// Slow queries (> 100ms)
db.setProfilingLevel(1, { slowms: 100 });
db.system.profile.find().sort({ ts: -1 }).limit(10);

// Storage size
db.stats();
```

### **Query Optimization**

```javascript
// Check if query uses index
db.clothingitems.find({ userId: "..." }).explain("executionStats");

// Look for:
// - executionStats.totalDocsExamined (should be low)
// - executionStats.executionTimeMillis (should be < 10ms)
// - winningPlan.inputStage.stage (should be "IXSCAN" not "COLLSCAN")
```

---

**End of Database Schema Documentation**

For questions or updates, contact Team Kates or refer to related documentation:
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)