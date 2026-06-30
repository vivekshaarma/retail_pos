// ─────────────────────────────────────────────
//  Routes: /api/auth
//  POST /api/auth/register  → create account
//  POST /api/auth/login     → get JWT token
//  GET  /api/auth/me        → get current user
// ─────────────────────────────────────────────

const router = require("express").Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

// ── Helper: sign a short-lived access token ──
// This is what's sent with every API request — expires quickly
// so a stolen token has a small window of usefulness.
const signAccessToken = (userId, role) =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: "15m" });

// ── Helper: sign a long-lived refresh token ──
// Used ONLY to request new access tokens — never sent with normal API calls.
// Uses a separate secret so leaking one token type doesn't compromise the other.
const signRefreshToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: "30d" });

// ── POST /api/auth/register ──────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, store } = req.body;

    // Check if email already taken
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Create user — password is hashed by the pre-save hook in User model
    const user = await User.create({ name, email, password, role, store });

    const accessToken  = signAccessToken(user._id, user.role);
    const refreshToken = signRefreshToken(user._id);

    // Store refresh token on the user record so we can revoke it later
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
        store: user.store,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/login ─────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // .select("+password") overrides the schema's select:false
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      // Generic message — don't reveal whether email exists
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: "Account deactivated — contact admin" });
    }

    const accessToken  = signAccessToken(user._id, user.role);
    const refreshToken = signRefreshToken(user._id);

    // Save the refresh token so /auth/refresh can validate it later.
    // This also lets you force-logout a user by clearing this field.
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
        store: user.store,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/refresh ───────────────────
// Client calls this when its access token expires.
// Body: { refreshToken: "..." }
// Returns a brand-new access token (and rotates the refresh token).
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    // Verify it against the REFRESH secret (different from access secret)
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Refresh token invalid or expired — please log in again" });
    }

    // Confirm this exact token is the one we issued and stored.
    // If it doesn't match (or user logged out elsewhere), reject it.
    const user = await User.findById(decoded.userId).select("+refreshToken");
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "Refresh token revoked — please log in again" });
    }

    // Issue a new access token
    const newAccessToken = signAccessToken(user._id, user.role);

    // Rotate the refresh token — issuing a new one and invalidating the old.
    // This limits damage if a refresh token is ever stolen.
    const newRefreshToken = signRefreshToken(user._id);
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/logout ────────────────────
// Clears the stored refresh token so it can no longer be used,
// even if the attacker still has the old refresh token value.
router.post("/logout", protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.json({ message: "Logged out" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/auth/me ─────────────────────────
// Protected route — requires valid JWT in header
router.get("/me", protect, (req, res) => {
  // req.user is set by the protect middleware
  res.json({ user: req.user });
});

module.exports = router;
