const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = 'https://stock-backend-mu.vercel.app';
// const API_BASE_URL = 'http://localhost:5000'; // For local testing

async function uploadDataToVercel() {
  try {
    console.log('🚀 Starting data upload to Vercel...');

    // Check if data files exist
    const ipoJsonPath = path.join(__dirname, 'ipo.json');
    const securityJsonPath = path.join(__dirname, 'SecurityList.json');

    // Upload IPO data if file exists
    if (fs.existsSync(ipoJsonPath)) {
      console.log('📈 Uploading IPO data...');
      const ipoData = JSON.parse(fs.readFileSync(ipoJsonPath, 'utf8'));
      
      const ipoResponse = await axios.post(`${API_BASE_URL}/backend/upload_ipos`, {
        ipos: ipoData
      });
      
      console.log('✅ IPO upload successful:', ipoResponse.data.message);
      console.log(`📊 IPO records uploaded: ${ipoResponse.data.count}`);
    } else {
      console.log('⚠️ ipo.json not found - run Python scraper first');
    }

    // Upload Securities data if file exists
    if (fs.existsSync(securityJsonPath)) {
      console.log('📊 Uploading Securities data...');
      const securityData = JSON.parse(fs.readFileSync(securityJsonPath, 'utf8'));
      
      const securityResponse = await axios.post(`${API_BASE_URL}/backend/upload_securities`, {
        securities: securityData
      });
      
      console.log('✅ Securities upload successful:', securityResponse.data.message);
      console.log(`📈 Security records uploaded: ${securityResponse.data.count}`);
    } else {
      console.log('⚠️ SecurityList.json not found - run Python scraper first');
    }

    console.log('🎉 Data upload completed!');

  } catch (error) {
    console.error('❌ Upload failed:', error.response?.data || error.message);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  uploadDataToVercel();
}

module.exports = { uploadDataToVercel };
