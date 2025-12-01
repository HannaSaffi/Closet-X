// Simple Mongo init script for Closet-X (placeholder)
print("Running mongo-init.js...");

db = db.getSiblingDB("closetx");

if (!db.getCollectionNames().includes("users")) {
  db.createCollection("users");
}

