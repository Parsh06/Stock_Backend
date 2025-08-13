const mongoose = require("mongoose");

// Global variables for serverless optimization
let isConnected = false;

// MongoDB connection optimized for Vercel serverless
const connectDB = async () => {
  if (isConnected) {
    console.log("🔄 Using existing MongoDB connection");
    return mongoose.connection;
  }

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is not defined");
    }

    console.log("🔄 Connecting to MongoDB...");
    
    // Ensure we're disconnected first
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    // Connect with modern MongoDB connection options
    const db = await mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 10000,
    });

    isConnected = true;
    console.log(`✅ MongoDB Connected: ${db.connection.host}`);
    console.log(`📄 Database Name: ${db.connection.name}`);
    
    return db.connection;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    isConnected = false;
    throw error;
  }
};

// Helper function to ensure connection
const ensureConnection = async () => {
  if (mongoose.connection.readyState === 1) {
    return true;
  }
  
  try {
    await connectDB();
    return mongoose.connection.readyState === 1;
  } catch (error) {
    console.error("❌ ensureConnection failed:", error.message);
    return false;
  }
};

module.exports = { connectDB, ensureConnection };
