// ─────────────────────────────────────────────
//  Routes: /api/orders
//  GET  /api/orders        → list orders (filterable)
//  GET  /api/orders/:id    → single order
//  POST /api/orders        → create new sale (deducts stock)
//  PATCH /api/orders/:id/status → update order status
// ─────────────────────────────────────────────

const router = require("express").Router();
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect, requireRole } = require("../middleware/auth");

router.use(protect);

// ── GET /api/orders ──────────────────────────
router.get("/", async (req, res) => {
  try {
    const { status, channel, store, startDate, endDate, limit = 50 } = req.query;

    const filter = {};
    if (status)  filter.status = status;
    if (channel) filter.channel = channel;
    if (store)   filter.store = store;

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate)   filter.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate("processedBy", "name"); // Join user name

    res.json({ orders, total: orders.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/orders/:id ──────────────────────
router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("processedBy", "name");
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/orders ─────────────────────────
// This is the most important route — it:
//   1. Validates stock availability
//   2. Deducts stock atomically using MongoDB sessions
//   3. Creates the order record
//   4. Emits real-time events via Socket.IO
router.post("/", async (req, res) => {
  // MongoDB sessions allow us to run multiple DB operations as one atomic unit.
  // If step 3 fails, steps 1-2 are automatically rolled back.
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, customer, channel, store, paymentMethod, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Order must have at least one item" });
    }

    const lineItems = [];
    let subtotal = 0;

    // ── Step 1: Validate all items & compute totals ──
    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);

      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      // Check stock at the requested store location
      const loc = product.stockLocations.find((l) => l.store === store);
      const available = loc ? loc.qty : 0;

      if (available < item.qty) {
        throw new Error(
          `Insufficient stock for "${product.name}": need ${item.qty}, have ${available}`
        );
      }

      const unitPrice = product.price;
      const itemSubtotal = unitPrice * item.qty;
      subtotal += itemSubtotal;

      lineItems.push({
        product:     product._id,
        productName: product.name,
        sku:         product.sku,
        qty:         item.qty,
        unitPrice,
        subtotal:    itemSubtotal,
      });
    }

    // ── Step 2: Deduct stock for each item ──────────
    for (const item of items) {
      await Product.findOneAndUpdate(
        {
          _id: item.productId,
          "stockLocations.store": store,
        },
        { $inc: { "stockLocations.$.qty": -item.qty } },
        { session }
      );
    }

    // ── Step 3: Create the order document ───────────
    const taxRate = 0.18;
    const tax = parseFloat((subtotal * taxRate).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    const [order] = await Order.create(
      [
        {
          customer: customer || {},
          items:    lineItems,
          subtotal,
          taxRate,
          tax,
          total,
          channel:       channel || "In-Store",
          store:         store   || "Indore Main",
          paymentMethod: paymentMethod || "Cash",
          processedBy:   req.user._id,
          notes:         notes || "",
          status:        "completed",
        },
      ],
      { session }
    );

    // ── Commit: all DB changes saved permanently ─────
    await session.commitTransaction();
    session.endSession();

    // ── Step 4: Emit real-time events ───────────────
    req.io.emit("order:new", { order });
    req.io.emit("inventory:updated", { action: "sale", items });

    // Check and broadcast low-stock alerts
    for (const item of items) {
      const updated = await Product.findById(item.productId);
      if (updated && (updated.stockStatus === "low" || updated.stockStatus === "out")) {
        req.io.emit("inventory:low_stock", {
          productId:  updated._id,
          name:       updated.name,
          status:     updated.stockStatus,
          totalStock: updated.totalStock,
        });
      }
    }

    res.status(201).json({ order });
  } catch (err) {
    // ── Rollback: undo all DB changes from this transaction ──
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: err.message });
  }
});

// ── PATCH /api/orders/:id/status ─────────────
router.patch("/:id/status", requireRole("admin", "manager"), async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found" });

    req.io.emit("order:updated", { order });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
