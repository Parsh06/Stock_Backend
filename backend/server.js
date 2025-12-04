require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// Import routes
const stockRoutes = require("./routes/stockRoutes");
const ipoRoutes = require("./routes/ipoRoutes");
const orderRoutes = require("./routes/orderRoutes");
const scraperRoutes = require("./routes/scraperRoutes");

// Enable CORS for all routes
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Health check endpoint
app.get("/backend/hello", (req, res) => {
  res.json({
    message: "Hello from backend!",
    status: "running",
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use("/backend", stockRoutes);
app.use("/backend", ipoRoutes);
app.use("/backend", orderRoutes);
app.use("/backend", scraperRoutes);

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, 'localhost', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📧 Email configured: ${process.env.EMAIL_USER ? "Yes" : "No"}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
  console.log("📋 Available endpoints:");
  console.log(`   GET  /backend/hello`);
  console.log(`   GET  /backend/stock-name (Get all security names)`);
  console.log(`   GET  /backend/ipo-main (Get Mainboard IPO details)`);
  console.log(`   GET  /backend/ipo-sme (Get SME IPO details)`);
  console.log(`   GET  /backend/scraper (Run Python scraper)`);
  console.log(`   POST /backend/placeOrder`);
  console.log("");
  console.log('💡 To test: Use Postman or curl to test the endpoints');
}).on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  if (err.code === 'EADDRINUSE') {
    console.log(`❌ Port ${PORT} is already in use. Please kill existing process or use different port.`);
    process.exit(1);
  }
});
