import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaTrash } from "react-icons/fa";
import { deleteProduct, getProduct } from "../../api/owner";

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

function DetailRow({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 border-b border-white/5 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-white/40">
        {label}
      </dt>
      <dd className="text-sm text-white/90 sm:text-right">{value}</dd>
    </div>
  );
}

export default function OwnerProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [slide, setSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await getProduct(id);
        if (!cancelled) {
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

  const handleDelete = async () => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await deleteProduct(id);
      navigate("/owner/dashboard?tab=products");
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Delete failed.");
    }
  };

  const images = product?.images || [];
  const current = mediaUrl(images[slide]?.url);

  return (
    <div className="min-h-dvh bg-[var(--color-background)] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b1219]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/owner/dashboard?tab=products"
            className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/80 hover:bg-white/5"
          >
            <FaArrowLeft className="h-3.5 w-3.5" />
            Products
          </Link>
          <p className="truncate text-sm font-semibold">Product details</p>
          <div className="w-20" aria-hidden />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 md:py-8">
        {loading ? (
          <p className="text-sm text-[var(--color-muted)]">Loading product...</p>
        ) : error && !product ? (
          <div className="space-y-3">
            <p className="text-sm text-red-400">{error}</p>
            <Link
              to="/owner/dashboard?tab=products"
              className="inline-block text-sm text-[var(--color-primary)]"
            >
              Back to products
            </Link>
          </div>
        ) : !product ? null : (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-3">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white">
                {current ? (
                  <img
                    src={current}
                    alt={product.name}
                    className="h-[420px] w-full object-contain md:h-[520px]"
                  />
                ) : (
                  <div className="flex h-64 items-center justify-center bg-[#0e1821] text-sm text-white/30">
                    No image
                  </div>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, index) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setSlide(index)}
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-white ${
                        index === slide
                          ? "border-[var(--color-primary)]"
                          : "border-white/15"
                      }`}
                    >
                      <img
                        src={mediaUrl(img.url)}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-5">
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
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] uppercase text-white/70">
                    {product.status}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-white md:text-3xl">
                  {product.name}
                </h1>
                {product.shortDescription && (
                  <p className="mt-2 text-sm text-white/60">
                    {product.shortDescription}
                  </p>
                )}
                <p className="mt-4 text-2xl font-bold text-[var(--color-primary)]">
                  {String(product.price)}
                  <span className="ml-2 text-sm font-medium text-white/40">
                    {product.currency || "PKR"}
                  </span>
                </p>
              </div>

              <dl className="rounded-2xl border border-white/10 bg-[var(--color-surface)] px-4">
                <DetailRow label="Stock" value={String(product.stock)} />
                <DetailRow label="SKU" value={product.sku} />
                <DetailRow label="Slug" value={product.slug} />
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
                <DetailRow
                  label="Created"
                  value={
                    product.createdAt
                      ? new Date(product.createdAt).toLocaleString()
                      : null
                  }
                />
                <DetailRow
                  label="Updated"
                  value={
                    product.updatedAt
                      ? new Date(product.updatedAt).toLocaleString()
                      : null
                  }
                />
              </dl>

              {product.description && (
                <div className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/40">
                    Description
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/85">
                    {product.description}
                  </p>
                </div>
              )}

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/owner/dashboard?tab=products&edit=${product.id}`}
                  className="rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-[var(--color-background)]"
                >
                  Edit product
                </Link>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 rounded-full border border-red-400/30 px-5 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/10"
                >
                  <FaTrash className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
