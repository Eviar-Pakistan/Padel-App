import { useEffect, useRef, useState } from "react";
import {
  FaCalendarAlt,
  FaCloudUploadAlt,
  FaPlus,
  FaUser,
} from "react-icons/fa";
import {
  createReferee,
  deleteReferee,
  getMyCourts,
  getReferees,
  updateReferee,
} from "../../api/owner";
import CustomSelect from "../../components/CustomSelect";
import CourtImagePicker from "../../components/CourtImagePicker";
import PasswordToggleButton from "../../components/PasswordToggleButton";
import {
  PAKISTAN_CITIES,
  PAKISTAN_PROVINCES,
} from "../../constants/pakistanCities";
import { sanitizeFullName, sanitizePhone } from "../../utils/authFields";

const WEEK_DAYS = [
  { value: "MON", label: "Monday" },
  { value: "TUE", label: "Tuesday" },
  { value: "WED", label: "Wednesday" },
  { value: "THU", label: "Thursday" },
  { value: "FRI", label: "Friday" },
  { value: "SAT", label: "Saturday" },
  { value: "SUN", label: "Sunday" },
];

const STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
];

const DAY_LABEL = Object.fromEntries(WEEK_DAYS.map((d) => [d.value, d.label]));

function formatTime12(hhmm) {
  if (!hhmm) return "";
  const [hStr, mStr] = String(hhmm).split(":");
  const h = Number(hStr);
  const m = mStr || "00";
  if (Number.isNaN(h)) return hhmm;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${m} ${ampm}`;
}

const emptyForm = {
  fullName: "",
  email: "",
  phoneNumber: "",
  password: "",
  location: "",
  province: "",
  hourlyRate: "",
  availableFromDay: "MON",
  availableToDay: "SUN",
  availableFromTime: "09:00",
  availableToTime: "18:00",
  status: "ACTIVE",
};

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

function formatAvailability(ref) {
  const fromDay = DAY_LABEL[ref.availableFromDay];
  const toDay = DAY_LABEL[ref.availableToDay];
  const days =
    fromDay && toDay
      ? `${fromDay.slice(0, 3)} – ${toDay.slice(0, 3)}`
      : fromDay || toDay || "";
  const times =
    ref.availableFromTime && ref.availableToTime
      ? `${formatTime12(ref.availableFromTime)} – ${formatTime12(ref.availableToTime)}`
      : formatTime12(ref.availableFromTime) ||
        formatTime12(ref.availableToTime) ||
        "";
  if (days && times) return `${days} · ${times}`;
  return days || times || "";
}

function Field({ label, required, type, ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-[var(--color-muted)]">
          {label}
          {required && <span className="ml-0.5 text-red-400">*</span>}
        </span>
      )}
      <div className="relative">
        <input
          type={isPassword && showPassword ? "text" : type}
          required={required}
          className="w-full rounded-xl border border-white/10 bg-[#0e1821] py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--color-primary)]/50"
          style={{
            paddingLeft: "0.85rem",
            paddingRight: isPassword ? "2.75rem" : "0.85rem",
          }}
          {...props}
        />
        {isPassword && (
          <PasswordToggleButton
            show={showPassword}
            onClick={() => setShowPassword((s) => !s)}
          />
        )}
      </div>
    </label>
  );
}

export default function OwnerRefereesPanel() {
  const [referees, setReferees] = useState([]);
  const [courts, setCourts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [courtIds, setCourtIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [existingImage, setExistingImage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [refRes, courtRes] = await Promise.all([
        getReferees(),
        getMyCourts().catch(() => ({ data: [] })),
      ]);
      setReferees(refRes.data || []);
      setCourts(Array.isArray(courtRes.data) ? courtRes.data : []);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load referees."
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
    setCourtIds([]);
    setEditingId(null);
    setExistingImage("");
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startEdit = (ref) => {
    setEditingId(ref.id);
    setForm({
      fullName: ref.fullName || "",
      email: ref.email || "",
      phoneNumber: ref.phoneNumber || "",
      password: "",
      location: ref.location || "",
      province: ref.province || "",
      hourlyRate: ref.hourlyRate != null ? String(ref.hourlyRate) : "",
      availableFromDay: ref.availableFromDay || "MON",
      availableToDay: ref.availableToDay || "SUN",
      availableFromTime: ref.availableFromTime || "09:00",
      availableToTime: ref.availableToTime || "18:00",
      status: ref.status || "ACTIVE",
    });
    setCourtIds(
      Array.isArray(ref.courts)
        ? ref.courts.map((c) => c.courtId || c.court?.id).filter(Boolean)
        : []
    );
    setExistingImage(ref.profileImage || "");
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleCourt = (id) => {
    setCourtIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("fullName", form.fullName.trim());
      if (!form.phoneNumber.trim()) {
        throw new Error("Phone number is required for referee login.");
      }
      fd.append("phoneNumber", form.phoneNumber.trim());
      if (form.email.trim()) {
        fd.append("email", form.email.trim());
      }
      if (form.password.trim()) {
        fd.append("password", form.password.trim());
      } else if (!editingId) {
        throw new Error("Login password is required for new referees.");
      }
      if (form.location) fd.append("location", form.location);
      if (form.province) fd.append("province", form.province);
      if (form.hourlyRate !== "") {
        fd.append("hourlyRate", String(Number(form.hourlyRate)));
      }
      fd.append("availableFromDay", form.availableFromDay);
      fd.append("availableToDay", form.availableToDay);
      fd.append("availableFromTime", form.availableFromTime);
      fd.append("availableToTime", form.availableToTime);
      fd.append("status", form.status);
      fd.append("courtIds", JSON.stringify(courtIds));
      if (imageFile) fd.append("profileImage", imageFile);

      if (editingId) {
        await updateReferee(editingId, fd);
        setMessage("Referee updated.");
      } else {
        await createReferee(fd);
        setMessage("Referee created.");
      }
      resetForm();
      await load();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg)
          ? msg.join(", ")
          : msg || err.message || "Save failed."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this referee?")) return;
    try {
      await deleteReferee(id);
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Delete failed.");
    }
  };

  const previewSrc = imagePreview || mediaUrl(existingImage);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white md:text-2xl">
          {editingId ? "Edit Referee" : "Create Referee"}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Add a referee with availability and the courts they can officiate
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
              <FaUser className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold text-white">
              Personal information
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Full name"
              required
              value={form.fullName}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  fullName: sanitizeFullName(e.target.value),
                }))
              }
            />
            <Field
              label="Phone number (login)"
              required
              value={form.phoneNumber}
              inputMode="tel"
              placeholder="03XXXXXXXXX"
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  phoneNumber: sanitizePhone(e.target.value),
                }))
              }
            />
            <Field
              label="Email (optional)"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Field
              label={editingId ? "New password (optional)" : "Password"}
              type="password"
              required={!editingId}
              minLength={4}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <CustomSelect
              label="City"
              value={form.location}
              onChange={(v) => setForm((f) => ({ ...f, location: v }))}
              searchable
              options={PAKISTAN_CITIES}
            />
            <CustomSelect
              label="Province"
              value={form.province}
              onChange={(v) => setForm((f) => ({ ...f, province: v }))}
              options={PAKISTAN_PROVINCES}
            />
            <Field
              label="Hourly rate (PKR)"
              type="number"
              min="0"
              value={form.hourlyRate}
              onChange={(e) =>
                setForm((f) => ({ ...f, hourlyRate: e.target.value }))
              }
            />
            <CustomSelect
              label="Status"
              value={form.status}
              onChange={(v) => setForm((f) => ({ ...f, status: v }))}
              allowEmpty={false}
              options={STATUSES}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
              <FaCloudUploadAlt className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold text-white">Profile photo</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full border border-white/10 bg-[#0e1821]">
              {previewSrc ? (
                <img src={previewSrc} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-white/30">
                  —
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white"
            >
              Choose file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImageFile(file);
                setImagePreview(URL.createObjectURL(file));
              }}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
              <FaCalendarAlt className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold text-white">Availability</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CustomSelect
              label="Start day"
              value={form.availableFromDay}
              onChange={(v) => setForm((f) => ({ ...f, availableFromDay: v }))}
              allowEmpty={false}
              options={WEEK_DAYS}
            />
            <CustomSelect
              label="End day"
              value={form.availableToDay}
              onChange={(v) => setForm((f) => ({ ...f, availableToDay: v }))}
              allowEmpty={false}
              options={WEEK_DAYS}
            />
            <Field
              label="Start time"
              type="time"
              value={form.availableFromTime}
              onChange={(e) =>
                setForm((f) => ({ ...f, availableFromTime: e.target.value }))
              }
            />
            <Field
              label="End time"
              type="time"
              value={form.availableToTime}
              onChange={(e) =>
                setForm((f) => ({ ...f, availableToTime: e.target.value }))
              }
            />
          </div>
          <p className="mt-2 text-xs text-white/40">
            12:00 is noon. For evening matches like 10:00 PM, set end time to
            22:00 or later (00:00 = midnight).
          </p>
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-[var(--color-muted)]">
              Courts
            </p>
            <CourtImagePicker
              courts={courts}
              selectedIds={courtIds}
              onToggle={toggleCourt}
              emptyText="Add courts first, then assign them here."
            />
          </div>
        </section>

        {error && (
          <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            {message}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-white/60 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-secondary)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            <FaPlus className="h-3.5 w-3.5" />
            {saving
              ? "Saving..."
              : editingId
                ? "Update Referee"
                : "Create Referee"}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading referees...</p>
      ) : referees.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No referees yet.</p>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">All referees</h3>
          {referees.map((ref) => {
            const img = mediaUrl(ref.profileImage);
            const availability = formatAvailability(ref);
            const courtNames = (ref.courts || [])
              .map((c) => c.court?.name)
              .filter(Boolean)
              .join(", ");
            return (
              <div
                key={ref.id}
                className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#0e1821]">
                      {img ? (
                        <img src={img} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-white/30">
                          —
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-white">
                        <span>{ref.fullName?.trim() || ref.email}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            ref.createdBy === "ADMIN"
                              ? "bg-[var(--color-secondary)]/20 text-sky-300"
                              : "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                          }`}
                        >
                          {ref.createdBy === "ADMIN"
                            ? "Created by admin"
                            : "Self registered"}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {ref.phoneNumber}
                        {ref.email ? ` · ${ref.email}` : ""}
                      </p>
                      {availability && (
                        <p className="mt-1 text-xs text-white/60">{availability}</p>
                      )}
                      <p className="mt-1 text-xs text-white/70">
                        {ref.status}
                        {ref.hourlyRate != null ? ` · PKR ${ref.hourlyRate}/hr` : ""}
                        {courtNames ? ` · ${courtNames}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(ref)}
                      className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ref.id)}
                      className="rounded-lg bg-red-500/15 px-3 py-2 text-xs font-medium text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
