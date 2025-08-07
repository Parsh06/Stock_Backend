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

// Connect to MongoDB (non-blocking with better error handling)
connectDB().catch((error) => {
  console.error('❌ MongoDB connection failed, but server will continue:', error.message);
});

// Enable CORS for all routes
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Simple endpoint to verify backend is running
app.get("/backend/hello", (req, res) => {
  res.json({ 
    message: "Hello from backend!",
    mongodb: process.env.MONGODB_URI ? "configured" : "not configured",
    timestamp: new Date().toISOString()
  });
});

// GET endpoint to fetch all stocks/securities
app.get("/backend/stock", async (req, res) => {
  try {
    console.log("📊 Stock Security Names requested at:", new Date().toISOString());
    
    // Check if MongoDB is connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB connection is not available",
        timestamp: new Date().toISOString()
      });
    }
    
    // Fetch only Security Names from Securities collection
    const securities = await SecurityList.find({}, { Security_Name: 1, _id: 0 }).sort({ Security_Name: 1 });
    
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
    
    // Check if MongoDB is connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB connection is not available",
        timestamp: new Date().toISOString()
      });
    }
    
    // Fetch all IPOs from MongoDB, sorted by latest first
    const ipos = await IpoList.find({}).sort({ uploaded_at: -1 });
    
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

    const pythonScript = path.join(__dirname, "test_mongodb.py");
    const pythonCommands = ["python", "python3", "py"];

    let pythonProcess = null;
    let processStarted = false;
    let output = "";
    let errorOutput = "";

    for (const pythonCmd of pythonCommands) {
      try {
        pythonProcess = spawn(pythonCmd, [pythonScript], {
          cwd: __dirname,
          env: {
            ...process.env,
            MONGODB_URI: process.env.MONGODB_URI,
          },
        });

        console.log(`✅ Python test process started with command: ${pythonCmd}`);
        processStarted = true;
        break;
      } catch (error) {
        console.log(`⚠️  Failed to start test with ${pythonCmd}: ${error.message}`);
        continue;
      }
    }

    if (!processStarted) {
      return res.status(500).json({
        success: false,
        message: "Could not start Python test process",
        timestamp: new Date().toISOString(),
      });
    }

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on("close", (code) => {
      console.log(`🧪 MongoDB test completed with code: ${code}`);
      
      if (code === 0) {
        res.json({
          success: true,
          message: "MongoDB test completed successfully",
          output: output,
          code: code,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "MongoDB test failed",
          output: output,
          error: errorOutput,
          code: code,
          timestamp: new Date().toISOString(),
        });
      }
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

// Endpoint to run Python script for IPO and Security data scraping
app.post("/backend/ipo_security", async (req, res) => {
  try {
    console.log(
      "🐍 IPO Security scraper requested at:",
      new Date().toISOString()
    );

    // Validate environment variables for Python script
    const requiredEnvVars = [
      "MONGODB_URI"
    ];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );
    if (missingVars.length > 0) {
      console.error("❌ Missing required environment variables:", missingVars);
      return res.status(503).json({
        error: "Service configuration incomplete",
        message: "Required environment variables not configured",
        missingVars: missingVars,
        timestamp: new Date().toISOString(),
      });
    }

    // Check if Python is available
    const { spawn } = require("child_process");

    console.log("🚀 Starting Python IPO scraper script...");

    // Set timeout for the entire operation (10 minutes)
    const SCRIPT_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

    const startTime = Date.now();

    // Run Python script - Updated to use final scraper
    const pythonScript = path.join(__dirname, "ipo_scraper_final.py");

    // Check if Python script exists
    const fs = require("fs");
    if (!fs.existsSync(pythonScript)) {
      console.error("❌ Python script not found:", pythonScript);
      return res.status(500).json({
        error: "Script not found",
        message: "IPO scraper script is missing from server",
        timestamp: new Date().toISOString(),
      });
    }

    // Try different Python commands
    const pythonCommands = ["python", "python3", "py"];
    let pythonProcess = null;
    let processStarted = false;

    for (const pythonCmd of pythonCommands) {
      try {
        pythonProcess = spawn(pythonCmd, [pythonScript], {
          cwd: __dirname,
          env: {
            ...process.env,
            // Ensure environment variables are passed to Python
            MONGODB_URI: process.env.MONGODB_URI,
          },
        });

        console.log(`✅ Python process started with command: ${pythonCmd}`);
        processStarted = true;
        break;
      } catch (error) {
        console.log(`⚠️  Failed to start with ${pythonCmd}: ${error.message}`);
        continue;
      }
    }

    if (!processStarted || !pythonProcess) {
      console.error("❌ Could not start Python process with any command");
      return res.status(500).json({
        error: "Python runtime not available",
        message:
          "Could not execute Python script. Please ensure Python is installed.",
        timestamp: new Date().toISOString(),
      });
    }

    let stdout = "";
    let stderr = "";
    let isCompleted = false;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (!isCompleted) {
        console.error("❌ Python script timeout after 10 minutes");
        pythonProcess.kill("SIGTERM");
        if (!res.headersSent) {
          res.status(408).json({
            error: "Script timeout",
            message: "The scraping operation took too long and was terminated",
            timeout: "10 minutes",
            timestamp: new Date().toISOString(),
          });
        }
      }
    }, SCRIPT_TIMEOUT);

    // Collect output
    pythonProcess.stdout.on("data", (data) => {
      const output = data.toString();
      stdout += output;
      console.log(`🐍 Python: ${output.trim()}`);
    });

    pythonProcess.stderr.on("data", (data) => {
      const error = data.toString();
      stderr += error;
      console.error(`🐍 Python Error: ${error.trim()}`);
    });

    // Handle process completion
    pythonProcess.on("close", (code) => {
      clearTimeout(timeoutId);
      isCompleted = true;

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(
        `🐍 Python script completed in ${duration}s with exit code: ${code}`
      );

      if (res.headersSent) {
        console.log("⚠️  Response already sent, skipping duplicate response");
        return;
      }

      try {
        if (code === 0) {
          // Try to parse the result from stdout
          let scriptResult = null;
          try {
            // Look for JSON in the last part of stdout
            const lines = stdout.trim().split("\n");
            const lastLine = lines[lines.length - 1];

            if (lastLine.startsWith("{")) {
              scriptResult = JSON.parse(lastLine);
            } else {
              // Fallback: create a basic result
              scriptResult = {
                success: true,
                message: "Script completed successfully",
                output: stdout.trim(),
              };
            }
          } catch (parseError) {
            console.warn("⚠️  Could not parse script result, using default");
            scriptResult = {
              success: true,
              message: "Script completed successfully",
              output: stdout.trim(),
            };
          }

          console.log("✅ IPO Security scraper completed successfully");
          res.status(200).json({
            success: true,
            message: "IPO and Security data scraping completed successfully",
            duration: `${duration}s`,
            scriptResult: scriptResult,
            timestamp: new Date().toISOString(),
          });
        } else {
          console.error("❌ Python script failed with code:", code);
          res.status(500).json({
            error: "Script execution failed",
            message: "The Python scraper script encountered an error",
            exitCode: code,
            duration: `${duration}s`,
            stderr: stderr.trim(),
            timestamp: new Date().toISOString(),
          });
        }
      } catch (responseError) {
        console.error("❌ Error sending response:", responseError);
      }
    });

    pythonProcess.on("error", (error) => {
      clearTimeout(timeoutId);
      isCompleted = true;

      console.error("❌ Python process error:", error);

      if (!res.headersSent) {
        res.status(500).json({
          error: "Script execution error",
          message: "Failed to execute Python scraper script",
          details: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });
  } catch (error) {
    console.error("❌ Error in ipo_security endpoint:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to initialize scraping process",
        details: error.message,
        timestamp: new Date().toISOString(),
      });
    }
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
  console.log(`   POST /backend/placeOrder`);
  console.log(`   POST /backend/ipo_security (Python scraper - MongoDB)`);
  console.log("");
  console.log('💡 To test: Use Postman or curl to test the endpoints');
});
