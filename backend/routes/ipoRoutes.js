const express = require('express');
const router = express.Router();
const { getIpoData, getSmeIpoData } = require('../services/dataService');

/**
 * GET /backend/ipo-main
 * Get all Mainboard IPO details from ipo-main.json
 */
router.get('/ipo-main', async (req, res) => {
  try {
    console.log("📈 Mainboard IPO details requested at:", new Date().toISOString());

    const ipos = getIpoData();

    console.log(`✅ Found ${ipos.length} Mainboard IPO records`);

    res.status(200).json({
      success: true,
      count: ipos.length,
      data: ipos,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error fetching Mainboard IPO details:", error);
    res.status(500).json({
      error: "Failed to fetch Mainboard IPO details",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /backend/ipo-sme
 * Get all SME IPO details from ipo-sme.json
 */
router.get('/ipo-sme', async (req, res) => {
  try {
    console.log("📈 SME IPO details requested at:", new Date().toISOString());

    const ipos = getSmeIpoData();

    console.log(`✅ Found ${ipos.length} SME IPO records`);

    res.status(200).json({
      success: true,
      count: ipos.length,
      data: ipos,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error fetching SME IPO details:", error);
    res.status(500).json({
      error: "Failed to fetch SME IPO details",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;

