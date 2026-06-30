// ─────────────────────────────────────────────
//  pages/InventoryPage.jsx
//  Full product list with:
//  • Search + category filter
//  • Low-stock alerts
//  • Add product modal
//  • Real-time updates via Socket.IO
// ─────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Package } from "lucide-react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import {
  Badge, Modal, EmptyState, Spinner, Toast,
  FormRow, formatINR,
} from "../components/ui";

const CATEGORIES = ["Electronics", "Sports", "Kitchen", "Stationery", "Clothing", "Other"];
const STORES = ["Indore Main", "Indore Branch", "Online", "Warehouse"];

export default function InventoryPage() {
  const { isManager } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [catFilter, setCat]     = useState("All");
  const [showModal, setModal]   = useState(false);
  const [toast, setToast]       = useState("");

  // ── Fetch products ─────────────────────────
  const fetchProducts = useCallback(async () => {
    try {
      const params = {};
      if (catFilter !== "All") params.category = catFilter;
      const { data } = await api.get("/products", { params });
      setProducts(data.products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [catFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ── Real-time inventory updates ────────────
  useSocket({
    "inventory:updated": () => fetchProducts(),
  });

  // ── Show toast for 2.5 seconds ─────────────
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  // ── Delete (soft) ──────────────────────────
  const deleteProduct = async (id, name) => {
    if (!window.confirm(`Deactivate "${name}"? It won't appear in sales.`)) return;
    try {
      await api.delete(`/products/${id}`);
      showToast("Product deactivated");
    } catch (err) {
      showToast("Failed to deactivate");
    }
  };

  // ── Client-side search filter ──────────────
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockProducts = products.filter(
    (p) => p.stockStatus === "low" || p.stockStatus === "out"
  );

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-400">{products.length} products across all locations</p>
        </div>
        {isManager && (
          <button className="btn-primary" onClick={() => setModal(true)}>
            <Plus size={16} />
            Add product
          </button>
        )}
      </div>

      {/* Low-stock alerts */}
      {lowStockProducts.length > 0 && (
        <div className="card p-4 border-amber-200 bg-amber-50 space-y-1.5">
          <p className="text-xs font-medium text-amber-800 mb-2">
            ⚠️ Stock alerts ({lowStockProducts.length})
          </p>
          {lowStockProducts.map((p) => (
            <div key={p._id} className="flex items-center justify-between text-xs text-amber-700">
              <span>{p.name} ({p.sku})</span>
              <Badge status={p.stockStatus} />
            </div>
          ))}
        </div>
      )}

      {/* Search + filter bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-8"
            placeholder="Search by name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="select w-40"
          value={catFilter}
          onChange={(e) => setCat(e.target.value)}
        >
          <option value="All">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products found"
          description="Add your first product or adjust the search filter."
          action={isManager && (
            <button className="btn-primary" onClick={() => setModal(true)}>
              <Plus size={16} /> Add product
            </button>
          )}
        />
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Product", "SKU", "Category", "Price", "Stock", "Locations", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {p.sku}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.category}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatINR(p.price)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{p.totalStock}</span>
                        {/* Stock bar */}
                        <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (p.totalStock / 100) * 100)}%`,
                              background:
                                p.totalStock === 0 ? "#ef4444"
                                : p.totalStock < 10 ? "#f59e0b"
                                : "#10b981",
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.stockLocations?.map((loc) => (
                          <span key={loc.store} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {loc.store}: {loc.qty}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={p.stockStatus} />
                    </td>
                    <td className="px-4 py-3">
                      {isManager && (
                        <button
                          onClick={() => deleteProduct(p._id, p.name)}
                          className="text-xs text-red-500 hover:text-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showModal && (
        <AddProductModal
          onClose={() => setModal(false)}
          onSuccess={() => { showToast("Product added"); fetchProducts(); }}
        />
      )}

      <Toast message={toast} />
    </div>
  );
}

// ── Add Product Modal ─────────────────────────
function AddProductModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: "", sku: "", category: "Electronics",
    price: "", costPrice: "", store: "Indore Main", qty: "",
    lowStockThreshold: "10",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.sku || !form.price || !form.qty) {
      setError("Name, SKU, price, and stock quantity are required");
      return;
    }
    setSaving(true);
    try {
      await api.post("/products", {
        name:     form.name,
        sku:      form.sku.toUpperCase(),
        category: form.category,
        price:    Number(form.price),
        costPrice: Number(form.costPrice) || 0,
        lowStockThreshold: Number(form.lowStockThreshold),
        stockLocations: [{ store: form.store, qty: Number(form.qty) }],
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add product" onClose={onClose}>
      {error && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
      )}
      <FormRow label="Product name">
        <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Wireless Earbuds Pro" />
      </FormRow>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="SKU">
          <input className="input" value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="WE-007" />
        </FormRow>
        <FormRow label="Category">
          <select className="select" value={form.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </FormRow>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Selling price (₹)">
          <input className="input" type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="1299" />
        </FormRow>
        <FormRow label="Cost price (₹)">
          <input className="input" type="number" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} placeholder="700" />
        </FormRow>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Initial stock qty">
          <input className="input" type="number" value={form.qty} onChange={(e) => set("qty", e.target.value)} placeholder="50" />
        </FormRow>
        <FormRow label="Low stock threshold">
          <input className="input" type="number" value={form.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value)} />
        </FormRow>
      </div>
      <FormRow label="Store location">
        <select className="select" value={form.store} onChange={(e) => set("store", e.target.value)}>
          {STORES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </FormRow>
      <div className="flex gap-3 pt-2">
        <button className="btn-secondary flex-1 justify-center" onClick={onClose}>Cancel</button>
        <button className="btn-primary flex-1 justify-center" onClick={submit} disabled={saving}>
          {saving ? "Saving…" : "Add product"}
        </button>
      </div>
    </Modal>
  );
}
