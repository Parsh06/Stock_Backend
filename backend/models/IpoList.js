const mongoose = require("mongoose");

// IPO List Schema - Updated to match actual MongoDB data structure
const ipoListSchema = new mongoose.Schema(
  {
    // Primary IPO data fields (from Python scraper)
    Company: {
      type: String,
      required: true,
      index: true,
    },
    Opening_Date: {
      type: String,
      default: null,
    },
    Closing_Date: {
      type: String,
      default: null,
    },
    Listing_Date: {
      type: String,
      default: null,
    },
    Issue_Price_Rs: {
      type: String,
      default: null,
    },
    Total_Issue_Amount_InclFirm_reservations_Rscr: {
      type: String,
      default: null,
    },
    Listing_at: {
      type: String,
      default: null,
    },
    Lead_Manager: {
      type: String,
      default: null,
    },

    // Alternative field names for compatibility
    Company_Name: {
      type: String,
      default: null,
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
    Status: {
      type: String,
      default: null,
      index: true,
    },
    ISIN: {
      type: String,
      default: null,
      index: true,
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
    strict: false, // Allow additional fields not defined in schema
  }
);

// Create indexes for better performance
ipoListSchema.index({ Company: 1 });
ipoListSchema.index({ Status: 1 });
ipoListSchema.index({ ISIN: 1 });
ipoListSchema.index({ Issue_Type: 1 });

module.exports = mongoose.model("IpoList", ipoListSchema);
