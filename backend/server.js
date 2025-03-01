require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sendOrderConfirmation } = require('./nodemail'); // Import the sendOrderConfirmation function

const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Serve the JSON file containing security names
app.get('/backend/stocks', (req, res) => {
  res.sendFile(path.join(__dirname, 'security_name.json'));
});

// Simple endpoint to verify backend is running
app.get('/backend/hello', (req, res) => {
  res.send('Hello from backend!');
});

// Endpoint to handle order placement and send order confirmation email
app.post('/backend/placeOrder', async (req, res) => {
  const orderData = req.body;
  console.log("Order received:", orderData);
  try {
    await sendOrderConfirmation(orderData);
    res.status(200).json({ message: 'Order placed successfully and email sent!' });
  } catch (error) {
    console.error('Error placing order or sending email:', error);
    res.status(500).json({ error: 'Error placing order or sending email.' });
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
  console.log(`Server running on port ${PORT}`);
});
