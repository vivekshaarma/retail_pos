// ─────────────────────────────────────────────
//  components/ui.jsx
//  Small reusable pieces used across all pages.
//  Keeping them here avoids copy-pasting Tailwind
//  class strings everywhere.
// ─────────────────────────────────────────────

// ── Status Badge ─────────────────────────────
// Maps a status string to a colored pill.
const STATUS_STYLES = {
  active:     "bg-emerald-50 text-emerald-700",
  low:        "bg-amber-50 text-amber-700",
  out:        "bg-red-50 text-red-700",
  completed:  "bg-emerald-50 text-emerald-700",
  processing: "bg-blue-50 text-blue-700",
  pending:    "bg-amber-50 text-amber-700",
  cancelled:  "bg-red-50 text-red-700",
  refunded:   "bg-gray-100 text-gray-600",
};

const STATUS_LABELS = {
  active: "Active", low: "Low stock", out: "Out of stock",
  completed: "Completed", processing: "Processing",
  pending: "Pending", cancelled: "Cancelled", refunded: "Refunded",
};

export function Badge({ status }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] || "bg-gray-100 text-gray-600"}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// ── Channel Badge ────────────────────────────
export function ChannelBadge({ channel }) {
  const styles = {
    "In-Store":   "bg-indigo-50 text-indigo-700",
    "Online":     "bg-cyan-50 text-cyan-700",
    "Phone Order":"bg-purple-50 text-purple-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[channel] || "bg-gray-100 text-gray-600"}`}>
      {channel}
    </span>
  );
}

// ── Stat Card ────────────────────────────────
// The metric cards at the top of Dashboard and Orders
export function StatCard({ icon: Icon, label, value, sub, iconColor = "text-brand-600" }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={iconColor} />
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Modal ────────────────────────────────────
// A centered modal dialog with a backdrop.
// children = the modal's content
export function Modal({ title, onClose, children }) {
  return (
    // Backdrop — clicking it closes the modal
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      {/* Stop clicks inside the modal from bubbling to the backdrop */}
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Empty State ──────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
        <Icon size={24} className="text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-400 mb-4 max-w-xs">{description}</p>
      {action}
    </div>
  );
}

// ── Loading Spinner ───────────────────────────
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Toast Notification ───────────────────────
// Shown at the bottom of the screen for 2 seconds
export function Toast({ message, type = "success" }) {
  if (!message) return null;
  const styles = {
    success: "bg-gray-900 text-white",
    error:   "bg-red-600 text-white",
  };
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-sm shadow-lg z-50 ${styles[type]}`}>
      {message}
    </div>
  );
}

// ── Form Row ─────────────────────────────────
// Wraps a label + input pair
export function FormRow({ label, children }) {
  return (
    <div className="mb-4">
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

// ── INR Formatter ────────────────────────────
export function formatINR(amount) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
