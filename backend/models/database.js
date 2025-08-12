const mongoose = require("mongoose");

// Global connection variable for serverless optimization
let cachedConnection = null;

// MongoDB connection optimized for serverless environments
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is not defined");
    }

    // Return existing connection if available (serverless optimization)
    if (cachedConnection && mongoose.connection.readyState === 1) {
      console.log("🔄 Using cached MongoDB connection");
      return cachedConnection;
    }

    // Disconnect any existing connection before creating new one
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    console.log("🔄 Connecting to MongoDB...");
    
    // Connect with optimized settings for serverless
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false // Disable mongoose buffering
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📄 Database Name: ${conn.connection.name}`);
    
    cachedConnection = conn;
    return conn;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.error("Please check your MongoDB URI and network connection");
    
    // Don't exit process in serverless environment
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    throw error;
  }
};

// Helper function to ensure connection before database operations
const ensureConnection = async () => {
  if (mongoose.connection.readyState !== 1) {
    console.log("🔄 Database not connected, attempting to connect...");
    await connectDB();
  }
  return mongoose.connection.readyState === 1;
};

module.exports = { connectDB, ensureConnection };
