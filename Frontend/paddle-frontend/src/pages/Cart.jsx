import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaMinus, FaPlus, FaTrash } from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import { useCart } from "../context/CartContext";
import { createOrder, getMyOrders } from "../api/orders";

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

function formatPrice(price, currency = "PKR") {
  const n = Number(price);
  if (Number.isNaN(n)) return `${currency} ${price}`;
  return `${currency} ${n.toLocaleString()}`;
}

const STATUS_STYLES = {
  PENDING: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  CONFIRMED: "border-sky-400/40 bg-sky-400/10 text-sky-300",
  SHIPPED: "border-violet-400/40 bg-violet-400/10 text-violet-300",
  DELIVERED: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  CANCELLED: "border-red-400/40 bg-red-400/10 text-red-300",
};

export default function Cart() {
  const navigate = useNavigate();
  const { items, total, setQuantity, removeItem, clearCart } = useCart();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const { data } = await getMyOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load orders."
      );
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const placeOrder = async () => {
    if (!items.length) return;
    setPlacing(true);
    setError("");
    setMessage("");
    try {
      const byOwner = new Map();
      for (const item of items) {
        const key = String(item.paddleOwnerId);
        if (!byOwner.has(key)) byOwner.set(key, []);
        byOwner.get(key).push({
          productId: item.productId,
          quantity: item.quantity,
        });
      }

      for (const orderItems of byOwner.values()) {
        await createOrder({
          items: orderItems,
          shippingAddress: shippingAddress.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      }

      clearCart();
      setShippingAddress("");
      setNotes("");
      setMessage(
        byOwner.size > 1
          ? `Placed ${byOwner.size} orders (one per store).`
          : "Order placed successfully."
      );
      await loadOrders();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Failed to place order."
      );
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />

      <main className="mx-auto w-full max-w-md space-y-5 px-4 pb-28 pt-20">
        <h1 className="text-xl font-bold text-white">Cart</h1>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-emerald-400">{message}</p>}

        <section className="space-y-3 rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4">
          <h2 className="text-sm font-semibold text-white">Your cart</h2>

          {items.length === 0 ? (
            <div className="space-y-3 py-4 text-center">
              <p className="text-sm text-white/45">Your cart is empty.</p>
              <button
                type="button"
                onClick={() => navigate("/shop")}
                className="rounded-full bg-[var(--color-secondary)] px-5 py-2 text-sm font-bold text-white"
              >
                Browse shop
              </button>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li
                    key={item.productId}
                    className="flex gap-3 rounded-xl border border-white/10 bg-[#0e1821] p-2.5"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface)]">
                      {mediaUrl(item.image) ? (
                        <img
                          src={mediaUrl(item.image)}
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
                      <p className="truncate text-sm font-semibold text-white">
                        {item.name}
                      </p>
                      {item.organizationName && (
                        <p className="truncate text-[10px] text-white/40">
                          {item.organizationName}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs font-bold text-[var(--color-primary)]">
                        {formatPrice(item.price, item.currency)}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity(item.productId, item.quantity - 1)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 text-white/70"
                          aria-label="Decrease quantity"
                        >
                          <FaMinus className="h-2.5 w-2.5" />
                        </button>
                        <span className="min-w-6 text-center text-sm text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity(item.productId, item.quantity + 1)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 text-white/70"
                          aria-label="Increase quantity"
                        >
                          <FaPlus className="h-2.5 w-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-red-300 hover:bg-red-500/10"
                          aria-label="Remove item"
                        >
                          <FaTrash className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <label className="block">
                <span className="mb-1.5 block text-xs text-white/45">
                  Shipping address (optional)
                </span>
                <input
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Address / city"
                  className="w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/45">
                  Notes (optional)
                </span>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions"
                  className="w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
                />
              </label>

              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <p className="text-sm text-white/60">Total</p>
                <p className="text-base font-bold text-[var(--color-primary)]">
                  {formatPrice(total)}
                </p>
              </div>

              <button
                type="button"
                disabled={placing}
                onClick={placeOrder}
                className="w-full rounded-full bg-[var(--color-secondary)] py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {placing ? "Placing order..." : "Place order"}
              </button>
            </>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">Previous orders</h2>
          {loadingOrders ? (
            <p className="text-sm text-white/40">Loading orders...</p>
          ) : orders.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-[var(--color-surface)] px-4 py-6 text-sm text-white/40">
              No previous orders yet.
            </p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {order.paddleOwner?.organizationName || "Store"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-white/40">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        STATUS_STYLES[order.status] ||
                        "border-white/15 bg-white/5 text-white/70"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {(order.items || []).map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-2.5 text-xs text-white/75"
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#0e1821]">
                          {mediaUrl(item.product?.images?.[0]?.url) ? (
                            <img
                              src={mediaUrl(item.product.images[0].url)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-white">
                            {item.product?.name || "Product"}
                          </p>
                          <p className="text-white/45">
                            × {item.quantity} · {formatPrice(item.price)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-right text-sm font-bold text-[var(--color-primary)]">
                    Total {formatPrice(order.totalAmount)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav
        onChange={(id) => {
          if (id === "home") navigate("/");
          else if (id === "profile") navigate("/profile");
          else navigate(`/${id}`);
        }}
      />
    </div>
  );
}
