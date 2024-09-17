require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sendOrderConfirmation } = require('./nodemail');

const app = express();

app.use(cors());
app.use(express.json());

// Route to serve security names from a JSON file
app.get('/backend/stocks', (req, res) => {
  res.sendFile(path.join(__dirname, 'security_name.json')); 
});

// Route to say hello from backend (for Vercel testing)
app.get('/backend/hello', (req, res) => {
  res.send('Hello from backend!');
});

// Route to handle order placement and send a confirmation email
app.post('/backend/placeOrder', (req, res) => {
  const orderData = req.body;
  console.log("Order received:", orderData);

  // Send confirmation email
  sendOrderConfirmation(orderData)
    .then(() => {
      res.status(200).json({ message: 'Order placed successfully and email sent!' });
    })
    .catch((error) => {
      console.error('Error placing order or sending email:', error);
      res.status(500).json({ error: 'Error placing order or sending email.' });
    });
});

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
