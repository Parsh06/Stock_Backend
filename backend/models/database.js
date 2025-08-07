const mongoose = require("mongoose");

// MongoDB connection
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is not defined");
    }

    console.log("🔄 Connecting to MongoDB...");
    // Connect directly without deprecated options
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📄 Database Name: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.error("Please check your MongoDB URI and network connection");
    // Don't exit process in serverless environment
    throw error;
  }
};

module.exports = connectDB;
