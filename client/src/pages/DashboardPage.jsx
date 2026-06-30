// ─────────────────────────────────────────────
//  pages/DashboardPage.jsx
//  KPI overview + revenue chart + top products.
//  Uses Recharts for the bar chart.
// ─────────────────────────────────────────────

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  IndianRupee, ShoppingBag, Package, AlertTriangle,
} from "lucide-react";
import api from "../utils/api";
import { StatCard, Spinner, formatINR } from "../components/ui";
import { useSocket } from "../hooks/useSocket";

export default function DashboardPage() {
  const [stats, setStats]         = useState(null);
  const [revenue, setRevenue]     = useState([]);
  const [topProducts, setTop]     = useState([]);
  const [loading, setLoading]     = useState(true);

  // Fetch all dashboard data when page loads
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        // Run all three requests in parallel using Promise.all
        const [s, r, t] = await Promise.all([
          api.get("/dashboard/stats"),
          api.get("/dashboard/revenue"),
          api.get("/dashboard/top-products"),
        ]);
        setStats(s.data);
        setRevenue(r.data.data);
        setTop(t.data.data);
      } catch (err) {
        console.error("Dashboard load failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []); // [] = run once on mount

  // Re-fetch stats when a new order comes in via Socket.IO
  useSocket({
    "order:new": async () => {
      const [s] = await Promise.all([
        api.get("/dashboard/stats"),
        api.get("/dashboard/revenue"),
      ]);
      setStats(s.data);
    },
  });

  if (loading) return <Spinner />;

  // Format revenue data for Recharts
  // Recharts expects an array of objects with consistent keys
  const chartData = revenue.map((d) => ({
    date:    new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" }),
    revenue: Math.round(d.revenue),
    orders:  d.orders,
  }));

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-400">
          {new Date().toLocaleDateString("en-IN", { dateStyle: "full" })}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={IndianRupee}
          label="Revenue today"
          value={formatINR(stats?.today?.revenue || 0)}
          sub="All channels combined"
          iconColor="text-emerald-600"
        />
        <StatCard
          icon={ShoppingBag}
          label="Orders today"
          value={stats?.today?.orders || 0}
          sub={`Avg ${formatINR(stats?.today?.avgOrderValue || 0)} per order`}
        />
        <StatCard
          icon={Package}
          label="Products"
          value={stats?.inventory?.total || 0}
          sub={`${stats?.inventory?.outStock || 0} out of stock`}
          iconColor="text-blue-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="Stock alerts"
          value={(stats?.inventory?.lowStock || 0) + (stats?.inventory?.outStock || 0)}
          sub="Low + out of stock"
          iconColor="text-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart — takes 2/3 width */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Revenue — last 7 days</h2>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">
              No data yet — make some sales first
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => [formatINR(value), "Revenue"]}
                  contentStyle={{
                    fontSize: 12, borderRadius: 8,
                    border: "1px solid #e5e7eb", boxShadow: "none",
                  }}
                />
                <Bar dataKey="revenue" fill="#185fa5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top products — takes 1/3 width */}
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Top products</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400">No sales recorded yet</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.productName} className="flex items-center gap-3">
                  {/* Rank number */}
                  <span className="text-xs font-mono text-gray-300 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{p.productName}</p>
                    <p className="text-xs text-gray-400">{p.totalQty} units · {formatINR(p.totalRev)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
