// ─────────────────────────────────────────────
//  App.jsx — Root component
//  Sets up:
//    • AuthProvider — global auth state
//    • BrowserRouter — client-side routing
//    • Route definitions
//    • Protected route guard
// ─────────────────────────────────────────────

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Pages
import LoginPage     from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import OrdersPage    from "./pages/OrdersPage";
import NewSalePage   from "./pages/NewSalePage";

// Layout
import Layout from "./components/Layout";

// ── Protected Route ──────────────────────────
// Renders children if logged in, otherwise redirects to /login.
// This is how you "lock" pages behind authentication in React Router v6.
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// ── App without providers ────────────────────
function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
        />

        {/* Protected routes — all wrapped in the sidebar Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* index = default child route at "/" */}
          <Route index element={<DashboardPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="orders"    element={<OrdersPage />} />
          <Route path="new-sale"  element={<NewSalePage />} />
        </Route>

        {/* Catch-all — redirect unknown URLs to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// ── Root App ─────────────────────────────────
// AuthProvider wraps everything so all routes can use useAuth()
export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
