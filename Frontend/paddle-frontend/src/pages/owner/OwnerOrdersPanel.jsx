import { useEffect, useState } from "react";
import { getStoreOrders, updateOrderStatus } from "../../api/owner";

const statuses = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

export default function OwnerOrdersPanel() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getStoreOrders();
      setOrders(data || []);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onStatusChange = async (id, status) => {
    try {
      await updateOrderStatus(id, { status });
      await load();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Status update failed.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white md:text-2xl">Orders</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Product orders from users
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">
                    {order.user?.fullName} · {order.user?.mobileNumber}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    Total PKR {String(order.totalAmount)} ·{" "}
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                  {order.shippingAddress && (
                    <p className="mt-1 text-xs text-white/70">
                      Ship to: {order.shippingAddress}
                    </p>
                  )}
                  <ul className="mt-2 space-y-1 text-xs text-white/80">
                    {(order.items || []).map((item) => (
                      <li key={item.id}>
                        {item.product?.name || "Product"} × {item.quantity} @ PKR{" "}
                        {String(item.price)}
                      </li>
                    ))}
                  </ul>
                </div>
                <select
                  className="rounded-lg border border-white/10 bg-[#0e1821] px-2 py-1.5 text-xs text-white"
                  value={order.status}
                  onChange={(e) => onStatusChange(order.id, e.target.value)}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
