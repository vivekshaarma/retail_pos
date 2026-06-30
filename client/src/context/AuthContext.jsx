// ─────────────────────────────────────────────
//  context/AuthContext.jsx
//  Provides login state to the entire app.
//
//  How React Context works:
//    1. Create a Context object (AuthContext)
//    2. Wrap the app in <AuthProvider> — this "provides" the value
//    3. Any component can call useAuth() to "consume" that value
//    4. When the value changes, all consumers re-render
// ─────────────────────────────────────────────

import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api";

// Step 1: Create the context with a default value of null
const AuthContext = createContext(null);

// Step 2: The provider component — wraps the whole app in App.jsx
export function AuthProvider({ children }) {
  // Initialize from localStorage so the user stays logged in on page refresh
  const [user, setUser]   = useState(() => JSON.parse(localStorage.getItem("user")));
  const [token, setToken] = useState(() => localStorage.getItem("accessToken"));
  const [loading, setLoading] = useState(false);

  // ── login ───────────────────────────────────
  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      // Store both tokens — access token for API calls, refresh token to renew it
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      setToken(data.accessToken);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || "Login failed" };
    } finally {
      setLoading(false);
    }
  };

  // ── logout ──────────────────────────────────
  const logout = () => {
    api.post("/auth/logout").catch(() => {}); // best-effort server-side revoke
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  // The value object is what all consumers receive via useAuth()
  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token,
    isAdmin:   user?.role === "admin",
    isManager: ["admin", "manager"].includes(user?.role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Step 3: Custom hook — cleaner than importing useContext everywhere
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
