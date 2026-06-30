// ─────────────────────────────────────────────
//  pages/LoginPage.jsx
//  Public page — shown when not logged in.
//  Calls AuthContext.login() which hits POST /api/auth/login
// ─────────────────────────────────────────────

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail]       = useState("admin@retailos.in");
  const [password, setPassword] = useState("admin123");
  const [error, setError]       = useState("");

  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent page reload (default form behavior)
    setError("");

    const result = await login(email, password);

    if (result.success) {
      navigate("/"); // Redirect to dashboard
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Store size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">RetailOS</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your store</p>
        </div>

        {/* Login form */}
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@retailos.in"
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Error message */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Hint for demo */}
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">Demo credentials pre-filled above</p>
          </div>
        </div>
      </div>
    </div>
  );
}
