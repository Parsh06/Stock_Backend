require("dotenv").config(); // Load environment variables from .env file
const express = require("express");
const cors = require("cors");
const path = require("path");
const { sendOrderConfirmation } = require("./nodemail"); // Import the sendOrderConfirmation function

// MongoDB setup
const connectDB = require("./models/database");
const SecurityList = require("./models/SecurityList");
const IpoList = require("./models/IpoList");

const app = express();

// Store database connection status
let dbConnectionReady = false;

// Connect to MongoDB (async with proper error handling)
async function initializeDatabase() {
  try {
    await connectDB();
    dbConnectionReady = true;
    console.log('✅ Database connection ready');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    dbConnectionReady = false;
    // Retry connection after 5 seconds
    setTimeout(initializeDatabase, 5000);
  }
}

// Initialize database connection
initializeDatabase();

// Enable CORS for all routes
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Health check endpoint
app.get("/backend/hello", (req, res) => {
  res.json({ 
    message: "Hello from backend!",
    mongodb: dbConnectionReady ? "connected" : "connecting",
    mongodbUri: process.env.MONGODB_URI ? "configured" : "not configured",
    timestamp: new Date().toISOString()
  });
});

// Detailed health check endpoint
app.get("/backend/health", async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const connectionState = mongoose.connection.readyState;
    const stateNames = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    const health = {
      status: connectionState === 1 ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        ready: dbConnectionReady,
        state: stateNames[connectionState] || 'unknown',
        stateCode: connectionState
      },
      environment: {
        mongodbUri: process.env.MONGODB_URI ? 'configured' : 'missing',
        nodeEnv: process.env.NODE_ENV || 'development'
      }
    };

    // Try to count documents if connected
    if (connectionState === 1) {
      try {
        const securityCount = await SecurityList.countDocuments();
        const ipoCount = await IpoList.countDocuments();
        health.collections = {
          securities: securityCount,
          ipos: ipoCount
        };
      } catch (countError) {
        health.collections = { error: countError.message };
      }
    }

    res.status(connectionState === 1 ? 200 : 503).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET endpoint to fetch all stocks/securities
