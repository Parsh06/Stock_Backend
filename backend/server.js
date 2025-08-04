require("dotenv").config(); // Load environment variables from .env file
const express = require("express");
const cors = require("cors");
const path = require("path");
const { sendOrderConfirmation } = require("./nodemail"); // Import the sendOrderConfirmation function

const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Serve the JSON file containing security names
app.get("/backend/stocks", (req, res) => {
  res.sendFile(path.join(__dirname, "security_name.json"));
});

// Simple endpoint to verify backend is running
app.get("/backend/hello", (req, res) => {
  res.send("Hello from backend!");
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
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
  console.log("📋 Available endpoints:");
  console.log(`   GET  /backend/hello`);
  console.log(`   GET  /backend/stocks`);
  console.log(`   POST /backend/placeOrder`);
  console.log("");
  console.log('💡 To test: Run "node test-local.js" in the backend folder');
});
