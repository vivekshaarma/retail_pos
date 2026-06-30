// ─────────────────────────────────────────────
//  Middleware: protect
//  Reads the JWT from the Authorization header,
//  verifies it, and attaches the user to req.
//
//  Usage: router.get("/secret", protect, handler)
//
//  How JWT works:
//    1. User logs in → server signs a token with JWT_SECRET
//    2. Client stores token and sends it in every request:
//       Authorization: Bearer <token>
//    3. This middleware verifies the signature
//    4. If valid, req.user is set; if not, 401 is returned
// ─────────────────────────────────────────────

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    // 1. Extract token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token — please log in" });
    }

    const token = authHeader.split(" ")[1]; // "Bearer abc123" → "abc123"

    // 2. Verify the token hasn't been tampered with and isn't expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded = { userId: "...", role: "admin", iat: ..., exp: ... }

    // 3. Look up the user (ensures account still exists and is active)
    const user = await User.findById(decoded.userId).select("-password");

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Account not found or deactivated" });
    }

    // 4. Attach user to request object for downstream handlers
    req.user = user;
    next();
  } catch (err) {
    // jwt.verify throws if token is expired or invalid
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Session expired — please log in again" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ── Role-based access control ────────────────
// Usage: router.delete("/product/:id", protect, requireRole("admin"), handler)
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Access denied — requires role: ${roles.join(" or ")}`,
    });
  }
  next();
};

module.exports = { protect, requireRole };
