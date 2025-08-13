const mongoose = require("mongoose");

// Global connection state for serverless
let cachedConnection = null;

// MongoDB connection optimized for Vercel serverless environment
const connectDB = async () => {
  // Return cached connection if it exists and is ready
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log("🔄 Using cached MongoDB connection");
    return cachedConnection;
  }

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is not defined");
    }

    console.log("🔄 Establishing new MongoDB connection...");
    
    // Disconnect if already connected
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    // Connect with production-optimized settings
    const db = await mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxIdleTimeMS: 30000,
    });

    cachedConnection = db.connection;
    console.log(`✅ MongoDB Connected: ${db.connection.host}`);
    console.log(`📄 Database Name: ${db.connection.name}`);
    
    return cachedConnection;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    cachedConnection = null;
    throw error;
  }
};

// Helper function to ensure connection
const ensureConnection = async () => {
  try {
    // Check if we have a ready connection
    if (mongoose.connection.readyState === 1) {
      return true;
    }
    
    // Try to establish connection
    await connectDB();
    return mongoose.connection.readyState === 1;
  } catch (error) {
    console.error("❌ ensureConnection failed:", error.message);
    return false;
  }
};

// Cleanup on connection events
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ Mongoose connection error:', error);
  cachedConnection = null;
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
  cachedConnection = null;
});

module.exports = { connectDB, ensureConnection };
