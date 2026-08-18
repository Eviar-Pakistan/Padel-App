import { useEffect, useRef, useState } from "react";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaCircle,
  FaCloudUploadAlt,
  FaFileAlt,
  FaPlus,
  FaUser,
} from "react-icons/fa";
import {
  createCoach,
  deleteCoach,
  getCoaches,
  updateCoach,
} from "../../api/owner";
import CustomSelect from "../../components/CustomSelect";
import PasswordToggleButton from "../../components/PasswordToggleButton";

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

const COACH_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
];

const CERT_OPTIONS = [
  { value: "Beginner", label: "Beginner" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced", label: "Advanced" },
  { value: "Professional", label: "Professional" },
  { value: "Level 1", label: "Level 1" },
  { value: "Level 2", label: "Level 2" },
  { value: "Level 3", label: "Level 3" },
];

const WEEK_DAYS = [
  { value: "MON", label: "Monday" },
  { value: "TUE", label: "Tuesday" },
  { value: "WED", label: "Wednesday" },
  { value: "THU", label: "Thursday" },
  { value: "FRI", label: "Friday" },
  { value: "SAT", label: "Saturday" },
  { value: "SUN", label: "Sunday" },
];

const DAY_LABEL = Object.fromEntries(WEEK_DAYS.map((d) => [d.value, d.label]));
const BIO_MAX = 500;

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  password: "",
  gender: "",
  bio: "",
  yearsOfExperience: "",
  sessionRate: "",
  certificationLevel: "",
  specialties: "",
  languages: "",
  availableFromDay: "MON",
  availableToDay: "THU",
  availableFromTime: "",
  availableToTime: "",
  isVerified: false,
  status: "ACTIVE",
};

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

function formatAvailability(coach) {
  const fromDay = DAY_LABEL[coach.availableFromDay];
  const toDay = DAY_LABEL[coach.availableToDay];
  const days =
    fromDay && toDay
      ? `${fromDay.slice(0, 3)} – ${toDay.slice(0, 3)}`
      : fromDay || toDay || "";
  const times =
    coach.availableFromTime && coach.availableToTime
      ? `${coach.availableFromTime} – ${coach.availableToTime}`
      : coach.availableFromTime || coach.availableToTime || "";
  if (days && times) return `${days} · ${times}`;
  return days || times || "";
}

