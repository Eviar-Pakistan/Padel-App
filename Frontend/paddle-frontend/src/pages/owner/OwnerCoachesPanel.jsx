import { useEffect, useState } from "react";
import {
  createCoach,
  deleteCoach,
  getCoaches,
  updateCoach,
} from "../../api/owner";
import CustomSelect from "../../components/CustomSelect";

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

const COACH_STATUSES = [
  { value: "ACTIVE", label: "ACTIVE" },
  { value: "INACTIVE", label: "INACTIVE" },
  { value: "SUSPENDED", label: "SUSPENDED" },
];

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  gender: "",
  bio: "",
  yearsOfExperience: "",
  sessionRate: "",
  certificationLevel: "",
  specialties: "",
  languages: "",
  isVerified: false,
  status: "ACTIVE",
};

export default function OwnerCoachesPanel() {
  const [coaches, setCoaches] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (coach) => {
    setEditingId(coach.id);
    setForm({
      firstName: coach.firstName || "",
      lastName: coach.lastName || "",
      email: coach.email || "",
      phoneNumber: coach.phoneNumber || "",
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
      isVerified: Boolean(coach.isVerified),
      status: coach.status || "ACTIVE",
    });
  };

  const buildPayload = () => {
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phoneNumber: form.phoneNumber.trim(),
      isVerified: form.isVerified,
      status: form.status,
    };
    if (form.gender) payload.gender = form.gender;
    if (form.bio.trim()) payload.bio = form.bio.trim();
    if (form.certificationLevel.trim()) {
      payload.certificationLevel = form.certificationLevel.trim();
    }
    if (form.yearsOfExperience !== "") {
      payload.yearsOfExperience = Number(form.yearsOfExperience);
    }
    if (form.sessionRate !== "") payload.sessionRate = Number(form.sessionRate);
    if (form.specialties.trim()) {
      payload.specialties = form.specialties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (form.languages.trim()) {
      payload.languages = form.languages
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = buildPayload();
      if (editingId) {
        await updateCoach(editingId, payload);
        setMessage("Coach updated.");
      } else {
        await createCoach(payload);
        setMessage("Coach created.");
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

  const field = (key, placeholder, type = "text") => (
    <input
      type={type}
      className="w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3 text-sm text-white outline-none"
      placeholder={placeholder}
      value={form[key]}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      required={["firstName", "lastName", "email", "phoneNumber"].includes(key)}
    />
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white md:text-2xl">Coaches</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Create, edit, and delete coaches
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4 md:grid-cols-2 md:p-5"
      >
        <p className="text-sm font-semibold text-white md:col-span-2">
          {editingId ? "Edit coach" : "Create coach"}
        </p>
        {field("firstName", "First name")}
        {field("lastName", "Last name")}
        {field("email", "Email", "email")}
        {field("phoneNumber", "Phone number")}
        <CustomSelect
          value={form.gender}
          onChange={(v) => setForm((f) => ({ ...f, gender: v }))}
          placeholder="Gender (optional)"
          options={GENDER_OPTIONS}
        />
        {field("yearsOfExperience", "Years of experience", "number")}
        {field("sessionRate", "Session rate", "number")}
        {field("certificationLevel", "Certification level")}
        {field("languages", "Languages (comma separated)")}
        {field("specialties", "Specialties (comma separated)")}
        <textarea
          className="min-h-24 w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3 text-sm text-white outline-none md:col-span-2"
          placeholder="Bio"
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
        />
        <CustomSelect
          value={form.status}
          onChange={(v) => setForm((f) => ({ ...f, status: v }))}
          placeholder="Status"
          allowEmpty={false}
          options={COACH_STATUSES}
        />
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={form.isVerified}
            onChange={(e) =>
              setForm((f) => ({ ...f, isVerified: e.target.checked }))
            }
          />
          Verified coach
        </label>
        {error && <p className="text-sm text-red-400 md:col-span-2">{error}</p>}
        {message && (
          <p className="text-sm text-emerald-400 md:col-span-2">{message}</p>
        )}
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[var(--color-secondary)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Update coach" : "Create coach"}
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
        <p className="text-sm text-[var(--color-muted)]">Loading coaches...</p>
      ) : coaches.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No coaches yet.</p>
      ) : (
        <div className="space-y-3">
          {coaches.map((coach) => (
            <div
              key={coach.id}
              className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">
                    {coach.firstName} {coach.lastName}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {coach.email} · {coach.phoneNumber}
                  </p>
                  <p className="mt-1 text-xs text-white/70">
                    {coach.status}
                    {coach.isVerified ? " · Verified" : ""} · Reviews:{" "}
                    {coach.totalReviews ?? 0}
                  </p>
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
          ))}
        </div>
      )}
    </div>
  );
}
