// ─────────────────────────────────────────────
//  pages/NewSalePage.jsx
//  The actual point-of-sale screen:
//  • Browse products, add to cart
//  • Adjust quantities
//  • Choose channel / payment / store
//  • Submit → POST /api/orders (atomic stock deduction)
// ─────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { formatINR, EmptyState, Spinner } from "../components/ui";

const STORES   = ["Indore Main", "Indore Branch", "Online", "Warehouse"];
const CHANNELS = ["In-Store", "Online", "Phone Order"];
const PAYMENTS = ["Cash", "UPI", "Card", "Online"];

export default function NewSalePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");

  // Cart = array of { productId, name, sku, price, qty, maxQty }
  const [cart, setCart] = useState([]);

  // Sale meta info
  const [store, setStore]     = useState(user?.store || "Indore Main");
  const [channel, setChannel] = useState("In-Store");
  const [payment, setPayment] = useState("Cash");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  // ── Fetch available products ────────────────
  useEffect(() => {
    api.get("/products").then(({ data }) => {
      setProducts(data.products.filter((p) => p.totalStock > 0));
      setLoading(false);
    });
  }, []);

  // ── Get stock available at the selected store ──
  const stockAt = (product, storeName) => {
    const loc = product.stockLocations.find((l) => l.store === storeName);
    return loc ? loc.qty : 0;
  };

  // ── Add product to cart ─────────────────────
  const addToCart = (product) => {
    const available = stockAt(product, store);
    if (available === 0) {
      setError(`${product.name} is out of stock at ${store}`);
      return;
    }
    setError("");

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product._id);
      if (existing) {
        // Don't exceed available stock
        if (existing.qty >= available) return prev;
        return prev.map((item) =>
          item.productId === product._id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          qty: 1,
          maxQty: available,
        },
      ];
    });
  };

  // ── Update quantity in cart ──────────────────
  const updateQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, qty: Math.min(item.maxQty, Math.max(1, item.qty + delta)) }
            : item
        )
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // ── Totals ───────────────────────────────────
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax      = subtotal * 0.18; // 18% GST
  const total    = subtotal + tax;

  // ── Submit order ─────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError("Add at least one product to the cart");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const { data } = await api.post("/orders", {
        items: cart.map((item) => ({ productId: item.productId, qty: item.qty })),
        customer: { name: custName || "Walk-in", phone: custPhone },
        channel,
        store,
        paymentMethod: payment,
      });

      // Success — go to orders page to see the receipt
      navigate("/orders");
    } catch (err) {
      setError(err.response?.data?.message || "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filtered product list ───────────────────
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Spinner />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* ── Left: Product picker ─────────────── */}
      <div className="lg:col-span-2 space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">New sale</h1>
          <p className="text-sm text-gray-400">Select products to add to the cart</p>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-8"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Store selector — affects stock availability shown */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Selling from:</label>
          <select className="select w-auto text-xs py-1" value={store} onChange={(e) => { setStore(e.target.value); setCart([]); }}>
            {STORES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Product grid */}
        {filtered.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No products found" description="Try a different search term." />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map((p) => {
              const available = stockAt(p, store);
              const inCart = cart.find((c) => c.productId === p._id);
              return (
                <button
                  key={p._id}
                  onClick={() => addToCart(p)}
                  disabled={available === 0}
                  className={`card p-3 text-left transition-all ${
                    available === 0
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:border-brand-400 hover:shadow-md cursor-pointer"
                  } ${inCart ? "ring-2 ring-brand-500" : ""}`}
                >
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">{p.name}</p>
                  <p className="text-xs text-gray-400 mb-2">{p.sku}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-brand-700">{formatINR(p.price)}</span>
                    <span className="text-xs text-gray-400">{available} left</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Right: Cart / checkout panel ─────── */}
      <div className="card p-5 flex flex-col h-fit sticky top-0">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ShoppingCart size={16} />
          Cart ({cart.length})
        </h2>

        {cart.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">Cart is empty</p>
        ) : (
          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.productId} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{formatINR(item.price)} each</p>
                </div>
                {/* Quantity stepper */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-1">
                  <button onClick={() => updateQty(item.productId, -1)} className="p-1 hover:text-brand-600">
                    <Minus size={12} />
                  </button>
                  <span className="text-xs w-5 text-center font-medium">{item.qty}</span>
                  <button onClick={() => updateQty(item.productId, 1)} className="p-1 hover:text-brand-600">
                    <Plus size={12} />
                  </button>
                </div>
                <button onClick={() => removeFromCart(item.productId)} className="text-gray-300 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Customer info */}
        <div className="space-y-2 pt-3 border-t border-gray-100">
          <input
            className="input text-xs py-1.5"
            placeholder="Customer name (optional)"
            value={custName}
            onChange={(e) => setCustName(e.target.value)}
          />
          <input
            className="input text-xs py-1.5"
            placeholder="Phone (optional)"
            value={custPhone}
            onChange={(e) => setCustPhone(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <select className="select text-xs py-1.5" value={channel} onChange={(e) => setChannel(e.target.value)}>
              {CHANNELS.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select className="select text-xs py-1.5" value={payment} onChange={(e) => setPayment(e.target.value)}>
              {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Totals */}
        <div className="pt-3 mt-3 border-t border-gray-100 space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Subtotal</span><span>{formatINR(subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>GST (18%)</span><span>{formatINR(tax)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-gray-900 pt-1.5 border-t border-gray-100">
            <span>Total</span><span>{formatINR(total)}</span>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{error}</p>
        )}

        <button
          onClick={handleCheckout}
          disabled={submitting || cart.length === 0}
          className="btn-primary w-full justify-center mt-4 py-2.5"
        >
          {submitting ? "Processing…" : `Complete sale — ${formatINR(total)}`}
        </button>
      </div>
    </div>
  );
}