function SectionCard({ icon: Icon, title, subtitle, children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-[var(--color-surface)] p-5 ${className}`}
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-white/45">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  prefix,
  className = "",
  type,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-[var(--color-muted)]">
          {label}
          {required && <span className="ml-0.5 text-red-400">*</span>}
        </span>
      )}
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-white/70">
            {prefix}
          </span>
        )}
        <input
          type={isPassword && showPassword ? "text" : type}
          required={required}
          className="w-full rounded-xl border border-white/10 bg-[#0e1821] py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--color-primary)]/50"
          style={{
            paddingLeft: prefix ? "3.25rem" : "0.85rem",
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

export default function OwnerCoachesPanel() {
  const [coaches, setCoaches] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [existingImage, setExistingImage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getCoaches();
      setCoaches(data || []);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load coaches.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setExistingImage("");
    setImageFile(null);
    setImagePreview("");
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startEdit = (coach) => {
    setEditingId(coach.id);
    setForm({
      firstName: coach.firstName || "",
      lastName: coach.lastName || "",
      email: coach.email || "",
      phoneNumber: coach.phoneNumber || "",
      password: "",
      gender: coach.gender || "",
      bio: coach.bio || "",
      yearsOfExperience:
        coach.yearsOfExperience != null ? String(coach.yearsOfExperience) : "",
      sessionRate: coach.sessionRate != null ? String(coach.sessionRate) : "",
      certificationLevel: coach.certificationLevel || "",
      specialties: Array.isArray(coach.specialties)
        ? coach.specialties.join(", ")
        : "",
      languages: Array.isArray(coach.languages) ? coach.languages.join(", ") : "",
      availableFromDay: coach.availableFromDay || "MON",
      availableToDay: coach.availableToDay || "THU",
      availableFromTime: coach.availableFromTime || "",
      availableToTime: coach.availableToTime || "",
      isVerified: Boolean(coach.isVerified),
      status: coach.status || "ACTIVE",
    });
    setExistingImage(coach.profileImage || "");
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const applyImageFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5MB or smaller.");
      return;
    }
    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const onPickImage = (e) => {
    applyImageFile(e.target.files?.[0]);
  };

  const onDropImage = (e) => {
    e.preventDefault();
    setDragOver(false);
    applyImageFile(e.dataTransfer.files?.[0]);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("firstName", form.firstName.trim());
      formData.append("lastName", form.lastName.trim());
      formData.append("email", form.email.trim());
      formData.append("phoneNumber", form.phoneNumber.trim());
      if (form.password.trim()) {
        formData.append("password", form.password.trim());
      } else if (!editingId) {
        throw new Error("Login password is required for new coaches.");
      }
      formData.append("isVerified", String(form.isVerified));
      formData.append("status", form.status);
      if (form.gender) formData.append("gender", form.gender);
      if (form.bio.trim()) formData.append("bio", form.bio.trim().slice(0, BIO_MAX));
      if (form.certificationLevel.trim()) {
        formData.append("certificationLevel", form.certificationLevel.trim());
      }
      if (form.yearsOfExperience !== "") {
        formData.append("yearsOfExperience", String(Number(form.yearsOfExperience)));
      }
      if (form.sessionRate !== "") {
        formData.append("sessionRate", String(Number(form.sessionRate)));
      }
      if (form.specialties.trim()) {
        formData.append(
          "specialties",
          JSON.stringify(
            form.specialties
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          )
        );
      }
      if (form.languages.trim()) {
        formData.append(
          "languages",
          JSON.stringify(
            form.languages
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          )
        );
      }
      formData.append("availableFromDay", form.availableFromDay);
      formData.append("availableToDay", form.availableToDay);
      formData.append("availableFromTime", form.availableFromTime);
      formData.append("availableToTime", form.availableToTime);
      if (imageFile) formData.append("profileImage", imageFile);

      if (editingId) {
        await updateCoach(editingId, formData);
        setMessage("Coach updated.");
      } else {
        await createCoach(formData);
        setMessage("Coach created.");
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
    if (!window.confirm("Delete this coach?")) return;
    try {
      await deleteCoach(id);
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Delete failed.");
    }
  };

  const previewSrc = imagePreview || mediaUrl(existingImage);
  const certOptions =
    form.certificationLevel &&
    !CERT_OPTIONS.some((o) => o.value === form.certificationLevel)
      ? [{ value: form.certificationLevel, label: form.certificationLevel }, ...CERT_OPTIONS]
      : CERT_OPTIONS;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white md:text-2xl">
          {editingId ? "Edit Coach" : "Create Coach"}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Add coach details, availability, and a profile photo
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.9fr)]">
          <SectionCard
            icon={FaUser}
            title="Personal Information"
            subtitle="Basic details and coach portal login."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="First name"
                required
                placeholder="Enter first name"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
              <Field
                label="Last name"
                required
                placeholder="Enter last name"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
              <Field
                label="Email address"
                type="email"
                required
                placeholder="Enter email address"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              <Field
                label="Phone number"
                required
                prefix="+92"
                placeholder="Enter phone number"
                value={form.phoneNumber}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              />
              <Field
                label={editingId ? "Login password (optional)" : "Login password"}
                type="password"
                required={!editingId}
                placeholder={
                  editingId
                    ? "Leave blank to keep current password"
                    : "Set coach login password"
                }
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
              <CustomSelect
                label="Gender (optional)"
                value={form.gender}
                onChange={(v) => setForm((f) => ({ ...f, gender: v }))}
                placeholder="Select gender"
                options={GENDER_OPTIONS}
              />
              <Field
                label="Years of experience"
                type="number"
                min="0"
                required
                placeholder="e.g. 5"
                value={form.yearsOfExperience}
                onChange={(e) =>
                  setForm((f) => ({ ...f, yearsOfExperience: e.target.value }))
                }
              />
              <Field
                label="Session rate (PKR)"
                type="number"
                min="0"
                required
                placeholder="e.g. 5000"
                value={form.sessionRate}
                onChange={(e) => setForm((f) => ({ ...f, sessionRate: e.target.value }))}
              />
              <CustomSelect
                label="Certification level"
                value={form.certificationLevel}
                onChange={(v) => setForm((f) => ({ ...f, certificationLevel: v }))}
                placeholder="Select certification level"
                options={certOptions}
              />
              <Field
                label="Languages (comma separated)"
                placeholder="e.g. English, Spanish, Urdu"
                value={form.languages}
                onChange={(e) => setForm((f) => ({ ...f, languages: e.target.value }))}
              />
              <Field
                label="Specialties (comma separated)"
                placeholder="e.g. Technical, Match Play, Beginners"
                value={form.specialties}
                onChange={(e) => setForm((f) => ({ ...f, specialties: e.target.value }))}
              />
            </div>
          </SectionCard>

          <div className="space-y-4">
            <SectionCard
              icon={FaCloudUploadAlt}
              title="Profile Image"
              subtitle="Upload a profile picture for the coach."
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={onPickImage}
                className="hidden"
              />
              {previewSrc ? (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-xl border border-white/10">
                    <img
                      src={previewSrc}
                      alt="Coach profile"
                      className="h-44 w-full object-cover"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={clearImage}
                      className="rounded-lg px-3 py-2 text-xs text-white/50 hover:text-white"
                    >
                      Remove new file
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDropImage}
                  className={`flex min-h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
                    dragOver
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                      : "border-white/15 bg-[#0e1821]/60"
                  }`}
                >
                  <FaCloudUploadAlt className="h-10 w-10 text-white/35" />
                  <p className="mt-3 text-sm text-white/70">
                    Drag and drop an image here or
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-3 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                  >
                    Choose File
                  </button>
                  <p className="mt-3 text-xs text-white/35">JPG, PNG up to 5MB</p>
                </div>
              )}
            </SectionCard>

            <SectionCard
              icon={FaCircle}
              title="Coach Status"
            >
              <CustomSelect
                label="Status"
                value={form.status}
                onChange={(v) => setForm((f) => ({ ...f, status: v }))}
                placeholder="Status"
                allowEmpty={false}
                options={COACH_STATUSES}
              />
              <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={form.isVerified}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isVerified: e.target.checked }))
                  }
                  className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
                />
                <span className="flex items-center gap-2">
                  Mark this coach as verified
                  <FaCheckCircle className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                </span>
              </label>
            </SectionCard>
          </div>
        </div>

        <SectionCard
          icon={FaCalendarAlt}
          title="Availability"
          subtitle="Set the coach's weekly availability."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CustomSelect
              label="Start day"
              value={form.availableFromDay}
              onChange={(v) => setForm((f) => ({ ...f, availableFromDay: v }))}
              placeholder="Monday"
              allowEmpty={false}
              options={WEEK_DAYS}
            />
            <CustomSelect
              label="End day"
              value={form.availableToDay}
              onChange={(v) => setForm((f) => ({ ...f, availableToDay: v }))}
              placeholder="Thursday"
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
        </SectionCard>

        <SectionCard
          icon={FaFileAlt}
          title="Bio"
          subtitle="A short description about the coach."
        >
          <div className="relative">
            <textarea
              maxLength={BIO_MAX}
              rows={5}
              className="w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--color-primary)]/50"
              placeholder="Write a short bio..."
              value={form.bio}
              onChange={(e) =>
                setForm((f) => ({ ...f, bio: e.target.value.slice(0, BIO_MAX) }))
              }
            />
            <span className="pointer-events-none absolute bottom-3 right-3 text-[11px] text-white/35">
              {form.bio.length}/{BIO_MAX}
            </span>
          </div>
        </SectionCard>

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
                ? "Update Coach"
                : "Create Coach"}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading coaches...</p>
      ) : coaches.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No coaches yet.</p>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">All coaches</h3>
          {coaches.map((coach) => {
            const img = mediaUrl(coach.profileImage);
            const availability = formatAvailability(coach);
            return (
              <div
                key={coach.id}
                className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#0e1821]">
                      {img ? (
                        <img
                          src={img}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-white/30">
                          —
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white">
                        {coach.firstName} {coach.lastName}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {coach.email} · {coach.phoneNumber}
                      </p>
                      {availability && (
                        <p className="mt-1 text-xs text-white/60">{availability}</p>
                      )}
                      <p className="mt-1 text-xs text-white/70">
                        {coach.status}
                        {coach.isVerified ? " · Verified" : ""} · Reviews:{" "}
                        {coach.totalReviews ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(coach)}
                      className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(coach.id)}
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
