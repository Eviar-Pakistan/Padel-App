import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import { getShopProduct } from "../api/shop";
import { useCart } from "../context/CartContext";

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

function DetailRow({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 border-b border-white/5 py-3">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-white/40">
        {label}
      </dt>
      <dd className="text-sm text-white/90">{value}</dd>
    </div>
  );
}

export default function ShopProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [slide, setSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await getShopProduct(id);
        if (cancelled) return;
        if (data?.status && data.status !== "ACTIVE" && data.status !== "OUT_OF_STOCK") {
          setError("This product is not available.");
          setProduct(null);
        } else {
          setProduct(data);
          setSlide(0);
        }
      } catch (err) {
        const msg = err.response?.data?.message;
        if (!cancelled) {
          setError(
            Array.isArray(msg)
              ? msg.join(", ")
              : msg || "Failed to load product."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const images = product?.images || [];
  const current = mediaUrl(images[slide]?.url);

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />

      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-20">
        <button
          type="button"
          onClick={() => navigate("/shop")}
          className="mb-4 inline-flex items-center gap-2 rounded-lg px-1 py-1 text-sm text-white/70 hover:text-white"
        >
          <FaArrowLeft className="h-3.5 w-3.5" />
          Back to shop
        </button>

        {loading ? (
          <p className="text-sm text-[var(--color-muted)]">Loading product...</p>
        ) : error && !product ? (
          <div className="space-y-3">
            <p className="text-sm text-red-400">{error}</p>
            <Link to="/shop" className="text-sm text-[var(--color-primary)]">
              Back to shop
            </Link>
          </div>
        ) : !product ? null : (
          <div className="space-y-4">
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0e1821]">
              {current ? (
                <img
                  src={current}
                  alt={product.name}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center text-sm text-white/30">
                  No image
                </div>
              )}
            </section>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, index) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSlide(index)}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border ${
                      index === slide
                        ? "border-[var(--color-primary)]"
                        : "border-white/15"
                    }`}
                  >
                    <img
                      src={mediaUrl(img.url)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                {product.category?.name && (
                  <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-white/50">
                    {product.category.name}
                  </span>
                )}
                {product.brand?.name && (
                  <span className="rounded-full border border-[var(--color-primary)]/35 px-2.5 py-0.5 text-[10px] text-[var(--color-primary)]">
                    {product.brand.name}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-white">{product.name}</h1>
              {product.shortDescription && (
                <p className="mt-2 text-sm text-white/55">
                  {product.shortDescription}
                </p>
              )}
              <p className="mt-3 text-xl font-bold text-[var(--color-primary)]">
                {formatPrice(product.price, product.currency)}
              </p>
              {product.status === "OUT_OF_STOCK" && (
                <p className="mt-1 text-xs font-medium text-red-400">
                  Out of stock
                </p>
              )}
              {product.status === "ACTIVE" && (
                <button
                  type="button"
                  onClick={() => {
                    addItem(product);
                    setAdded(true);
                    setTimeout(() => setAdded(false), 1500);
                  }}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] py-3 text-sm font-bold text-[var(--color-background)]"
                >
                  <FaPlus className="h-3.5 w-3.5" />
                  {added ? "Added to cart" : "Add to cart"}
                </button>
              )}
            </div>

            {product.description && (
              <section className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-white/40">
                  Description
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                  {product.description}
                </p>
              </section>
            )}

            <dl className="rounded-2xl border border-white/10 bg-[var(--color-surface)] px-4">
              <DetailRow
                label="Sold by"
                value={product.paddleOwner?.organizationName}
              />
              <DetailRow label="Location" value={product.paddleOwner?.location} />
              <DetailRow label="SKU" value={product.sku} />
              <DetailRow
                label="Weight"
                value={product.weight != null ? String(product.weight) : null}
              />
              <DetailRow
                label="Dimensions"
                value={
                  product.length != null ||
                  product.width != null ||
                  product.height != null
                    ? `${product.length ?? "—"} × ${product.width ?? "—"} × ${product.height ?? "—"}`
                    : null
                }
              />
            </dl>
          </div>
        )}
      </main>

      <BottomNav
        onChange={(navId) => {
          if (navId === "home") navigate("/");
          else if (navId === "profile") navigate("/profile");
          else navigate(`/${navId}`);
        }}
      />
    </div>
  );
}
