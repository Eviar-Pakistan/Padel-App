import { useEffect, useMemo, useRef, useState } from "react";
import {
  createOwnerNews,
  deleteOwnerNews,
  getNewsFilterOptions,
  getOwnerNews,
  updateOwnerNews,
} from "../../api/owner";
import NewsCategoryPicker from "../../components/NewsCategoryPicker";

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

const emptyForm = {
  description: "",
  category: "ANNOUNCEMENT",
};

export default function OwnerNewsPanel() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState(CATEGORIES);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

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
      const [{ data: mine }, filtersRes] = await Promise.all([
        getOwnerNews(),
        getNewsFilterOptions().catch(() => ({ data: {} })),
      ]);
      setPosts(mine || []);
      if (filtersRes.data?.categories?.length) {
        setCategories(filtersRes.data.categories);
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setExistingImages([]);
    setNewFiles([]);
    setMessage("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const startEdit = (post) => {
    setEditingId(post.id);
    setForm({
      description: post.description || "",
      category: post.category || "ANNOUNCEMENT",
    });
    setExistingImages(Array.isArray(post.images) ? post.images : []);
    setNewFiles([]);
    setMessage("");
    setError("");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("description", form.description.trim());
      fd.append("category", form.category);
      if (editingId) {
        fd.append("existingImages", JSON.stringify(existingImages));
      }
      newFiles.forEach((f) => fd.append("images", f));

      if (editingId) {
        await updateOwnerNews(editingId, fd);
        setMessage("Post updated.");
      } else {
        await createOwnerNews(fd);
        setMessage("Post published.");
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
    if (!window.confirm("Delete this post?")) return;
    try {
      await deleteOwnerNews(id);
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
        <h2 className="text-xl font-bold text-white md:text-2xl">News Feed</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Publish club announcements, events, and offers to the player feed
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4 md:p-6"
      >
        <p className="text-sm font-semibold text-white">
          {editingId ? "Edit post" : "Create post"}
        </p>

        <textarea
          required
          rows={4}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Write your announcement..."
          className="w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3 text-sm text-white outline-none"
        />

        <div>
          <NewsCategoryPicker
            categories={categories}
            value={form.category}
            onChange={(category) => setForm((f) => ({ ...f, category }))}
          />
          <p className="mt-2 text-[11px] text-white/35">
            Location is taken from your club profile automatically.
          </p>
        </div>

        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-white/50">
            Images (Optional)
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
              {existingImages.map((url) => (
                <div
                  key={url}
                  className="group relative h-20 w-20 overflow-hidden rounded-xl border border-white/10"
                >
                  <img src={mediaUrl(url)} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() =>
                      setExistingImages((imgs) => imgs.filter((u) => u !== url))
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

        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-emerald-400">{message}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[var(--color-secondary)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Update post" : "Publish post"}
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
        <p className="text-sm text-[var(--color-muted)]">Loading posts...</p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No posts yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => {
            const imgs = Array.isArray(post.images) ? post.images : [];
            const cover = mediaUrl(imgs[0]);
            return (
              <article
                key={post.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--color-surface)]"
              >
                {cover ? (
                 <img
                 src={cover}
                 alt={post.description}
                 className="h-[400px] w-full bg-white object-contain"
               />
                ) : (
                  <div className="flex h-28 items-center justify-center bg-[#0e1821] text-xs text-white/30">
                    No image
                  </div>
                )}
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase text-white/50">
                      {String(post.category).replace(/_/g, " ")}
                    </span>
                    <span className="text-[11px] text-white/35">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="line-clamp-3 text-sm text-white/90">{post.description}</p>
                  <p className="text-xs text-white/40">{post.location}</p>
                  <p className="text-xs text-white/35">
                    {post.likeCount} likes · {post.commentCount} comments ·{" "}
                    {post.shareCount} shares
                  </p>
                  <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => startEdit(post)}
                      className="rounded-lg border border-white/20 px-3 py-1.5 font-mono text-xs uppercase text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(post.id)}
                      className="font-mono text-xs uppercase text-[#f07178]"
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
