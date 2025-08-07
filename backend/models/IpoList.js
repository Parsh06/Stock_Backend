const mongoose = require("mongoose");

// IPO List Schema
const ipoListSchema = new mongoose.Schema(
  {
    // IPO data fields from Chittorgarh
    Company_Name: {
      type: String,
      required: true,
    },
    Exchange: {
      type: String,
      default: null,
    },
    Series: {
      type: String,
      default: null,
    },
    Open_Date: {
      type: String,
      default: null,
    },
    Close_Date: {
      type: String,
      default: null,
    },
    Issue_Size: {
      type: String,
      default: null,
    },
    Price_Band: {
      type: String,
      default: null,
    },
    Min_Investment: {
      type: String,
      default: null,
    },
    Lot_Size: {
      type: String,
      default: null,
    },
    Issue_Type: {
      type: String,
      default: null,
    },
    Listing_Date: {
      type: String,
      default: null,
    },
    Status: {
      type: String,
      default: null,
    },
    ISIN: {
      type: String,
      default: null,
    },
    // Additional flexible fields for any extra data
    GMP: {
      type: String,
      default: null,
    },
    Est_Listing_Price: {
      type: String,
      default: null,
    },
    Est_Listing_Gains: {
      type: String,
      default: null,
    },
    // Metadata
    uploaded_at: {
      type: Date,
      default: Date.now,
    },
    data_type: {
      type: String,
      default: "IPO",
    },
    record_id: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "Ipo", // Updated to match MongoDB collection name
  }
);

// Create indexes for better performance (only here, not in field definitions)
ipoListSchema.index({ Company_Name: 1 });
ipoListSchema.index({ Status: 1 });
ipoListSchema.index({ ISIN: 1 });
ipoListSchema.index({ Issue_Type: 1 });

module.exports = mongoose.model("IpoList", ipoListSchema);
ipoListSchema.index({ Issue_Type: 1 });

module.exports = mongoose.model("IpoList", ipoListSchema);
