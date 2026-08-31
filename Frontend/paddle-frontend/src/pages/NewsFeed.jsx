import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaBookmark,
  FaEllipsisH,
  FaPaperPlane,
  FaPlus,
  FaRegBookmark,
  FaRegHeart,
  FaHeart,
  FaSearch,
  FaTimes,
  FaMapMarkerAlt,
  FaTag,
  FaUser,
} from "react-icons/fa";
import { FiMessageCircle, FiShare2 } from "react-icons/fi";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import NewsCategoryPicker from "../components/NewsCategoryPicker";
import {
  addNewsComment,
  createNewsPost,
  deleteNewsComment,
  deleteNewsPost,
  getMyNews,
  getNewsComments,
  getNewsFeed,
  getNewsFilters,
  getNewsPost,
  likeNewsComment,
  likeNewsPost,
  saveNewsPost,
  shareNewsPost,
  unlikeNewsComment,
  unlikeNewsPost,
  unsaveNewsPost,
  updateNewsPost,
} from "../api/news";

const CATEGORIES = [
  "ANNOUNCEMENT",
  "TOURNAMENT",
  "EVENT",
  "COACHING",
  "MATCH",
  "TRAINING",
  "PRODUCT",
  "OFFER",
  "MEMBERSHIP",
  "COURT",
  "ACHIEVEMENT",
  "COMMUNITY",
  "RECRUITMENT",
  "NEWS",
  "MEDIA",
];

const MAX_IMAGES = 8;

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

const emptyForm = {
  description: "",
  category: "NEWS",
};

