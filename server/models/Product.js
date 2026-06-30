// ─────────────────────────────────────────────
//  Model: Product
//  Represents a SKU in the inventory.
//  Stock can exist at multiple store locations.
// ─────────────────────────────────────────────

const mongoose = require("mongoose");

// Sub-document for per-location stock
// e.g. [{ store: "Indore Main", qty: 45 }, { store: "Online", qty: 12 }]
const stockLocationSchema = new mongoose.Schema(
  {
    store: { type: String, required: true },
    qty:   { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false } // No need for a separate _id on sub-docs
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["Electronics", "Sports", "Kitchen", "Stationery", "Clothing", "Other"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    costPrice: {
      type: Number,
      default: 0,
    },
    // Array of stock per location (omnichannel!)
    stockLocations: [stockLocationSchema],
    // Convenience virtual for total stock across all locations
    lowStockThreshold: {
      type: Number,
      default: 10,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // Include virtuals when converting to JSON
  }
);

// ── Virtual field ────────────────────────────
// Virtuals are computed fields — not stored in DB, calculated on the fly.
// totalStock = sum of qty across all store locations
productSchema.virtual("totalStock").get(function () {
  return this.stockLocations.reduce((sum, loc) => sum + loc.qty, 0);
});

// stockStatus derived from totalStock
productSchema.virtual("stockStatus").get(function () {
  const total = this.totalStock;
  if (total === 0) return "out";
  if (total <= this.lowStockThreshold) return "low";
  return "active";
});

// ── Index ────────────────────────────────────
// Speeds up searches by name or SKU
productSchema.index({ name: "text", sku: "text" });

module.exports = mongoose.model("Product", productSchema);
