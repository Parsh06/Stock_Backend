require('dotenv').config(); // Load environment variables
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sendOrderConfirmation } = require('./nodemail'); // Import sendOrderConfirmation from the nodemailer setup

const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Route to serve security names from a JSON file
app.get('/backend/stocks', (req, res) => {
  res.sendFile(path.join(__dirname, 'security_name.json')); // Serve the JSON file
});

// Route to confirm backend is working
app.get('/backend/hello', (req, res) => {
  res.send('Hello from backend!'); // Simple endpoint to check if the backend is running
});

// Route to handle order placement and send a confirmation email
app.post('/backend/placeOrder', (req, res) => {
  const orderData = req.body; // Extract order data from the request
  console.log("Order received:", orderData);

  // Send the order confirmation email using the sendOrderConfirmation function
  sendOrderConfirmation(orderData)
    .then(() => {
      res.status(200).json({ message: 'Order placed successfully and email sent!' }); // Success response
    })
    .catch((error) => {
      console.error('Error placing order or sending email:', error);
      res.status(500).json({ error: 'Error placing order or sending email.' }); // Error response
    });
});

// Middleware to set security headers
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

// Set the server to listen on a specific port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
