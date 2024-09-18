// Route for handling print button functionality
const express = require('express');
const { ref, get } = require('firebase/database');
const { db } = require('./firebase_config');  // Firebase configuration

const router = express.Router();

router.get('/:orderId', (req, res) => {
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
      console.error('Error fetching order for print:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
});

module.exports = router;
