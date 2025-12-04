const express = require('express');
const router = express.Router();
const { getSecurityNames } = require('../services/dataService');

/**
 * GET /backend/stock-name
 * Get all security names (just the names array)
 */
router.get('/stock-name', async (req, res) => {
  try {
    console.log("📊 Stock Names requested at:", new Date().toISOString());

    const securityNames = getSecurityNames();

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

module.exports = router;

