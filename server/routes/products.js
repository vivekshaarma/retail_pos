// ─────────────────────────────────────────────
//  Routes: /api/products
//  GET    /api/products          → list all
//  GET    /api/products/:id      → single product
//  POST   /api/products          → create (admin/manager)
//  PUT    /api/products/:id      → update (admin/manager)
//  PATCH  /api/products/:id/stock → adjust stock at a location
//  DELETE /api/products/:id      → soft-delete (admin only)
// ─────────────────────────────────────────────

const router = require("express").Router();
const Product = require("../models/Product");
const { protect, requireRole } = require("../middleware/auth");

// All product routes require a valid login
router.use(protect);

// ── GET /api/products ────────────────────────
router.get("/", async (req, res) => {
  try {
    const { search, category, status, store } = req.query;

    // Build filter object dynamically
    const filter = { isActive: true };

    if (category) filter.category = category;
    if (store) filter["stockLocations.store"] = store;

    // Text search uses the { name: "text", sku: "text" } index
    if (search) filter.$text = { $search: search };

    const products = await Product.find(filter).sort({ createdAt: -1 });

    // Filter by status uses the virtual field (computed after fetch)
    const result = status
      ? products.filter((p) => p.stockStatus === status)
      : products;

    res.json({ products: result, total: result.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/products/:id ────────────────────
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/products ───────────────────────
router.post("/", requireRole("admin", "manager"), async (req, res) => {
  try {
    const product = await Product.create(req.body);
    // Notify all connected clients about the new product
    req.io.emit("inventory:updated", { action: "created", product });
    res.status(201).json({ product });
  } catch (err) {
    // Handle duplicate SKU error
    if (err.code === 11000) {
      return res.status(400).json({ message: "SKU already exists" });
    }
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/products/:id ────────────────────
router.put("/:id", requireRole("admin", "manager"), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true } // Return updated doc; run schema validators
    );
    if (!product) return res.status(404).json({ message: "Product not found" });

    req.io.emit("inventory:updated", { action: "updated", product });
    res.json({ product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/products/:id/stock ───────────
// Adjust stock at a specific store location.
// Body: { store: "Indore Main", delta: -2 }  (negative = deduct)
router.patch("/:id/stock", async (req, res) => {
  try {
    const { store, delta } = req.body;

    // Use MongoDB $inc operator to atomically increment the qty
    // This is safe even when multiple requests arrive simultaneously
    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        "stockLocations.store": store,
      },
      {
        $inc: { "stockLocations.$.qty": delta },
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product or store location not found" });
    }

    // Alert all clients if stock just went low
    req.io.emit("inventory:updated", { action: "stock_changed", product });

    if (product.stockStatus === "low" || product.stockStatus === "out") {
      req.io.emit("inventory:low_stock", {
        productId: product._id,
        name: product.name,
        status: product.stockStatus,
        totalStock: product.totalStock,
      });
    }

    res.json({ product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/products/:id ─────────────────
// Soft delete — set isActive to false, keep the record for reports
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    req.io.emit("inventory:updated", { action: "deleted", productId: req.params.id });
    res.json({ message: "Product deactivated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
