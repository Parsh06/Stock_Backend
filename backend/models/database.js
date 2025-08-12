const mongoose = require("mongoose");

// Global connection variable for serverless optimization
let cachedConnection = null;
let connectionPromise = null;

// MongoDB connection optimized for serverless environments
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is not defined");
    }

    // Return existing connection if available and connected (serverless optimization)
    if (cachedConnection && mongoose.connection.readyState === 1) {
      console.log("🔄 Using cached MongoDB connection");
      return cachedConnection;
    }

    // If there's already a connection attempt in progress, wait for it
    if (connectionPromise) {
      console.log("🔄 Waiting for existing connection attempt...");
      return await connectionPromise;
    }

    // Create new connection promise
    connectionPromise = new Promise(async (resolve, reject) => {
      try {
        // Disconnect any existing connection before creating new one
        if (mongoose.connection.readyState !== 0) {
          console.log("🔄 Disconnecting existing connection...");
          await mongoose.disconnect();
        }

        console.log("🔄 Connecting to MongoDB...");
        
        // Connect with optimized settings for serverless
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          maxPoolSize: 1, // Single connection for serverless
          serverSelectionTimeoutMS: 10000, // 10 seconds
          socketTimeoutMS: 30000, // 30 seconds
          connectTimeoutMS: 10000, // 10 seconds
          bufferCommands: false, // Disable mongoose buffering
          maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
          retryWrites: true,
          retryReads: true
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📄 Database Name: ${conn.connection.name}`);
        
        cachedConnection = conn;
        connectionPromise = null; // Reset promise after success
        resolve(conn);
      } catch (error) {
        connectionPromise = null; // Reset promise after error
        cachedConnection = null;
        reject(error);
      }
    });

    return await connectionPromise;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.error("Please check your MongoDB URI and network connection");
    
    // Reset cached connection on error
    cachedConnection = null;
    connectionPromise = null;
    
    // Don't exit process in serverless environment
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    throw error;
  }
};

// Helper function to ensure connection before database operations
const ensureConnection = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log("✅ Database already connected");
      return true;
    }
    
    console.log("🔄 Database not connected, attempting to connect...");
    await connectDB();
    
    // Double-check connection state
    const isConnected = mongoose.connection.readyState === 1;
    console.log(`🔍 Connection state check: ${isConnected ? 'Connected' : 'Failed'}`);
    return isConnected;
  } catch (error) {
    console.error("❌ ensureConnection failed:", error.message);
    return false;
  }
};

module.exports = { connectDB, ensureConnection };
