// Main server file
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sendOrderConfirmation } = require('./nodemail');
const printButton = require('./print_button');  // Import the print button route
const { ref, get } = require('firebase/database');
const { db } = require('./firebase_config');  // Firebase configuration

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

// Route to get a specific order by ID
app.get('/backend/order/:orderId', (req, res) => {
  const { orderId } = req.params;

  // Retrieve the order from Firebase using the orderId
  const orderRef = ref(db, `orders/${orderId}`);
  get(orderRef)
    .then((snapshot) => {
      if (snapshot.exists()) {
        res.json(snapshot.val());
      } else {
        res.status(404).json({ error: 'Order not found' });
      }
    })
    .catch((error) => {
      console.error('Error fetching order:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Use the print button route
app.use('/backend/printOrder', printButton);  // Make sure this path is correct

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
