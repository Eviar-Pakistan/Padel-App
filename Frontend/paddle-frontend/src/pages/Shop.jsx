import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaTag,
  FaTimes,
  FaTrademark,
  FaPlus,
  FaStore,
} from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import { getShopProducts } from "../api/shop";
import { useCart } from "../context/CartContext";
import shopBanner from "../assets/images/paddle_banner_shop.png";

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

function highlightMatch(text, term) {
  if (!term.trim()) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(term.trim().toLowerCase());
  if (idx < 0) return text;
  const end = idx + term.trim().length;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-[var(--color-primary)]/30 text-inherit">
        {text.slice(idx, end)}
      </mark>
      {text.slice(end)}
    </>
  );
}

export default function Shop() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTab, setSearchTab] = useState("owner");
  const [searchText, setSearchText] = useState("");
  const searchInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await getShopProducts();
        if (!cancelled) setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        const msg = err.response?.data?.message;
        if (!cancelled) {
          setError(
            Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load shop."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const owners = useMemo(() => {
    const map = new Map();
    for (const p of products) {
      const id = p.paddleOwnerId ?? p.paddleOwner?.id;
      if (id == null) continue;
      map.set(String(id), {
        id: String(id),
        name: p.paddleOwner?.organizationName || `Store #${id}`,
        location: p.paddleOwner?.location || "",
      });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const productsForOwner = useMemo(() => {
    if (!ownerId) return products;
    return products.filter(
      (p) => String(p.paddleOwnerId ?? p.paddleOwner?.id) === String(ownerId)
    );
  }, [products, ownerId]);

  const categories = useMemo(() => {
    const map = new Map();
    for (const p of productsForOwner) {
      if (p.category?.id) map.set(p.category.id, p.category.name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [productsForOwner]);

  const brands = useMemo(() => {
    const map = new Map();
    for (const p of productsForOwner) {
      if (p.brand?.id) map.set(p.brand.id, p.brand.name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [productsForOwner]);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedBrand = brands.find((b) => b.id === brandId);
  const selectedOwner = owners.find((o) => o.id === String(ownerId));

  const filteredCategories = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(term));
  }, [categories, searchText]);

  const filteredBrands = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(term));
  }, [brands, searchText]);

  const filteredOwners = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return owners;
    return owners.filter(
      (o) =>
        o.name.toLowerCase().includes(term) ||
        o.location.toLowerCase().includes(term)
    );
  }, [owners, searchText]);

  const visibleProducts = useMemo(() => {
    return productsForOwner.filter((p) => {
      if (categoryId && p.categoryId !== categoryId && p.category?.id !== categoryId)
        return false;
      if (brandId && p.brandId !== brandId && p.brand?.id !== brandId)
        return false;
      return true;
    });
  }, [productsForOwner, categoryId, brandId]);

  const openSearch = (tab = "owner") => {
    setSearchTab(tab);
    setSearchText("");
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchText("");
  };

  const clearFilters = () => {
    setCategoryId("");
    setBrandId("");
    setOwnerId("");
  };

  const selectCategory = (id) => {
    setCategoryId(id);
    closeSearch();
  };

  const selectBrand = (id) => {
    setBrandId(id);
    closeSearch();
  };

  const selectOwner = (id) => {
    setOwnerId(id);
    // Drop category/brand if they don't belong to the newly selected owner
    setCategoryId("");
    setBrandId("");
    closeSearch();
  };

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />

      <main className="mx-auto w-full max-w-md px-0 pb-28 pt-16">
        <div className="sticky top-16 z-40 border-b border-white/10 bg-[var(--color-background)] px-4 py-3">
          <h1 className="mb-3 text-lg font-bold text-white">Shop</h1>

          <button
            type="button"
            onClick={() =>
              openSearch(
                ownerId
                  ? "owner"
                  : brandId && !categoryId
                    ? "brand"
                    : categoryId
                      ? "category"
                      : "owner"
              )
            }
            className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-left"
          >
            <FaSearch className="h-3.5 w-3.5 shrink-0 text-white/40" />
            <span className="min-w-0 flex-1 truncate text-sm text-white/45">
              Search by store, brand, or category...
            </span>
          </button>

          {(categoryId || brandId || ownerId) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {selectedOwner && (
                <button
                  type="button"
                  onClick={() => openSearch("owner")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-2.5 py-1 text-xs text-[var(--color-primary)]"
                >
                  <FaStore className="h-2.5 w-2.5" />
                  {selectedOwner.name}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOwnerId("");
                      setCategoryId("");
                      setBrandId("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        setOwnerId("");
                        setCategoryId("");
                        setBrandId("");
                      }
                    }}
                    className="ml-0.5 rounded-full px-0.5 hover:bg-white/10"
                  >
                    ×
                  </span>
                </button>
              )}
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => openSearch("category")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-2.5 py-1 text-xs text-[var(--color-primary)]"
                >
                  <FaTag className="h-2.5 w-2.5" />
                  {selectedCategory.name}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCategoryId("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        setCategoryId("");
                      }
                    }}
                    className="ml-0.5 rounded-full px-0.5 hover:bg-white/10"
                  >
                    ×
                  </span>
                </button>
              )}
              {selectedBrand && (
                <button
                  type="button"
                  onClick={() => openSearch("brand")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-2.5 py-1 text-xs text-[var(--color-primary)]"
                >
                  <FaTrademark className="h-2.5 w-2.5" />
                  {selectedBrand.name}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setBrandId("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        setBrandId("");
                      }
                    }}
                    className="ml-0.5 rounded-full px-0.5 hover:bg-white/10"
                  >
                    ×
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-white/40 hover:text-white/70"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {searchOpen && (
          <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-[2px]">
            <div className="mx-auto flex h-full w-full max-w-md flex-col bg-[var(--color-background)] pt-4">
              <div className="px-4">
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#152230] px-3 py-2.5 shadow-lg">
                  <FaSearch className="h-4 w-4 shrink-0 text-white/40" />
                  <input
                    ref={searchInputRef}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder={
                      searchTab === "owner"
                        ? "Search stores..."
                        : searchTab === "brand"
                          ? "Search brands..."
                          : "Search categories..."
                    }
                    className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                  />
                  <button
                    type="button"
                    onClick={searchText ? () => setSearchText("") : closeSearch}
                    className="rounded-full p-1 text-white/50 hover:bg-white/10"
                    aria-label={searchText ? "Clear search" : "Close search"}
                  >
                    <FaTimes className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { id: "owner", label: "Store" },
                    { id: "category", label: "Category" },
                    { id: "brand", label: "Brand" },
                  ].map((tab) => {
                    const active = searchTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setSearchTab(tab.id);
                          setSearchText("");
                          searchInputRef.current?.focus();
                        }}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                          active
                            ? "bg-[var(--color-primary)] text-[var(--color-background)]"
                            : "bg-white/10 text-white/80 hover:bg-white/15"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 flex-1 overflow-y-auto px-4 pb-8">
                {searchTab === "owner" ? (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                      Paddle owners / stores
                    </p>
                    <button
                      type="button"
                      onClick={() => selectOwner("")}
                      className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/5 ${
                        !ownerId ? "bg-white/5" : ""
                      }`}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/60">
                        <FaStore className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          All stores
                        </p>
                        <p className="text-xs text-white/40">
                          Clear store filter
                        </p>
                      </div>
                    </button>
                    {filteredOwners.length === 0 ? (
                      <p className="px-3 py-6 text-sm text-white/40">
                        {owners.length === 0
                          ? "No stores yet."
                          : "No stores match your search."}
                      </p>
                    ) : (
                      filteredOwners.map((owner) => (
                        <button
                          key={owner.id}
                          type="button"
                          onClick={() => selectOwner(owner.id)}
                          className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/5 ${
                            String(ownerId) === owner.id
                              ? "bg-[var(--color-primary)]/10"
                              : ""
                          }`}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
                            <FaStore className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {highlightMatch(owner.name, searchText)}
                            </p>
                            <p className="truncate text-xs text-white/40">
                              {owner.location || "Tap to filter products"}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                ) : searchTab === "category" ? (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                      Categories
                      {selectedOwner ? ` · ${selectedOwner.name}` : ""}
                    </p>
                    <button
                      type="button"
                      onClick={() => selectCategory("")}
                      className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/5 ${
                        !categoryId ? "bg-white/5" : ""
                      }`}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/60">
                        <FaTag className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          All categories
                        </p>
                        <p className="text-xs text-white/40">
                          Clear category filter
                        </p>
                      </div>
                    </button>
                    {filteredCategories.length === 0 ? (
                      <p className="px-3 py-6 text-sm text-white/40">
                        {categories.length === 0
                          ? "No categories yet."
                          : "No categories match your search."}
                      </p>
                    ) : (
                      filteredCategories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => selectCategory(cat.id)}
                          className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/5 ${
                            categoryId === cat.id
                              ? "bg-[var(--color-primary)]/10"
                              : ""
                          }`}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
                            <FaTag className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {highlightMatch(cat.name, searchText)}
                            </p>
                            <p className="text-xs text-white/40">
                              Tap to filter products
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                      Brands
                      {selectedOwner ? ` · ${selectedOwner.name}` : ""}
                    </p>
                    <button
                      type="button"
                      onClick={() => selectBrand("")}
                      className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/5 ${
                        !brandId ? "bg-white/5" : ""
                      }`}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/60">
                        <FaTrademark className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          All brands
                        </p>
                        <p className="text-xs text-white/40">Clear brand filter</p>
                      </div>
                    </button>
                    {filteredBrands.length === 0 ? (
                      <p className="px-3 py-6 text-sm text-white/40">
                        {brands.length === 0
                          ? "No brands yet."
                          : "No brands match your search."}
                      </p>
                    ) : (
                      filteredBrands.map((brand) => (
                        <button
                          key={brand.id}
                          type="button"
                          onClick={() => selectBrand(brand.id)}
                          className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/5 ${
                            brandId === brand.id
                              ? "bg-[var(--color-primary)]/10"
                              : ""
                          }`}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
                            <FaTrademark className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {highlightMatch(brand.name, searchText)}
                            </p>
                            <p className="text-xs text-white/40">
                              Tap to filter products
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="px-4 pt-4">
          <section className="overflow-hidden">
            <img
              src={shopBanner}
              alt="Shop paddles and gear"
              className="h-auto w-full object-cover"
            />
          </section>

          {loading ? (
            <p className="mt-6 text-sm text-[var(--color-muted)]">
              Loading products...
            </p>
          ) : error ? (
            <p className="mt-6 text-sm text-red-400">{error}</p>
          ) : visibleProducts.length === 0 ? (
            <p className="mt-6 text-sm text-white/40">
              No products match your filters.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 items-stretch gap-2.5">
              {visibleProducts.map((product) => {
                const image = mediaUrl(product.images?.[0]?.url);
                return (
                  <div
                    key={product.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/shop/${product.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") navigate(`/shop/${product.id}`);
                    }}
                    className="relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/10 bg-[var(--color-surface)] text-left transition hover:border-white/20"
                  >
                    <div className="aspect-square w-full shrink-0 bg-[#0e1821]">
                      {image ? (
                        <img
                          src={image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-white/25">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="flex h-[98px] shrink-0 flex-col px-2.5 py-2 pr-9">
                      <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-white">
                        {product.name}
                      </p>
                      <p className="mt-1 line-clamp-2 flex-1 text-[10px] leading-snug text-white/45">
                        {product.shortDescription || "\u00A0"}
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-[var(--color-primary)]">
                        {formatPrice(product.price, product.currency)}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Add ${product.name} to cart`}
                      onClick={(e) => {
                        e.stopPropagation();
                        addItem(product);
                      }}
                      className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-secondary)] text-white shadow-lg hover:brightness-110"
                    >
                      <FaPlus className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