export default function NewsFeed() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusPostId = searchParams.get("post");
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [filters, setFilters] = useState({ categories: CATEGORIES, locations: [] });
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTab, setSearchTab] = useState("location"); // location | category
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [feedMode, setFeedMode] = useState("all"); // all | mine
  const [showComposer, setShowComposer] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [commentsPostId, setCommentsPostId] = useState(null);
  const searchInputRef = useRef(null);
  const focusHandledRef = useRef("");

  const loadFilters = async () => {
    try {
      const { data } = await getNewsFilters();
      setFilters({
        categories: data.categories?.length ? data.categories : CATEGORIES,
        locations: data.locations || [],
      });
    } catch {
      /* keep defaults */
    }
  };

  const loadFeed = useCallback(
    async ({ append = false, cursor = null } = {}) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError("");
      try {
        const { data } = await getNewsFeed({
          category: category || undefined,
          location: location || undefined,
          q: q.trim() || undefined,
          cursor: cursor || undefined,
          limit: 10,
        });
        const items = data.items || [];
        setPosts((prev) => (append ? [...prev, ...items] : items));
        setNextCursor(data.nextCursor || null);
      } catch (err) {
        const msg = err.response?.data?.message;
        setError(
          Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load feed."
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [category, location, q]
  );

  const loadMyPosts = useCallback(async () => {
    setLoading(true);
    setError("");
    setNextCursor(null);
    try {
      const { data } = await getMyNews();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load your posts."
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    if (feedMode === "mine") return;
    loadFeed();
  }, [feedMode, loadFeed]);

  useEffect(() => {
    if (feedMode !== "mine") return;
    loadMyPosts();
  }, [feedMode, loadMyPosts]);

  // Deep-link from notifications / shares: /news?post=<id>
  useEffect(() => {
    if (!focusPostId || loading) return;
    if (focusHandledRef.current === focusPostId) return;
    focusHandledRef.current = focusPostId;

    const openFocused = async () => {
      const inList = posts.some((p) => p.id === focusPostId);
      if (!inList) {
        try {
          const { data } = await getNewsPost(focusPostId);
          if (data?.id) {
            setPosts((prev) =>
              prev.some((p) => p.id === data.id) ? prev : [data, ...prev]
            );
          }
        } catch {
          /* post may be deleted */
        }
      }
      setCommentsPostId(focusPostId);
      const next = new URLSearchParams(searchParams);
      next.delete("post");
      setSearchParams(next, { replace: true });
    };
    openFocused();
  }, [focusPostId, loading, posts, searchParams, setSearchParams]);

  const patchPost = (updated) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
  };

  const toggleLike = async (post) => {
    try {
      const { data } = post.likedByMe
        ? await unlikeNewsPost(post.id)
        : await likeNewsPost(post.id);
      patchPost(data);
    } catch {
      /* ignore */
    }
  };

  const toggleSave = async (post) => {
    try {
      const { data } = post.savedByMe
        ? await unsaveNewsPost(post.id)
        : await saveNewsPost(post.id);
      patchPost(data);
    } catch {
      /* ignore */
    }
  };

  const handleShare = async (post) => {
    const url = `${window.location.origin}/news?post=${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.authorName,
          text: post.description,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
      }
      const { data } = await shareNewsPost(post.id);
      patchPost(data);
    } catch {
      /* user cancelled share */
    }
  };

  const handleDelete = async (post) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await deleteNewsPost(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Delete failed.");
    }
  };

  const openSearch = (tab = "location") => {
    setSearchTab(tab);
    setSearchText("");
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchText("");
  };

  const selectLocation = (loc) => {
    setLocation(loc);
    setQ("");
    closeSearch();
  };

  const selectCategory = (cat) => {
    setCategory(cat);
    setQ("");
    closeSearch();
  };

  const clearFilters = () => {
    setCategory("");
    setLocation("");
    setQ("");
  };

  const filteredLocations = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    const list = filters.locations || [];
    if (!term) return list;
    return list.filter((loc) => loc.toLowerCase().includes(term));
  }, [filters.locations, searchText]);

  const filteredCategories = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    const list = filters.categories || CATEGORIES;
    if (!term) return list;
    return list.filter((c) =>
      c.replace(/_/g, " ").toLowerCase().includes(term)
    );
  }, [filters.categories, searchText]);

  const highlightMatch = (text, term) => {
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
  };

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />

      <main className="mx-auto w-full max-w-md px-0 pb-28 pt-16">
        <div className="sticky top-16 z-40 border-b border-white/10 bg-[var(--color-background)] px-4 py-3">
          <div className="mb-3 flex items-center gap-2">
            {/* <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-lg p-2 text-white/80 hover:bg-white/5"
              aria-label="Back"
            >
              <FaArrowLeft className="h-4 w-4" />
            </button> */}
            <h1 className="flex-1 text-lg font-bold text-white">
              {feedMode === "mine" ? "My Posts" : "News Feed"}
            </h1>
            <button
              type="button"
              onClick={() =>
                setFeedMode((mode) => (mode === "mine" ? "all" : "mine"))
              }
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                feedMode === "mine"
                  ? "bg-[var(--color-primary)] text-[var(--color-background)]"
                  : "border border-white/15 bg-white/5 text-white"
              }`}
            >
              <FaUser className="h-3 w-3" />
              My Post
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingPost(null);
                setShowComposer(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-secondary)] px-3 py-1.5 text-xs font-bold text-white"
            >
              <FaPlus className="h-3 w-3" />
              Add Post
            </button>
          </div>

          <button
            type="button"
            onClick={() => openSearch(location ? "location" : category ? "category" : "location")}
            className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-left"
          >
            <FaSearch className="h-3.5 w-3.5 shrink-0 text-white/40" />
            <span className="min-w-0 flex-1 truncate text-sm text-white/45">
              Search by location or category...
            </span>
          </button>

          {(category || location) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {location && (
                <button
                  type="button"
                  onClick={() => openSearch("location")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-2.5 py-1 text-xs text-[var(--color-primary)]"
                >
                  <FaMapMarkerAlt className="h-2.5 w-2.5" />
                  {location}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        setLocation("");
                      }
                    }}
                    className="ml-0.5 rounded-full px-0.5 hover:bg-white/10"
                  >
                    ×
                  </span>
                </button>
              )}
              {category && (
                <button
                  type="button"
                  onClick={() => openSearch("category")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-2.5 py-1 text-xs text-[var(--color-primary)]"
                >
                  <FaTag className="h-2.5 w-2.5" />
                  {category.replace(/_/g, " ")}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCategory("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        setCategory("");
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
                      searchTab === "location"
                        ? "Search locations..."
                        : "Search categories..."
                    }
                    className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                  />
                  {searchText ? (
                    <button
                      type="button"
                      onClick={() => setSearchText("")}
                      className="rounded-full p-1 text-white/50 hover:bg-white/10"
                      aria-label="Clear search"
                    >
                      <FaTimes className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={closeSearch}
                      className="rounded-full p-1 text-white/50 hover:bg-white/10"
                      aria-label="Close search"
                    >
                      <FaTimes className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  {[
                    { id: "location", label: "Location" },
                    { id: "category", label: "Category" },
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
                {searchTab === "location" ? (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                      Locations
                    </p>
                    <button
                      type="button"
                      onClick={() => selectLocation("")}
                      className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/5 ${
                        !location ? "bg-white/5" : ""
                      }`}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/60">
                        <FaMapMarkerAlt className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">All locations</p>
                        <p className="text-xs text-white/40">Clear location filter</p>
                      </div>
                    </button>
                    {filteredLocations.length === 0 ? (
                      <p className="px-3 py-6 text-sm text-white/40">
                        {filters.locations.length === 0
                          ? "No locations yet. Locations appear after posts are created."
                          : "No locations match your search."}
                      </p>
                    ) : (
                      filteredLocations.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => selectLocation(loc)}
                          className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/5 ${
                            location === loc ? "bg-[var(--color-primary)]/10" : ""
                          }`}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
                            <FaMapMarkerAlt className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {highlightMatch(loc, searchText)}
                            </p>
                            <p className="text-xs text-white/40">Tap to filter feed</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                      Categories
                    </p>
                    <button
                      type="button"
                      onClick={() => selectCategory("")}
                      className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/5 ${
                        !category ? "bg-white/5" : ""
                      }`}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/60">
                        <FaTag className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">All categories</p>
                        <p className="text-xs text-white/40">Clear category filter</p>
                      </div>
                    </button>
                    {filteredCategories.length === 0 ? (
                      <p className="px-3 py-6 text-sm text-white/40">
                        No categories match your search.
                      </p>
                    ) : (
                      filteredCategories.map((cat) => {
                        const label = cat.replace(/_/g, " ");
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => selectCategory(cat)}
                            className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/5 ${
                              category === cat ? "bg-[var(--color-primary)]/10" : ""
                            }`}
                          >
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
                              <FaTag className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {highlightMatch(label, searchText)}
                              </p>
                              <p className="text-xs text-white/40">Tap to filter feed</p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="px-4 pt-3 text-sm text-red-400">{error}</p>
        )}

        {loading ? (
          <p className="px-4 py-8 text-sm text-[var(--color-muted)]">
            {feedMode === "mine" ? "Loading your posts..." : "Loading feed..."}
          </p>
        ) : posts.length === 0 ? (
          <p className="px-4 py-8 text-sm text-[var(--color-muted)]">
            {feedMode === "mine"
              ? "You have not posted anything yet. Tap Add Post to share something."
              : "No posts yet. Be the first to share something."}
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLike={() => toggleLike(post)}
                onSave={() => toggleSave(post)}
                onShare={() => handleShare(post)}
                onComment={() => setCommentsPostId(post.id)}
                onEdit={() => {
                  setEditingPost(post);
                  setShowComposer(true);
                }}
                onDelete={() => handleDelete(post)}
              />
            ))}
          </div>
        )}

        {feedMode === "all" && nextCursor && (
          <div className="px-4 py-4">
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => loadFeed({ append: true, cursor: nextCursor })}
              className="w-full rounded-xl border border-white/15 py-2.5 text-sm text-white disabled:opacity-60"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </main>

      <BottomNav
        onChange={(id) => {
          if (id === "home") navigate("/");
          else navigate(`/${id}`);
        }}
      />

      {showComposer && (
        <PostComposer
          post={editingPost}
          categories={filters.categories}
          onClose={() => {
            setShowComposer(false);
            setEditingPost(null);
          }}
          onSaved={(saved) => {
            if (editingPost) {
              patchPost(saved);
            } else {
              setPosts((prev) => [saved, ...prev]);
            }
            setShowComposer(false);
            setEditingPost(null);
            loadFilters();
          }}
        />
      )}

      {commentsPostId && (
        <CommentsSheet
          postId={commentsPostId}
          onClose={() => setCommentsPostId(null)}
          onCountChange={(delta) => {
            setPosts((prev) =>
              prev.map((p) =>
                p.id === commentsPostId
                  ? { ...p, commentCount: Math.max(0, p.commentCount + delta) }
                  : p
              )
            );
          }}
        />
      )}
    </div>
  );
}

function PostCard({ post, onLike, onSave, onShare, onComment, onEdit, onDelete }) {
  const images = Array.isArray(post.images) ? post.images : [];
  const [slide, setSlide] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const description = post.description || "";
  const descWords = description.trim().split(/\s+/).filter(Boolean);
  const needsMore = descWords.length > 5;
  const visibleDescription =
    !needsMore || descExpanded
      ? description
      : `${descWords.slice(0, 5).join(" ")}...`;

  return (
    <article className="bg-[var(--color-background)]">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-primary)]/20 text-sm font-bold text-[var(--color-primary)]">
          {mediaUrl(post.authorProfileImage) ? (
            <img
              src={mediaUrl(post.authorProfileImage)}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            (post.authorName || "?").charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{post.authorName}</p>
          <p className="truncate text-xs text-white/45">
            {post.location} · {timeAgo(post.createdAt)}
          </p>
        </div>
        <span className="rounded-full   bg-[var(--color-primary)]/10 px-2  text-center font-mono text-[12px] uppercase tracking-wide text-[var(--color-primary)]">
          {String(post.category).replace(/_/g, " ")}
        </span>
        {post.isMine && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg p-2 text-white/60 hover:bg-white/5"
            >
              <FaEllipsisH className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-20 w-28 overflow-hidden rounded-xl border border-white/10 bg-[#152230] shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-white/5"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-red-300 hover:bg-white/5"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {images.length > 0 && (
        <div className="relative aspect-square w-full bg-[#0e1821]">
          <img
            src={mediaUrl(images[slide])}
            alt=""
            className="h-full w-full object-cover"
          />
          {images.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-2 py-1 text-white"
                onClick={() => setSlide((s) => (s === 0 ? images.length - 1 : s - 1))}
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-2 py-1 text-white"
                onClick={() => setSlide((s) => (s + 1) % images.length)}
              >
                ›
              </button>
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${
                      i === slide ? "bg-[var(--color-primary)]" : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onLike}
            className="inline-flex items-center gap-1.5 text-white"
            aria-label="Like"
          >
            {post.likedByMe ? (
              <FaHeart className="h-6 w-6 text-[var(--color-primary)]" />
            ) : (
              <FaRegHeart className="h-6 w-6" />
            )}
            <span className="text-sm text-white/70">{post.likeCount || 0}</span>
          </button>
          <span className="h-4 w-px bg-white/15" aria-hidden />
          <button
            type="button"
            onClick={onComment}
            className="inline-flex items-center gap-1.5 text-white"
            aria-label="Comment"
          >
            <FiMessageCircle className="h-6 w-6" strokeWidth={2} />
            <span className="text-sm text-white/70">{post.commentCount || 0}</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button type="button" onClick={onShare} className="text-white" aria-label="Share">
            <FiShare2 className="h-6 w-6" strokeWidth={2} />
          </button>
          {/* <button type="button" onClick={onSave} className="text-white" aria-label="Save">
            {post.savedByMe ? (
              <FaBookmark className="h-5 w-5 text-[var(--color-primary)]" />
            ) : (
              <FaRegBookmark className="h-5 w-5" />
            )}
          </button> */}
        </div>
      </div>

      <div className="space-y-1 px-4 pb-4">
        <p className="text-sm text-white/90">
          <span className="font-semibold">{post.authorName}</span>{" "}
          {visibleDescription}
          {needsMore && (
            <>
              {" "}
              <button
                type="button"
                onClick={() => setDescExpanded((v) => !v)}
                className="text-xs font-medium text-white/45 hover:text-white/70"
              >
                {descExpanded ? "view less" : "view more"}
              </button>
            </>
          )}
        </p>
        {post.commentCount > 0 && (
          <button
            type="button"
            onClick={onComment}
            className="text-sm text-white/45"
          >
            View all {post.commentCount} comment{post.commentCount === 1 ? "" : "s"}
          </button>
        )}
        <p className="text-[11px] uppercase tracking-wide text-white/30">
          {post.shareCount} shares · {post.saveCount} saves
        </p>
      </div>
    </article>
  );
}

function PostComposer({ post, categories, onClose, onSaved }) {
  const [form, setForm] = useState({
    ...emptyForm,
    description: post?.description || "",
    category: post?.category || "NEWS",
  });
  const [existingImages, setExistingImages] = useState(
    Array.isArray(post?.images) ? post.images : []
  );
  const [newFiles, setNewFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const previews = useMemo(
    () => newFiles.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [newFiles]
  );

  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
  }, [previews]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("description", form.description.trim());
      fd.append("category", form.category);
      if (post) fd.append("existingImages", JSON.stringify(existingImages));
      newFiles.forEach((f) => fd.append("images", f));

      const { data } = post
        ? await updateNewsPost(post.id, fd)
        : await createNewsPost(fd);
      onSaved(data);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center">
      <form
        onSubmit={submit}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-[var(--color-surface)] p-4 sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">
            {post ? "Edit post" : "New post"}
          </h2>
          <button type="button" onClick={onClose} className="p-2 text-white/60">
            <FaTimes />
          </button>
        </div>

        <textarea
          required
          rows={4}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="What's happening?"
          className="mb-4 w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3 text-sm text-white outline-none"
        />

        <div className="mb-4">
          <NewsCategoryPicker
            categories={categories}
            value={form.category}
            onChange={(category) => setForm((f) => ({ ...f, category }))}
          />
          <p className="mt-2 text-[11px] text-white/35">
            Location is taken from your profile automatically.
          </p>
        </div>

        <label className="mb-3 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-white/15 px-3 py-6 text-center">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const incoming = Array.from(e.target.files || []);
              setNewFiles((prev) => {
                const room = MAX_IMAGES - existingImages.length - prev.length;
                return [...prev, ...incoming.slice(0, Math.max(0, room))];
              });
              e.target.value = "";
            }}
          />
          <p className="text-sm font-semibold text-white">Add images</p>
          <p className="mt-1 text-xs text-white/40">Up to {MAX_IMAGES} photos</p>
        </label>

        {(existingImages.length > 0 || previews.length > 0) && (
          <div className="mb-3 flex flex-wrap gap-2">
            {existingImages.map((url) => (
              <div key={url} className="relative h-16 w-16 overflow-hidden rounded-lg">
                <img src={mediaUrl(url)} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setExistingImages((imgs) => imgs.filter((u) => u !== url))}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/70 px-1 text-xs text-white"
                >
                  ×
                </button>
              </div>
            ))}
            {previews.map((p, i) => (
              <div key={p.url} className="relative h-16 w-16 overflow-hidden rounded-lg">
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setNewFiles((files) => files.filter((_, idx) => idx !== i))}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/70 px-1 text-xs text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-[var(--color-secondary)] py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? "Posting..." : post ? "Update" : "Post"}
        </button>
      </form>
    </div>
  );
}

function CommentsSheet({ postId, onClose, onCountChange }) {
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getNewsComments(postId);
      setComments(data || []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [postId]);

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      const { data } = await addNewsComment(postId, {
        body: body.trim(),
        parentId: replyTo || undefined,
      });
      onCountChange(1);
      setBody("");
      setReplyTo(null);
      if (replyTo) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyTo
              ? { ...c, replies: [...(c.replies || []), { ...data, replies: undefined }] }
              : c
          )
        );
      } else {
        setComments((prev) => [...prev, { ...data, replies: [] }]);
      }
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  };

  const toggleCommentLike = async (comment) => {
    try {
      if (comment.likedByMe) await unlikeNewsComment(comment.id);
      else await likeNewsComment(comment.id);
      const bump = (c) =>
        c.id === comment.id
          ? {
              ...c,
              likedByMe: !c.likedByMe,
              likeCount: c.likeCount + (c.likedByMe ? -1 : 1),
            }
          : c;
      setComments((prev) =>
        prev.map((c) => ({
          ...bump(c),
          replies: (c.replies || []).map(bump),
        }))
      );
    } catch {
      /* ignore */
    }
  };

  const removeComment = async (comment) => {
    try {
      await deleteNewsComment(comment.id);
      const replyCount = comment.replies?.length || 0;
      onCountChange(-(1 + replyCount));
      if (comment.parentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === comment.parentId
              ? { ...c, replies: c.replies.filter((r) => r.id !== comment.id) }
              : c
          )
        );
      } else {
        setComments((prev) => prev.filter((c) => c.id !== comment.id));
      }
    } catch {
      /* ignore */
    }
  };

  const renderComment = (comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? "ml-8" : ""} flex gap-2 py-2`}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
        {(comment.authorName || "?").charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white">
          <span className="font-semibold">{comment.authorName}</span> {comment.body}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-white/40">
          <span>{timeAgo(comment.createdAt)}</span>
          <button type="button" onClick={() => toggleCommentLike(comment)}>
            {comment.likeCount || 0} likes
          </button>
          {!isReply && (
            <button type="button" onClick={() => setReplyTo(comment.id)}>
              Reply
            </button>
          )}
          {comment.isMine && (
            <button type="button" onClick={() => removeComment(comment)} className="text-red-300">
              Delete
            </button>
          )}
        </div>
        {(comment.replies || []).map((r) => renderComment(r, true))}
      </div>
      <button type="button" onClick={() => toggleCommentLike(comment)} className="self-start pt-1">
        {comment.likedByMe ? (
          <FaHeart className="h-3 w-3 text-[var(--color-primary)]" />
        ) : (
          <FaRegHeart className="h-3 w-3 text-white/40" />
        )}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70">
      <div className="flex max-h-[80dvh] w-full max-w-md flex-col rounded-t-2xl border border-white/10 bg-[var(--color-surface)]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-bold text-white">Comments</h2>
          <button type="button" onClick={onClose} className="p-2 text-white/60">
            <FaTimes />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {loading ? (
            <p className="py-6 text-sm text-white/40">Loading...</p>
          ) : comments.length === 0 ? (
            <p className="py-6 text-sm text-white/40">No comments yet.</p>
          ) : (
            comments.map((c) => renderComment(c))
          )}
        </div>
        <form onSubmit={send} className="border-t border-white/10 p-3">
          {replyTo && (
            <div className="mb-2 flex items-center justify-between text-xs text-white/45">
              <span>Replying...</span>
              <button type="button" onClick={() => setReplyTo(null)}>
                Cancel
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a comment..."
              className="min-w-0 flex-1 rounded-full border border-white/10 bg-[#0e1821] px-4 py-2.5 text-sm text-white outline-none"
            />
            <button
              type="submit"
              disabled={sending || !body.trim()}
              className="rounded-full bg-[var(--color-secondary)] px-3 text-white disabled:opacity-50"
            >
              <FaPaperPlane className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
