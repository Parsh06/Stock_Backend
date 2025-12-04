const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * Read JSON data from file
 */
const readJsonFile = (filename) => {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error.message);
    return null;
  }
};

/**
 * Get all security names from Security.json
 */
const getSecurityNames = () => {
  const data = readJsonFile('Security.json');
  if (!data || !data.data) {
    return [];
  }
  
  // Extract security names from the data array
  const securityNames = data.data
    .map(item => item['Security Name'] || item.SecurityName || item.securityName)
    .filter(name => name && name.trim() !== '');
  
  // Remove duplicates and sort
  return [...new Set(securityNames)].sort();
};

/**
 * Get all Mainboard IPO data from ipo-main.json
 */
const getIpoData = () => {
  const data = readJsonFile('ipo-main.json');
  if (!data || !data.data) {
    return [];
  }
  
  // Return IPO data sorted by date (newest first)
  return data.data.sort((a, b) => {
    const dateA = new Date(a.uploaded_at || a.date || 0);
    const dateB = new Date(b.uploaded_at || b.date || 0);
    return dateB - dateA;
  });
};

/**
 * Get all SME IPO data from ipo-sme.json
 */
const getSmeIpoData = () => {
  const data = readJsonFile('ipo-sme.json');
  if (!data || !data.data) {
    return [];
  }
  
  // Return SME IPO data sorted by date (newest first)
  return data.data.sort((a, b) => {
    const dateA = new Date(a.uploaded_at || a.date || 0);
    const dateB = new Date(b.uploaded_at || b.date || 0);
    return dateB - dateA;
  });
};

module.exports = {
  readJsonFile,
  getSecurityNames,
  getIpoData,
  getSmeIpoData
};

