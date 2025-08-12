// Serverless function for Vercel deployment
const mongoose = require('mongoose');

// Global connection cache for serverless
let cachedConnection = null;

// Security schema
const SecuritySchema = new mongoose.Schema({
  Security_Name: String,
  Security_Code: String,
  ISIN_No: String
}, { collection: 'securities' });

// Create model
let SecurityList;
try {
  SecurityList = mongoose.models.SecurityList || mongoose.model('SecurityList', SecuritySchema);
} catch (error) {
  SecurityList = mongoose.model('SecurityList', SecuritySchema);
}

async function connectToDatabase() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('Using cached connection');
    return cachedConnection;
  }

  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      bufferCommands: false,
    });

    cachedConnection = connection;
    console.log('New connection established');
    return connection;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Stock API called at:', new Date().toISOString());

    // Check environment variables
    if (!process.env.MONGODB_URI) {
      return res.status(503).json({
        error: 'Configuration error',
        message: 'MONGODB_URI not configured',
        timestamp: new Date().toISOString()
      });
    }

    // Connect to database
    await connectToDatabase();

    // Fetch securities
    const securities = await SecurityList.find({}, { Security_Name: 1, _id: 0 })
      .sort({ Security_Name: 1 })
      .lean();

    const securityNames = securities
      .map(item => item.Security_Name)
      .filter(name => name && typeof name === 'string');

    console.log(`Found ${securityNames.length} securities`);

    return res.status(200).json({
      success: true,
      count: securityNames.length,
      data: securityNames,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
