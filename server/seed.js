// ─────────────────────────────────────────────
//  Seed Script
//  Populates the database with sample data.
//  Run: node seed.js
//
//  ⚠️  This DELETES existing data before inserting.
//  Only use on a dev/test database.
// ─────────────────────────────────────────────

const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const User    = require("./models/User");
const Product = require("./models/Product");
const Order   = require("./models/Order");

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // Wipe existing data
  await Promise.all([User.deleteMany(), Product.deleteMany(), Order.deleteMany()]);
  console.log("🗑  Cleared existing data");

  // ── Create users ─────────────────────────────
  const admin = await User.create({
    name: "Vivek Sharma",
    email: "admin@retailos.in",
    password: "admin123",
    role: "admin",
    store: "Indore Main",
  });

  await User.create({
    name: "Priya Patel",
    email: "manager@retailos.in",
    password: "manager123",
    role: "manager",
    store: "Indore Branch",
  });

  await User.create({
    name: "Rahul Singh",
    email: "cashier@retailos.in",
    password: "cashier123",
    role: "cashier",
    store: "Indore Main",
  });

  console.log("👤 Users created");

  // ── Create products ───────────────────────────
  const products = await Product.create([
    {
      name: "Wireless Earbuds Pro",
      sku: "WE-001",
      category: "Electronics",
      price: 1299,
      costPrice: 700,
      stockLocations: [
        { store: "Indore Main", qty: 45 },
        { store: "Online", qty: 20 },
      ],
    },
    {
      name: "Yoga Mat Premium",
      sku: "YM-002",
      category: "Sports",
      price: 599,
      costPrice: 250,
      stockLocations: [
        { store: "Indore Main", qty: 8 },
        { store: "Online", qty: 3 },
      ],
      lowStockThreshold: 15,
    },
    {
      name: "Ceramic Coffee Mug",
      sku: "CM-003",
      category: "Kitchen",
      price: 299,
      costPrice: 80,
      stockLocations: [
        { store: "Indore Branch", qty: 0 },
        { store: "Online", qty: 0 },
      ],
    },
    {
      name: "Notebook A5 Hardcover",
      sku: "NB-004",
      category: "Stationery",
      price: 149,
      costPrice: 40,
      stockLocations: [
        { store: "Indore Main", qty: 120 },
        { store: "Indore Branch", qty: 60 },
        { store: "Online", qty: 200 },
      ],
    },
    {
      name: "USB-C 7-in-1 Hub",
      sku: "UC-005",
      category: "Electronics",
      price: 899,
      costPrice: 450,
      stockLocations: [
        { store: "Indore Main", qty: 14 },
        { store: "Online", qty: 8 },
      ],
    },
    {
      name: "Insulated Water Bottle",
      sku: "WB-006",
      category: "Sports",
      price: 349,
      costPrice: 120,
      stockLocations: [
        { store: "Indore Main", qty: 5 },
        { store: "Online", qty: 12 },
      ],
      lowStockThreshold: 10,
    },
    {
      name: "Mechanical Keyboard TKL",
      sku: "KB-007",
      category: "Electronics",
      price: 2499,
      costPrice: 1200,
      stockLocations: [
        { store: "Indore Main", qty: 7 },
        { store: "Online", qty: 4 },
      ],
    },
    {
      name: "Cotton Polo T-Shirt",
      sku: "TS-008",
      category: "Clothing",
      price: 399,
      costPrice: 130,
      stockLocations: [
        { store: "Indore Main", qty: 35 },
        { store: "Indore Branch", qty: 28 },
      ],
    },
  ]);

  console.log("📦 Products created");

  // ── Create sample orders ──────────────────────
  await Order.create([
    {
      customer: { name: "Ankit Verma", phone: "9876543210" },
      items: [
        { product: products[0]._id, productName: products[0].name, sku: products[0].sku, qty: 1, unitPrice: 1299, subtotal: 1299 },
        { product: products[3]._id, productName: products[3].name, sku: products[3].sku, qty: 2, unitPrice: 149, subtotal: 298 },
      ],
      subtotal: 1597, taxRate: 0.18, tax: 287.46, total: 1884.46,
      channel: "In-Store", store: "Indore Main",
      paymentMethod: "UPI", processedBy: admin._id, status: "completed",
    },
    {
      customer: { name: "Sneha Patel", email: "sneha@example.com" },
      items: [
        { product: products[4]._id, productName: products[4].name, sku: products[4].sku, qty: 1, unitPrice: 899, subtotal: 899 },
      ],
      subtotal: 899, taxRate: 0.18, tax: 161.82, total: 1060.82,
      channel: "Online", store: "Online",
      paymentMethod: "Online", processedBy: admin._id, status: "completed",
    },
    {
      customer: { name: "Raj Gupta" },
      items: [
        { product: products[7]._id, productName: products[7].name, sku: products[7].sku, qty: 3, unitPrice: 399, subtotal: 1197 },
      ],
      subtotal: 1197, taxRate: 0.18, tax: 215.46, total: 1412.46,
      channel: "In-Store", store: "Indore Branch",
      paymentMethod: "Cash", processedBy: admin._id, status: "completed",
    },
  ]);

  console.log("🧾 Sample orders created");
  console.log("\n✅ Database seeded successfully!");
  console.log("──────────────────────────────────");
  console.log("Login credentials:");
  console.log("  Admin:   admin@retailos.in   / admin123");
  console.log("  Manager: manager@retailos.in / manager123");
  console.log("  Cashier: cashier@retailos.in / cashier123");

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
