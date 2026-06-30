// ─────────────────────────────────────────────
//  Routes: /api/dashboard
//  GET /api/dashboard/stats   → KPI summary cards
//  GET /api/dashboard/revenue → revenue over time
//  GET /api/dashboard/top-products → best sellers
// ─────────────────────────────────────────────

const router = require("express").Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect } = require("../middleware/auth");

router.use(protect);

// ── GET /api/dashboard/stats ─────────────────
// Aggregation pipeline: think of it as SQL GROUP BY + SUM, but for MongoDB.
// Each stage in the array transforms the collection of documents.
router.get("/stats", async (req, res) => {
  try {
    // Date range: today only
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // ── Aggregation pipeline for today's orders ──
    const [todayStats] = await Order.aggregate([
      // Stage 1: Filter — only today's completed orders
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          status: { $in: ["completed", "processing"] },
        },
      },
      // Stage 2: Group — compute totals across all matching documents
      {
        $group: {
          _id: null, // null = group everything together
          totalRevenue:  { $sum: "$total" },
          totalOrders:   { $sum: 1 },
          totalItems:    { $sum: { $sum: "$items.qty" } },
          avgOrderValue: { $avg: "$total" },
        },
      },
    ]);

    // Inventory summary — uses virtual fields after fetch
    const products = await Product.find({ isActive: true });
    const lowStockCount  = products.filter((p) => p.stockStatus === "low").length;
    const outStockCount  = products.filter((p) => p.stockStatus === "out").length;
    const totalProducts  = products.length;

    res.json({
      today: {
        revenue:       todayStats?.totalRevenue  || 0,
        orders:        todayStats?.totalOrders   || 0,
        items:         todayStats?.totalItems    || 0,
        avgOrderValue: Math.round(todayStats?.avgOrderValue || 0),
      },
      inventory: {
        total:    totalProducts,
        lowStock: lowStockCount,
        outStock: outStockCount,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/dashboard/revenue ───────────────
// Daily revenue for the last 7 days
router.get("/revenue", async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const data = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
          status: { $in: ["completed"] },
        },
      },
      // Group by calendar date
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          revenue: { $sum: "$total" },
          orders:  { $sum: 1 },
        },
      },
      // Sort chronologically
      { $sort: { _id: 1 } },
      // Rename _id to date
      { $project: { date: "$_id", revenue: 1, orders: 1, _id: 0 } },
    ]);

    res.json({ data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/dashboard/top-products ──────────
// Top 5 best-selling products by quantity
router.get("/top-products", async (req, res) => {
  try {
    const data = await Order.aggregate([
      { $match: { status: "completed" } },
      // Unwind: one doc per line item
      { $unwind: "$items" },
      {
        $group: {
          _id:         "$items.product",
          productName: { $first: "$items.productName" },
          totalQty:    { $sum: "$items.qty" },
          totalRev:    { $sum: "$items.subtotal" },
        },
      },
      { $sort: { totalQty: -1 } },
      { $limit: 5 },
      { $project: { productName: 1, totalQty: 1, totalRev: 1, _id: 0 } },
    ]);

    res.json({ data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
