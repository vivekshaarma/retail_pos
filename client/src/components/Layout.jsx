// ─────────────────────────────────────────────
//  components/Layout.jsx
//  The persistent shell: sidebar + top bar.
//  <Outlet /> is where React Router renders
//  the active child route (Dashboard, Inventory…)
// ─────────────────────────────────────────────

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, ShoppingCart, Plus,
  LogOut, Store, User, Bell,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import { useState } from "react";

// Navigation items — icon, label, path
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview",   path: "/" },
  { icon: Package,         label: "Inventory",  path: "/inventory" },
  { icon: ShoppingCart,    label: "Orders",     path: "/orders" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);

  // Listen for real-time low-stock alerts from Socket.IO
  useSocket({
    "inventory:low_stock": (data) => {
      setAlerts((prev) => [
        { id: Date.now(), ...data },
        ...prev.slice(0, 4), // Keep only last 5
      ]);
    },
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* ── Sidebar ───────────────────────────── */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        {/* Brand */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-100">
          <Store size={20} className="text-brand-600" />
          <span className="font-semibold text-sm text-gray-900">RetailOS</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"} // "end" prevents "/" from matching all routes
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}

          {/* New Sale CTA */}
          <div className="pt-3">
            <button
              onClick={() => navigate("/new-sale")}
              className="btn-primary w-full justify-center"
            >
              <Plus size={16} />
              New sale
            </button>
          </div>
        </nav>

        {/* User profile */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center">
              <User size={14} className="text-brand-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              className="text-gray-400 hover:text-red-600 transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content area ────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400">{user?.store}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Low-stock alert bell */}
            <div className="relative">
              <Bell size={16} className="text-gray-400" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full
                                 text-white text-[9px] flex items-center justify-center font-medium">
                  {alerts.length}
                </span>
              )}
            </div>
            {/* Live indicator */}
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Live
            </div>
          </div>
        </header>

        {/* Low-stock alert banner */}
        {alerts.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between">
            <p className="text-xs text-amber-800">
              ⚠️ {alerts[0].name} is {alerts[0].status === "out" ? "out of stock" : "running low"} ({alerts[0].totalStock} remaining)
            </p>
            <button
              onClick={() => setAlerts([])}
              className="text-xs text-amber-600 hover:text-amber-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Page content — React Router renders the child route here */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
