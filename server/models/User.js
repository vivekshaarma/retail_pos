// ─────────────────────────────────────────────
//  Model: User
//  Stores staff accounts. Passwords are NEVER
//  saved as plain text — bcrypt hashes them.
// ─────────────────────────────────────────────

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,           // No duplicate accounts
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,          // Never returned in queries by default
    },
    role: {
      type: String,
      enum: ["admin", "manager", "cashier"],
      default: "cashier",
    },
    store: {
      type: String,
      default: "Indore Main",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Stores the current valid refresh token (hashed in production).
    // Setting this to null effectively "logs out" the user everywhere.
    refreshToken: {
      type: String,
      select: false, // Never returned by default queries
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// ── Pre-save hook ────────────────────────────
// Runs BEFORE every .save() call.
// If the password field changed, hash it with bcrypt (cost factor 10).
userSchema.pre("save", async function (next) {
  // Only hash if password was modified (not on other updates)
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ── Instance method ──────────────────────────
// Called during login to compare plain text vs stored hash.
userSchema.methods.comparePassword = async function (plainText) {
  return bcrypt.compare(plainText, this.password);
};

module.exports = mongoose.model("User", userSchema);
