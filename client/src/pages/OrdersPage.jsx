// ─────────────────────────────────────────────
//  pages/OrdersPage.jsx
//  Lists all transactions with filters.
//  Auto-refreshes when new orders arrive via Socket.IO.
// ─────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import { ShoppingBag, IndianRupee, TrendingUp, Filter } from "lucide-react";
import api from "../utils/api";
import { useSocket } from "../hooks/useSocket";
import { Badge, ChannelBadge, StatCard, Spinner, EmptyState, formatINR } from "../components/ui";

const STATUSES  = ["All", "completed", "processing", "pending", "cancelled"];
const CHANNELS  = ["All", "In-Store", "Online", "Phone Order"];

export default function OrdersPage() {
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatus] = useState("All");
  const [chanFilter, setChan]     = useState("All");

  const fetchOrders = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter !== "All") params.status = statusFilter;
      if (chanFilter   !== "All") params.channel = chanFilter;
      const { data } = await api.get("/orders", { params });
      setOrders(data.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, chanFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Real-time: refresh when any order changes
  useSocket({
    "order:new":     () => fetchOrders(),
    "order:updated": () => fetchOrders(),
  });

  // Compute summary stats from current list
  const totalRevenue = orders
    .filter((o) => o.status === "completed")
    .reduce((s, o) => s + o.total, 0);

  const onlineOrders  = orders.filter((o) => o.channel === "Online").length;
  const instoreOrders = orders.filter((o) => o.channel === "In-Store").length;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-400">{orders.length} transactions</p>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={IndianRupee}
          label="Total revenue"
          value={formatINR(totalRevenue)}
          iconColor="text-emerald-600"
        />
        <StatCard
          icon={ShoppingBag}
          label="In-store orders"
          value={instoreOrders}
          iconColor="text-indigo-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Online orders"
          value={onlineOrders}
          iconColor="text-cyan-600"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter size={14} className="text-gray-400" />
        <div className="flex gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                statusFilter === s
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "All" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-2 pl-2 border-l border-gray-200">
          {CHANNELS.map((c) => (
            <button
              key={c}
              onClick={() => setChan(c)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                chanFilter === c
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c === "All" ? "All channels" : c}
            </button>
          ))}
        </div>
      </div>

      {/* Orders table */}
      {orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders yet"
          description="Sales will appear here as you record them."
        />
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {["Order", "Customer", "Items", "Total", "Channel", "Payment", "Time", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o) => (
                <tr key={o._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-gray-500">{o.orderNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{o.customer?.name || "Walk-in"}</p>
                    {o.customer?.phone && (
                      <p className="text-xs text-gray-400">{o.customer.phone}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {o.items?.length} {o.items?.length === 1 ? "item" : "items"}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {formatINR(o.total)}
                  </td>
                  <td className="px-4 py-3">
                    <ChannelBadge channel={o.channel} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{o.paymentMethod}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(o.createdAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
