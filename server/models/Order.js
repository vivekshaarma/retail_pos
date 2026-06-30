// ─────────────────────────────────────────────
//  Model: Order
//  Each document = one sales transaction.
//  An order has many line items (products + qty).
// ─────────────────────────────────────────────

const mongoose = require("mongoose");

// One line in the receipt
const lineItemSchema = new mongoose.Schema(
  {
    product:   { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true }, // Snapshot at time of sale
    sku:       { type: String },
    qty:       { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },   // Price at time of sale
    subtotal:  { type: Number, required: true },   // qty × unitPrice
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },
    customer: {
      name:  { type: String, default: "Walk-in" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
    },
    items: [lineItemSchema],
    subtotal:    { type: Number, required: true },
    taxRate:     { type: Number, default: 0.18 },  // 18% GST
    tax:         { type: Number, required: true },
    total:       { type: Number, required: true },
    channel: {
      type: String,
      enum: ["In-Store", "Online", "Phone Order"],
      default: "In-Store",
    },
    store:   { type: String, default: "Indore Main" },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "cancelled", "refunded"],
      default: "completed",
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Online"],
      default: "Cash",
    },
    // Who processed this sale
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    notes: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

// ── Auto-generate order number before save ───
// Format: ORD-YYYYMMDD-XXXX (e.g. ORD-20240115-0042)
orderSchema.pre("save", async function (next) {
  if (this.orderNumber) return next(); // Already set

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

  // Count orders today to generate sequential suffix
  const count = await mongoose.model("Order").countDocuments({
    createdAt: { $gte: new Date(today.setHours(0, 0, 0, 0)) },
  });

  this.orderNumber = `ORD-${dateStr}-${String(count + 1).padStart(4, "0")}`;
  next();
});

module.exports = mongoose.model("Order", orderSchema);
