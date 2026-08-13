import { useEffect, useMemo, useRef, useState } from "react";
import {
  createCourt,
  deleteCourt,
  getMyCourts,
  updateCourt,
} from "../../api/owner";
import CustomSelect from "../../components/CustomSelect";
import LocationMapPicker from "../../components/LocationMapPicker";

const DEFAULT_SLOTS = [
  { startTime: "06:00", endTime: "07:00" },
  { startTime: "07:00", endTime: "08:00" },
  { startTime: "08:00", endTime: "09:00" },
];

const ENVIRONMENT_OPTIONS = [
  { value: "INDOOR", label: "Indoor" },
  { value: "OUTDOOR", label: "Outdoor" },
  { value: "SEMI_INDOOR", label: "Semi indoor" },
  { value: "SEMI_OUTDOOR", label: "Semi outdoor" },
];

const emptyForm = {
  name: "",
  pricePerHour: "",
  environmentType: "OUTDOOR",
  address: "",
  latitude: "",
  longitude: "",
  isActive: true,
  timeSlots: DEFAULT_SLOTS,
};

const MAX_IMAGES = 8;
const SLOT_PREVIEW = 4;

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

function courtImages(court) {
  if (Array.isArray(court?.images)) return court.images.filter(Boolean);
  if (court?.image) return [court.image];
  return [];
}

function nextHour(hhmm) {
  const normalized = normalizeTimeValue(hhmm);
  const [h, m] = normalized.split(":").map(Number);
  const next = (h + 1) % 24;
  return `${String(next).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
}

function normalizeTimeValue(hhmm) {
  const raw = String(hhmm || "").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return raw.slice(0, 5);
  return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`;
}

