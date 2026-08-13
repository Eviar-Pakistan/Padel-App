import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createProduct,
  createProductBrand,
  createProductCategory,
  deleteProduct,
  deleteProductBrand,
  deleteProductCategory,
  getMyProducts,
  getProductBrands,
  getProductCategories,
  updateProduct,
} from "../../api/owner";
import CustomSelect from "../../components/CustomSelect";

const MAX_IMAGES = 8;

const PRODUCT_STATUSES = [
  { value: "DRAFT", label: "DRAFT" },
  { value: "ACTIVE", label: "ACTIVE" },
  { value: "INACTIVE", label: "INACTIVE" },
  { value: "OUT_OF_STOCK", label: "OUT OF STOCK" },
];

const emptyForm = {
  name: "",
  shortDescription: "",
  description: "",
  categoryId: "",
  brandId: "",
  price: "",
  stock: "0",
  sku: "",
  status: "ACTIVE",
  weight: "",
  length: "",
  width: "",
  height: "",
};

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

export default function OwnerProductsPanel({ initialEditId = null }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const fileRef = useRef(null);
  const formRef = useRef(null);
  const nameInputRef = useRef(null);
  const editAppliedRef = useRef(false);

  const previews = useMemo(
    () => newFiles.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [newFiles]
  );

  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
  }, [previews]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [productsRes, categoriesRes, brandsRes] = await Promise.all([
        getMyProducts(),
        getProductCategories(),
        getProductBrands(),
      ]);
      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
      setBrands(brandsRes.data || []);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load products."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    editAppliedRef.current = false;
  }, [initialEditId]);

  useEffect(() => {
    if (!initialEditId || loading || products.length === 0 || editAppliedRef.current) {
      return;
    }
    const product = products.find((p) => p.id === initialEditId);
    if (product) {
      editAppliedRef.current = true;
      startEdit(product);
    }
  }, [initialEditId, loading, products]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setExistingImages([]);
    setNewFiles([]);
    setShowMore(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name || "",
      shortDescription: product.shortDescription || "",
      description: product.description || "",
      categoryId: product.categoryId || "",
      brandId: product.brandId || "",
      price: String(product.price ?? ""),
      stock: String(product.stock ?? 0),
      sku: product.sku || "",
      status: product.status || "ACTIVE",
      weight: product.weight != null ? String(product.weight) : "",
      length: product.length != null ? String(product.length) : "",
      width: product.width != null ? String(product.width) : "",
      height: product.height != null ? String(product.height) : "",
    });
    setExistingImages(product.images || []);
    setNewFiles([]);
    setMessage("");
    setError("");
    setShowMore(true);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => nameInputRef.current?.focus({ preventScroll: true }), 350);
    });
  };

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []).filter((f) =>
      f.type.startsWith("image/")
    );
    setNewFiles((prev) => {
      const room = MAX_IMAGES - existingImages.length - prev.length;
      if (room <= 0) return prev;
      return [...prev, ...incoming.slice(0, room)];
    });
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    try {
      const { data } = await createProductCategory({
        name: categoryName.trim(),
      });
      setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((f) => ({ ...f, categoryId: data.id }));
      setCategoryName("");
      setMessage("Category created.");
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Category failed.");
    }
  };

  const handleCreateBrand = async (e) => {
    e.preventDefault();
    if (!brandName.trim()) return;
    try {
      const { data } = await createProductBrand({ name: brandName.trim() });
      setBrands((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((f) => ({ ...f, brandId: data.id }));
      setBrandName("");
      setMessage("Brand created.");
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Brand failed.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.categoryId) {
      setError("Select or create a category first.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("categoryId", form.categoryId);
      if (form.brandId) fd.append("brandId", form.brandId);
      fd.append("price", String(Number(form.price)));
      fd.append("stock", String(Number(form.stock || 0)));
      fd.append("status", form.status);
      if (form.shortDescription.trim()) {
        fd.append("shortDescription", form.shortDescription.trim());
      }
      if (form.description.trim()) {
        fd.append("description", form.description.trim());
      }
      if (form.sku.trim()) fd.append("sku", form.sku.trim());
      if (form.weight !== "") fd.append("weight", String(Number(form.weight)));
      if (form.length !== "") fd.append("length", String(Number(form.length)));
      if (form.width !== "") fd.append("width", String(Number(form.width)));
      if (form.height !== "") fd.append("height", String(Number(form.height)));

      if (editingId) {
        fd.append(
          "existingImageIds",
          JSON.stringify(existingImages.map((img) => img.id))
        );
      }
      newFiles.forEach((file) => fd.append("images", file));

      if (editingId) {
        await updateProduct(editingId, fd);
        setMessage("Product updated.");
      } else {
        await createProduct(fd);
        setMessage("Product created.");
      }
      resetForm();
      await load();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await deleteProduct(id);
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Delete failed.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white md:text-2xl">Products</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Manage categories, brands, and shop inventory with multi-image uploads
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form
          onSubmit={handleCreateCategory}
          className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4"
        >
          <p className="mb-3 text-sm font-semibold text-white">Categories</p>
          <div className="flex gap-2">
            <input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="New category name"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-[var(--color-secondary)] px-4 text-sm font-bold text-white"
            >
              Add
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0e1821] px-2.5 py-1 text-xs text-white/80"
              >
                {c.name}
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm(`Delete category "${c.name}"?`)) return;
                    try {
                      await deleteProductCategory(c.id);
                      setCategories((prev) => prev.filter((x) => x.id !== c.id));
                      if (form.categoryId === c.id) {
                        setForm((f) => ({ ...f, categoryId: "" }));
                      }
                    } catch (err) {
                      const msg = err.response?.data?.message;
                      setError(
                        Array.isArray(msg)
                          ? msg.join(", ")
                          : msg || "Could not delete category."
                      );
                    }
                  }}
                  className="text-white/35 hover:text-red-300"
                >
                  ×
                </button>
              </span>
            ))}
            {categories.length === 0 && (
              <p className="text-xs text-white/40">No categories yet.</p>
            )}
          </div>
        </form>

        <form
          onSubmit={handleCreateBrand}
          className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4"
        >
          <p className="mb-3 text-sm font-semibold text-white">Brands</p>
          <div className="flex gap-2">
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="New brand name"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-[var(--color-secondary)] px-4 text-sm font-bold text-white"
            >
              Add
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {brands.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0e1821] px-2.5 py-1 text-xs text-white/80"
              >
                {b.name}
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm(`Delete brand "${b.name}"?`)) return;
                    try {
                      await deleteProductBrand(b.id);
                      setBrands((prev) => prev.filter((x) => x.id !== b.id));
                      if (form.brandId === b.id) {
                        setForm((f) => ({ ...f, brandId: "" }));
                      }
                    } catch (err) {
                      const msg = err.response?.data?.message;
                      setError(
                        Array.isArray(msg)
                          ? msg.join(", ")
                          : msg || "Could not delete brand."
                      );
                    }
                  }}
                  className="text-white/35 hover:text-red-300"
                >
                  ×
                </button>
              </span>
            ))}
            {brands.length === 0 && (
              <p className="text-xs text-white/40">No brands yet.</p>
            )}
          </div>
        </form>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="scroll-mt-4 space-y-4 rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4 md:p-5"
      >
        <p className="text-sm font-semibold text-white">
          {editingId ? "Edit product" : "Create product"}
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            ref={nameInputRef}
            className="w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3 text-sm text-white outline-none md:col-span-2"
            placeholder="Product name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <CustomSelect
            value={form.categoryId}
            onChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
            placeholder="Select category *"
            searchable
            searchPlaceholder="Search category..."
            options={categories.map((c) => ({
              value: String(c.id),
              label: c.name,
            }))}
          />
          <CustomSelect
            value={form.brandId}
            onChange={(v) => setForm((f) => ({ ...f, brandId: v }))}
            placeholder="Brand (optional)"
            searchable
            searchPlaceholder="Search brand..."
            options={brands.map((b) => ({
              value: String(b.id),
              label: b.name,
            }))}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="Price (PKR)"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3 text-sm text-white outline-none"
          />
          <input
            type="number"
            min="0"
            required
            placeholder="Stock"
            value={form.stock}
            onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3 text-sm text-white outline-none"
          />
          <CustomSelect
            value={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            placeholder="Status"
            allowEmpty={false}
            options={PRODUCT_STATUSES}
          />
          <input
            placeholder="Short description"
            value={form.shortDescription}
            onChange={(e) =>
              setForm((f) => ({ ...f, shortDescription: e.target.value }))
            }
            className="w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3 text-sm text-white outline-none md:col-span-2"
          />
          <textarea
            placeholder="Full description"
            rows={3}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className="w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3 text-sm text-white outline-none md:col-span-2"
          />
        </div>

        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-white/50">
            Product images
          </p>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 transition ${
              dragOver
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                : "border-white/15 bg-[#0e1821]/60 hover:border-white/25"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <p className="text-sm font-semibold text-white">
              Click to upload or drag and drop
            </p>
            <p className="mt-1 text-xs text-white/45">
              PNG, JPG, WebP · up to {MAX_IMAGES} images
            </p>
          </label>

          {(existingImages.length > 0 || previews.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {existingImages.map((img) => (
                <div
                  key={img.id}
                  className="group relative h-20 w-20 overflow-hidden rounded-xl border border-white/10"
                >
                  <img
                    src={mediaUrl(img.url)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setExistingImages((imgs) =>
                        imgs.filter((x) => x.id !== img.id)
                      )
                    }
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              ))}
              {previews.map((p, i) => (
                <div
                  key={p.url}
                  className="group relative h-20 w-20 overflow-hidden rounded-xl border border-[var(--color-primary)]/40"
                >
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() =>
                      setNewFiles((files) => files.filter((_, idx) => idx !== i))
                    }
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="text-xs font-medium text-[var(--color-primary)]"
        >
          {showMore ? "Hide extra fields" : "Show SKU & dimensions"}
        </button>

        {showMore && (
          <div className="grid gap-3 md:grid-cols-2">
            <input
              placeholder="SKU"
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              className="rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3 text-sm text-white outline-none"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Weight"
              value={form.weight}
              onChange={(e) =>
                setForm((f) => ({ ...f, weight: e.target.value }))
              }
              className="rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3 text-sm text-white outline-none"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Length"
              value={form.length}
              onChange={(e) =>
                setForm((f) => ({ ...f, length: e.target.value }))
              }
              className="rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3 text-sm text-white outline-none"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Width"
              value={form.width}
              onChange={(e) => setForm((f) => ({ ...f, width: e.target.value }))}
              className="rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3 text-sm text-white outline-none"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Height"
              value={form.height}
              onChange={(e) =>
                setForm((f) => ({ ...f, height: e.target.value }))
              }
              className="rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3 text-sm text-white outline-none"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-emerald-400">{message}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[var(--color-secondary)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : editingId
                ? "Update product"
                : "Create product"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-white"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading products...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No products yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const cover = mediaUrl(product.images?.[0]?.url);
            return (
              <article
                key={product.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--color-surface)] "
              >
                {cover ? (
                  <img
                    src={cover}
                    alt={product.name}
                    className="h-[400px] w-full bg-white object-contain"
                  />
                ) : (
                  <div className="flex h-28 items-center justify-center bg-[#0e1821] text-xs text-white/30">
                    No image
                  </div>
                )}
                <div className="space-y-2 p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {product.category?.name && (
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase text-white/50">
                        {product.category.name}
                      </span>
                    )}
                    {product.brand?.name && (
                      <span className="rounded-full border border-[var(--color-primary)]/30 px-2 py-0.5 text-[10px] text-[var(--color-primary)]">
                        {product.brand.name}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-white">{product.name}</p>
                  <p className="text-sm text-[var(--color-muted)]">
                    PKR {String(product.price)} · Stock {product.stock} ·{" "}
                    {product.status}
                  </p>
                  {product.images?.length > 1 && (
                    <p className="text-xs text-white/40">
                      {product.images.length} images
                    </p>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => navigate(`/owner/products/${product.id}`)}
                      className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white hover:bg-white/5"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(product)}
                      className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(product.id)}
                      className="rounded-lg bg-red-500/15 px-3 py-2 text-xs font-medium text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
