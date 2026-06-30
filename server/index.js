// ─────────────────────────────────────────────
//  RetailOS — Express Server Entry Point
//  This file boots the entire backend:
//    1. Connect to MongoDB
//    2. Mount REST API routes
//    3. Attach Socket.IO for real-time events
// ─────────────────────────────────────────────

const express = require("express");
const http = require("http");           // Node built-in HTTP server
const { Server } = require("socket.io"); // Socket.IO wraps the HTTP server
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// Load .env variables into process.env
dotenv.config();

const app = express();
// Wrap Express in a raw HTTP server so Socket.IO can share the same port
const server = http.createServer(app);

// ── Socket.IO setup ──────────────────────────
// Socket.IO enables real-time push to all connected browsers.
// When a sale is made, we emit "inventory:updated" so every open tab
// refreshes stock counts without polling.
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Make `io` available inside route handlers via req.io
// (we attach it in controllers to emit after DB writes)
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// ── Middleware ───────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json()); // Parse JSON request bodies

// ── Route mounting ───────────────────────────
// Each file in /routes handles one resource
app.use("/api/auth",      require("./routes/auth"));
app.use("/api/products",  require("./routes/products"));
app.use("/api/orders",    require("./routes/orders"));
app.use("/api/dashboard", require("./routes/dashboard"));

// ── Root health-check ────────────────────────
app.get("/", (_req, res) => res.json({ status: "RetailOS API running 🚀" }));

// ── Socket.IO connection handler ─────────────
io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// ── MongoDB connection + server start ────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    server.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1); // Exit so the process manager can restart
  });