export default function OwnerCourtsPanel() {
  const [courts, setCourts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [expandedSlots, setExpandedSlots] = useState({});
  const fileInputRef = useRef(null);

  const newPreviews = useMemo(
    () => newFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [newFiles]
  );

  useEffect(() => {
    return () => {
      newPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [newPreviews]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getMyCourts();
      setCourts(data || []);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load courts."
      );
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
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startEdit = (court) => {
    setEditingId(court.id);
    setForm({
      name: court.name || "",
      pricePerHour: String(court.pricePerHour ?? ""),
      environmentType: court.environmentType || "OUTDOOR",
      address: court.address || "",
      latitude:
        court.latitude != null && court.latitude !== ""
          ? String(court.latitude)
          : "",
      longitude:
        court.longitude != null && court.longitude !== ""
          ? String(court.longitude)
          : "",
      isActive: court.isActive !== false,
      timeSlots:
        court.timeSlots?.length > 0
          ? court.timeSlots.map((s) => ({
              startTime: s.startTime,
              endTime: s.endTime,
            }))
          : DEFAULT_SLOTS,
    });
    setExistingImages(courtImages(court));
    setNewFiles([]);
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (!incoming.length) return;
    setNewFiles((prev) => {
      const room = MAX_IMAGES - existingImages.length - prev.length;
      if (room <= 0) return prev;
      return [...prev, ...incoming.slice(0, room)];
    });
  };

  const onFileInput = (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const removeExistingImage = (url) => {
    setExistingImages((imgs) => imgs.filter((u) => u !== url));
  };

  const removeNewFile = (index) => {
    setNewFiles((files) => files.filter((_, i) => i !== index));
  };

  const addSlot = () => {
    setForm((f) => {
      const last = f.timeSlots[f.timeSlots.length - 1];
      const start = last
        ? normalizeTimeValue(last.endTime)
        : "06:00";
      const end = nextHour(start);
      // Avoid wrapping into a duplicate overnight cycle
      if (
        f.timeSlots.some(
          (s) =>
            normalizeTimeValue(s.startTime) === start &&
            normalizeTimeValue(s.endTime) === end
        )
      ) {
        return f;
      }
      return {
        ...f,
        timeSlots: [...f.timeSlots, { startTime: start, endTime: end }],
      };
    });
  };

  const removeSlot = (index) => {
    setForm((f) => ({
      ...f,
      timeSlots: f.timeSlots.filter((_, i) => i !== index),
    }));
  };

  const updateSlot = (index, field, value) => {
    const next = normalizeTimeValue(value);
    setForm((f) => ({
      ...f,
      timeSlots: f.timeSlots.map((slot, i) =>
        i === index ? { ...slot, [field]: next } : slot
      ),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.timeSlots.length < 1) {
      setError("Add at least one time slot.");
      return;
    }
    const normalizedSlots = form.timeSlots.map((s) => ({
      startTime: normalizeTimeValue(s.startTime),
      endTime: normalizeTimeValue(s.endTime),
    }));
    const keys = normalizedSlots.map((s) => `${s.startTime}|${s.endTime}`);
    if (new Set(keys).size !== keys.length) {
      setError("Duplicate time slots found. Remove duplicates and try again.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("pricePerHour", String(Number(form.pricePerHour)));
      formData.append("environmentType", form.environmentType || "OUTDOOR");
      formData.append("address", form.address.trim());
      if (form.latitude !== "") {
        formData.append("latitude", String(Number(form.latitude)));
      }
      if (form.longitude !== "") {
        formData.append("longitude", String(Number(form.longitude)));
      }
      formData.append("isActive", String(form.isActive));
      formData.append("timeSlots", JSON.stringify(normalizedSlots));

      if (editingId) {
        formData.append("existingImages", JSON.stringify(existingImages));
      }

      newFiles.forEach((file) => {
        formData.append("images", file);
      });

      if (editingId) {
        await updateCourt(editingId, formData);
        setMessage("Court updated.");
      } else {
        await createCourt(formData);
        setMessage("Court created.");
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
    if (!window.confirm("Delete this court?")) return;
    try {
      await deleteCourt(id);
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Delete failed.");
    }
  };

  const totalImageCount = existingImages.length + newFiles.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white md:text-2xl">Courts</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Create and manage courts, images, and daily time slots
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4 md:p-6"
      >
        <p className="text-sm font-semibold text-white">
          {editingId ? "Edit court" : "Create court"}
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3 text-sm text-white outline-none focus:border-[var(--color-primary)]/40"
            placeholder="Court name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <input
            type="number"
            min="0"
            className="w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3 text-sm text-white outline-none focus:border-[var(--color-primary)]/40"
            placeholder="Price per hour (PKR)"
            value={form.pricePerHour}
            onChange={(e) =>
              setForm((f) => ({ ...f, pricePerHour: e.target.value }))
            }
            required
          />
          <CustomSelect
            label="Environment type"
            value={form.environmentType}
            onChange={(v) =>
              setForm((f) => ({ ...f, environmentType: v || "OUTDOOR" }))
            }
            placeholder="Select environment"
            allowEmpty={false}
            options={ENVIRONMENT_OPTIONS}
            className="md:col-span-2"
          />
          <LocationMapPicker
            latitude={form.latitude}
            longitude={form.longitude}
            address={form.address}
            onChange={({ latitude, longitude, address }) =>
              setForm((f) => ({
                ...f,
                latitude,
                longitude,
                address: address ?? f.address,
              }))
            }
          />
        </div>

        {/* Multi image upload */}
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-white/50">
            Court image (Optional)
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
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={onFileInput}
              className="hidden"
            />
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
                <path d="M16 3v6M13 6h6" strokeWidth="1.75" />
              </svg>
            </span>
            <p className="text-sm font-semibold text-white">
              Click to upload or drag and drop
            </p>
            <p className="mt-1 text-xs text-white/45">
              PNG, JPG, WebP or GIF · up to {MAX_IMAGES} images
            </p>
            {totalImageCount > 0 && (
              <p className="mt-2 text-xs text-[var(--color-primary)]">
                {totalImageCount} / {MAX_IMAGES} selected
              </p>
            )}
          </label>

          {(existingImages.length > 0 || newPreviews.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {existingImages.map((url) => (
                <div
                  key={url}
                  className="group relative h-20 w-20 overflow-hidden rounded-xl border border-white/10"
                >
                  <img
                    src={mediaUrl(url)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(url)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white opacity-0 transition group-hover:opacity-100"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
              {newPreviews.map((item, index) => (
                <div
                  key={item.url}
                  className="group relative h-20 w-20 overflow-hidden rounded-xl border border-[var(--color-primary)]/40"
                >
                  <img
                    src={item.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeNewFile(index)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white opacity-0 transition group-hover:opacity-100"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Time slots pills */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-wider text-white/50">
              Time slots
            </p>
            <button
              type="button"
              onClick={addSlot}
              className="font-mono text-xs font-bold uppercase tracking-wide text-[var(--color-primary)] hover:opacity-80"
            >
              + Add slot
            </button>
          </div>
          <div className="space-y-2 rounded-2xl border border-white/10 bg-[#0e1821]/60 p-3">
            {form.timeSlots.length === 0 ? (
              <p className="py-3 text-center text-sm text-white/40">
                No slots yet. Click + Add slot.
              </p>
            ) : (
              form.timeSlots.map((slot, index) => (
                <div
                  key={`${slot.startTime}-${index}`}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#15202b] px-3 py-2.5"
                >
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) =>
                      updateSlot(index, "startTime", e.target.value)
                    }
                    className="w-[7.5rem] rounded-lg border border-white/10 bg-transparent px-2 py-1 font-mono text-sm text-white outline-none"
                    required
                  />
                  <span className="text-white/40">–</span>
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) =>
                      updateSlot(index, "endTime", e.target.value)
                    }
                    className="w-[7.5rem] rounded-lg border border-white/10 bg-transparent px-2 py-1 font-mono text-sm text-white outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeSlot(index)}
                    className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-white/45 hover:bg-white/10 hover:text-white"
                    aria-label="Remove slot"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active status toggle */}
        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-white/70">
              Active status
            </p>
            <p className="mt-1 text-sm text-white/45">
              Make court available for booking
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.isActive}
            onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              form.isActive
                ? "bg-[var(--color-primary)]"
                : "bg-white/15"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                form.isActive ? "left-[1.35rem]" : "left-0.5"
              }`}
            />
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-emerald-400">{message}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[var(--color-secondary)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Update court" : "Create court"}
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
        <p className="text-sm text-[var(--color-muted)]">Loading courts...</p>
      ) : courts.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No courts yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courts.map((court) => {
            const imgs = courtImages(court);
            const cover = mediaUrl(imgs[0]);
            const slots = court.timeSlots || [];
            const showAll = expandedSlots[court.id];
            const visibleSlots = showAll ? slots : slots.slice(0, SLOT_PREVIEW);
            const remaining = Math.max(0, slots.length - SLOT_PREVIEW);

            return (
              <article
                key={court.id}
                className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[var(--color-surface)] ${
                  court.isActive ? "pl-1" : ""
                }`}
              >
                {court.isActive && (
                  <span className="absolute bottom-0 left-0 top-0 w-1 bg-[var(--color-primary)]" />
                )}

                <div className="flex h-full flex-col p-3.5 pl-4">
                  <div className="flex gap-3">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#0e1821]">
                      {cover ? (
                        <img
                          src={cover}
                          alt={court.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-white/30">
                          No image
                        </div>
                      )}
                      <span
                        className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${
                          court.isActive
                            ? "bg-[var(--color-primary)] text-[var(--color-background)]"
                            : "bg-black/70 text-white/70"
                        }`}
                      >
                        {court.isActive ? "Active" : "Inactive"}
                      </span>
                      {imgs.length > 1 && (
                        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[10px] text-white">
                          +{imgs.length - 1}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start gap-2">
                        <h3 className="min-w-0 flex-1 text-base font-bold leading-tight text-white">
                          {court.name}
                        </h3>
                        <span className="shrink-0 rounded-lg border border-[var(--color-primary)]/50 px-2 py-0.5 font-mono text-xs">
                          <span className="font-bold text-[var(--color-primary)]">
                            PKR {String(court.pricePerHour)}
                          </span>
                          <span className="text-white/45"> / hr</span>
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-white/45">
                        {String(court.environmentType || "OUTDOOR").replace(
                          /_/g,
                          " "
                        )}
                      </p>
                      {court.address && (
                        <p className="mt-1 truncate text-xs text-white/40">
                          {court.address}
                        </p>
                      )}
                      {(court.latitude != null || court.longitude != null) && (
                        <p className="mt-0.5 font-mono text-[10px] text-white/35">
                          {court.latitude != null ? Number(court.latitude) : "—"}
                          ,{" "}
                          {court.longitude != null
                            ? Number(court.longitude)
                            : "—"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 border-t border-white/8 pt-3">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-white/40">
                      Today&apos;s slots
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {visibleSlots.map((s) => (
                        <span
                          key={`${s.id || s.startTime}-${s.endTime}`}
                          className="rounded-md border border-white/10 bg-[#0e1821] px-2 py-1 font-mono text-[11px] text-white/80"
                        >
                          {s.startTime} - {s.endTime}
                        </span>
                      ))}
                      {!showAll && remaining > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSlots((m) => ({
                              ...m,
                              [court.id]: true,
                            }))
                          }
                          className="rounded-md border border-dashed border-white/20 px-2 py-1 font-mono text-[11px] text-white/50 hover:border-white/40 hover:text-white/70"
                        >
                          +{remaining} more
                        </button>
                      )}
                      {showAll && slots.length > SLOT_PREVIEW && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSlots((m) => ({
                              ...m,
                              [court.id]: false,
                            }))
                          }
                          className="rounded-md border border-dashed border-white/20 px-2 py-1 font-mono text-[11px] text-white/50"
                        >
                          Show less
                        </button>
                      )}
                      {slots.length === 0 && (
                        <span className="text-xs text-white/35">No slots</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => startEdit(court)}
                      className="rounded-lg border border-white/20 px-4 py-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/5"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(court.id)}
                      className="font-mono text-xs font-semibold uppercase tracking-wide text-[#f07178] hover:opacity-80"
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

function CourtIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" />
    </svg>
  );
}

function LightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.8c.5.4.8 1 .9 1.7h4.2c.1-.7.4-1.3.9-1.7A6 6 0 0 0 12 3z" />
    </svg>
  );
}
