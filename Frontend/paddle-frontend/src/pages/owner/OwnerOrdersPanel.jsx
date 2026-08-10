import { useEffect, useState } from "react";
import { getStoreOrders, updateOrderStatus } from "../../api/owner";
import CustomSelect from "../../components/CustomSelect";

const statuses = [
  { value: "PENDING", label: "PENDING" },
  { value: "CONFIRMED", label: "CONFIRMED" },
  { value: "SHIPPED", label: "SHIPPED" },
  { value: "DELIVERED", label: "DELIVERED" },
  { value: "CANCELLED", label: "CANCELLED" },
];

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

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
      setError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load orders."
      );
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
      setError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Status update failed."
      );
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
        <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
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
                <div className="min-w-0 flex-1">
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
                  <ul className="mt-3 space-y-2">
                    {(order.items || []).map((item) => {
                      const image = mediaUrl(item.product?.images?.[0]?.url);
                      return (
                        <li
                          key={item.id}
                          className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0e1821] p-2"
                        >
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface)]">
                            {image ? (
                              <img
                                src={image}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[9px] text-white/30">
                                No img
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">
                              {item.product?.name || "Product"}
                            </p>
                            <p className="text-xs text-white/50">
                              × {item.quantity} · PKR {String(item.price)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="w-full min-w-[10rem] sm:w-44">
                  <CustomSelect
                    value={order.status}
                    onChange={(status) => onStatusChange(order.id, status)}
                    allowEmpty={false}
                    options={statuses}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
