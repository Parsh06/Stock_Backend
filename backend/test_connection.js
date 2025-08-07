require("dotenv").config();
const mongoose = require("mongoose");

async function testConnection() {
  try {
    console.log("🔄 Testing MongoDB connection...");
    console.log("MongoDB URI configured:", process.env.MONGODB_URI ? "✅ Yes" : "❌ No");
    
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is not defined");
    }

    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📄 Database Name: ${conn.connection.name}`);
    console.log(`🔗 Connection State: ${mongoose.connection.readyState} (1 = connected)`);
    
    // Test collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📊 Collections found: ${collections.length}`);
    collections.forEach(col => console.log(`   - ${col.name}`));
    
    await mongoose.disconnect();
    console.log("✅ Connection test completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Connection test failed:", error.message);
    process.exit(1);
  }
}

testConnection();