app.get("/backend/stock", async (req, res) => {
  try {
    console.log("📊 Stock Security Names requested at:", new Date().toISOString());
    
    // Check if database connection is ready
    if (!dbConnectionReady) {
      console.log("⚠️ Database not ready, checking connection...");
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
          error: "Database not connected",
          message: "MongoDB connection is not available. Please try again in a moment.",
          timestamp: new Date().toISOString()
        });
      } else {
        dbConnectionReady = true;
      }
    }
    
    // Fetch only Security Names from Securities collection
    const securities = await SecurityList.find({}, { Security_Name: 1, _id: 0 })
      .sort({ Security_Name: 1 })
      .lean(); // Use lean() for better performance
    
    // Extract just the security names as array
    const securityNames = securities.map(item => item.Security_Name).filter(name => name);
    
    console.log(`✅ Found ${securityNames.length} security names`);
    
    res.status(200).json({
      success: true,
      count: securityNames.length,
      data: securityNames,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error fetching security names:", error);
    res.status(500).json({
      error: "Failed to fetch security names",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET endpoint to fetch all IPO data
app.get("/backend/ipo", async (req, res) => {
  try {
    console.log("📈 IPO list requested at:", new Date().toISOString());
    
    // Check if database connection is ready
    if (!dbConnectionReady) {
      console.log("⚠️ Database not ready, checking connection...");
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
          error: "Database not connected",
          message: "MongoDB connection is not available. Please try again in a moment.",
          timestamp: new Date().toISOString()
        });
      } else {
        dbConnectionReady = true;
      }
    }
    
    // Fetch all IPOs from MongoDB, sorted by latest first
    const ipos = await IpoList.find({})
      .sort({ uploaded_at: -1 })
      .lean(); // Use lean() for better performance
    
    console.log(`✅ Found ${ipos.length} IPO records`);
    
    res.status(200).json({
      success: true,
      count: ipos.length,
      data: ipos,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error fetching IPO list:", error);
    res.status(500).json({
      error: "Failed to fetch IPO list",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint for MongoDB connection
app.post("/backend/test_mongodb", async (req, res) => {
  try {
    console.log("🧪 MongoDB test requested at:", new Date().toISOString());

    if (!dbConnectionReady) {
      return res.status(503).json({
        success: false,
        message: "Database connection not ready",
        timestamp: new Date().toISOString()
      });
    }

    // Test MongoDB connection and collections
    const mongoose = require('mongoose');
    const connectionState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    // Get collection stats
    const securityCount = await SecurityList.countDocuments();
    const ipoCount = await IpoList.countDocuments();
    
    // Get database info
    const dbName = mongoose.connection.name;
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    console.log("✅ MongoDB test completed successfully");
    
    res.json({
      success: true,
      message: "MongoDB test completed successfully",
      connection: {
        state: states[connectionState] || 'unknown',
        database: dbName,
        collections: collections.map(col => col.name),
        collectionsCount: collections.length
      },
      data: {
        securities: securityCount,
        ipos: ipoCount
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("❌ MongoDB test error:", error);
    res.status(500).json({
      success: false,
      message: "MongoDB test failed",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint for IPO and Security data scraping (Vercel-compatible)
app.post("/backend/ipo_security", async (req, res) => {
  try {
    console.log("� IPO Security data update requested at:", new Date().toISOString());

    // Check if database connection is ready
    if (!dbConnectionReady) {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
          error: "Database not connected",
          message: "MongoDB connection is not available. Please try again in a moment.",
          timestamp: new Date().toISOString()
        });
      } else {
        dbConnectionReady = true;
      }
    }

    // Validate environment variables
    const requiredEnvVars = ["MONGODB_URI"];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error("❌ Missing required environment variables:", missingVars);
      return res.status(503).json({
        error: "Service configuration incomplete",
        message: "Required environment variables not configured",
        missingVars: missingVars,
        timestamp: new Date().toISOString(),
      });
    }

    // Since Python is not available on Vercel, we'll provide an alternative approach
    console.log("⚠️ Python runtime not available on Vercel serverless environment");
    console.log("💡 Alternative: Use manual data upload or local script execution");

    // Check current data status
    const securityCount = await SecurityList.countDocuments();
    const ipoCount = await IpoList.countDocuments();

    const lastSecurityUpdate = await SecurityList.findOne({}, { uploaded_at: 1 }).sort({ uploaded_at: -1 });
    const lastIpoUpdate = await IpoList.findOne({}, { uploaded_at: 1 }).sort({ uploaded_at: -1 });

    res.status(200).json({
      success: true,
      message: "Data scraping service status",
      note: "Python-based scraping is not available on Vercel serverless environment",
      alternatives: [
        "Run the Python scraper locally and upload data via API",
        "Use the manual data upload endpoints",
        "Schedule scraping on a server with Python support"
      ],
      currentData: {
        securities: {
          count: securityCount,
          lastUpdate: lastSecurityUpdate?.uploaded_at || null
        },
        ipos: {
          count: ipoCount,
          lastUpdate: lastIpoUpdate?.uploaded_at || null
        }
      },
      instructions: {
        localScript: "Run 'python ipo_scraper_final.py' locally to update data",
        manualUpload: "Use POST /backend/upload_securities and POST /backend/upload_ipos for manual data upload"
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error in ipo_security endpoint:", error);
    res.status(500).json({
      error: "Service error",
      message: "Failed to check data scraping service status",
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Manual data upload endpoints for Vercel compatibility

// Upload Securities data manually
app.post("/backend/upload_securities", async (req, res) => {
  try {
    console.log("📊 Manual securities upload requested at:", new Date().toISOString());
    
    if (!dbConnectionReady) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB connection is not available.",
        timestamp: new Date().toISOString()
      });
    }

    const { securities } = req.body;
    
    if (!securities || !Array.isArray(securities) || securities.length === 0) {
      return res.status(400).json({
        error: "Invalid data",
        message: "Securities array is required and must not be empty",
        timestamp: new Date().toISOString()
      });
    }

    // Clear existing securities
    await SecurityList.deleteMany({});
    console.log("🗑️ Cleared existing securities data");

    // Add metadata to each record
    const securitiesWithMetadata = securities.map((security, index) => ({
      ...security,
      uploaded_at: new Date(),
      data_type: "BSE_Security",
      record_id: index + 1
    }));

    // Insert new securities data
    const result = await SecurityList.insertMany(securitiesWithMetadata);
    
    console.log(`✅ Uploaded ${result.length} securities to MongoDB`);
    
    res.status(200).json({
      success: true,
      message: "Securities data uploaded successfully",
      count: result.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error uploading securities:", error);
    res.status(500).json({
      error: "Upload failed",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Upload IPO data manually
app.post("/backend/upload_ipos", async (req, res) => {
  try {
    console.log("📈 Manual IPO upload requested at:", new Date().toISOString());
    
    if (!dbConnectionReady) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB connection is not available.",
        timestamp: new Date().toISOString()
      });
    }

    const { ipos } = req.body;
    
    if (!ipos || !Array.isArray(ipos) || ipos.length === 0) {
      return res.status(400).json({
        error: "Invalid data",
        message: "IPOs array is required and must not be empty",
        timestamp: new Date().toISOString()
      });
    }

    // Clear existing IPOs
    await IpoList.deleteMany({});
    console.log("🗑️ Cleared existing IPO data");

    // Add metadata to each record
    const iposWithMetadata = ipos.map((ipo, index) => ({
      ...ipo,
      uploaded_at: new Date(),
      data_type: "IPO_Data",
      record_id: index + 1
    }));

    // Insert new IPO data
    const result = await IpoList.insertMany(iposWithMetadata);
    
    console.log(`✅ Uploaded ${result.length} IPOs to MongoDB`);
    
    res.status(200).json({
      success: true,
      message: "IPO data uploaded successfully",
      count: result.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error uploading IPOs:", error);
    res.status(500).json({
      error: "Upload failed",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Enhanced endpoint to handle order placement and send order confirmation email
app.post("/backend/placeOrder", async (req, res) => {
  try {
    const orderData = req.body;

    // Log incoming request (without sensitive data)
    console.log("📋 Order received:", {
      userName: orderData.userName,
      stockName: orderData.stockName,
      buyOrSell: orderData.buyOrSell,
      quantity: orderData.quantity,
      rate: orderData.rate,
      timestamp: new Date().toISOString(),
    });

    // Validate environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error(
        "Email configuration missing. Please check environment variables."
      );
    }

    // Basic request validation
    if (!orderData || typeof orderData !== "object") {
      return res.status(400).json({
        error: "Invalid request body. Order data is required.",
      });
    }

    // Validate required fields
    const requiredFields = [
      "userName",
      "UCC_CODE",
      "stockName",
      "quantity",
      "rate",
      "buyOrSell",
    ];
    const missingFields = requiredFields.filter((field) => !orderData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Process the order
    console.log("📧 Sending order confirmation email...");
    const result = await sendOrderConfirmation(orderData);

    console.log("✅ Order processed successfully:", {
      messageId: result.messageId,
      recipients: result.recipients,
      pdfSize: result.pdfSize,
    });

    res.status(200).json({
      message: "Order placed successfully and email sent!",
      orderDetails: result.orderDetails,
      messageId: result.messageId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error placing order or sending email:", error);

    // Determine appropriate status code and error message
    let statusCode = 500;
    let errorMessage = "Internal server error while processing order.";

    if (error.message.includes("Missing required fields")) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.message.includes("Invalid email format")) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.message.includes("Email configuration")) {
      statusCode = 503;
      errorMessage =
        "Email service temporarily unavailable. Please check server configuration.";
    } else if (error.message.includes("SMTP")) {
      statusCode = 503;
      errorMessage = "Email service connection failed. Please try again later.";
    }

    res.status(statusCode).json({
      error: errorMessage,
      timestamp: new Date().toISOString(),
      // Include details in development
      ...(process.env.NODE_ENV === "development" && { details: error.message }),
    });
  }
});

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

// Serve static files if needed (e.g. frontend build)
// app.use(express.static(path.join(__dirname, 'build')));

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📧 Email configured: ${process.env.EMAIL_USER ? "Yes" : "No"}`);
  console.log(`🗄️  MongoDB configured: ${process.env.MONGODB_URI ? "Yes" : "No"}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
  console.log("📋 Available endpoints:");
  console.log(`   GET  /backend/hello`);
  console.log(`   GET  /backend/stock (Get all securities)`);
  console.log(`   GET  /backend/ipo (Get all IPO data)`);
  console.log(`   POST /backend/test_mongodb (Test MongoDB connection)`);
  console.log(`   POST /backend/upload_securities (Manual securities upload)`);
  console.log(`   POST /backend/upload_ipos (Manual IPO upload)`);
  console.log(`   POST /backend/ipo_security (Check scraping service status)`);
  console.log(`   POST /backend/placeOrder`);
  console.log("");
  console.log('💡 Note: Python scraping not available on Vercel');
  console.log('💡 Use manual upload endpoints or run Python scripts locally');
});
