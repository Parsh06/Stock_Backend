const mongoose = require("mongoose");

// Security List Schema
const securityListSchema = new mongoose.Schema(
  {
    // BSE Security data fields
    Security_Code: {
      type: String,
      required: true,
      index: true,
    },
    Security_Id: {
      type: String,
      required: true,
    },
    Security_Name: {
      type: String,
      required: true,
      index: true,
    },
    Status: {
      type: String,
      required: true,
      default: "Active",
    },
    Group: {
      type: String,
      default: null,
    },
    Face_Value: {
      type: Number,
      default: null,
    },
    ISIN_No: {
      type: String,
      default: null,
      index: true,
    },
    Industry: {
      type: String,
      default: null,
    },
    Instrument: {
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
      default: "SecurityList",
    },
    record_id: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "Securities", // Updated to match MongoDB collection name
  }
);

// Create indexes for better performance
securityListSchema.index({ Security_Code: 1 });
securityListSchema.index({ Security_Name: 1 });
securityListSchema.index({ Status: 1 });
securityListSchema.index({ ISIN_No: 1 });

module.exports = mongoose.model("SecurityList", securityListSchema);
