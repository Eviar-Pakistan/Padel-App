import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaClipboardCheck } from "react-icons/fa";
import CustomSelect from "../../components/CustomSelect";
import CourtImagePicker from "../../components/CourtImagePicker";
import PasswordToggleButton from "../../components/PasswordToggleButton";
import { refereeRegister } from "../../api/referee";
import { getCourts } from "../../api/courts";
import {
  PAKISTAN_CITIES,
  PAKISTAN_PROVINCES,
} from "../../constants/pakistanCities";

const WEEK_DAYS = [
  { value: "MON", label: "Monday" },
  { value: "TUE", label: "Tuesday" },
  { value: "WED", label: "Wednesday" },
  { value: "THU", label: "Thursday" },
  { value: "FRI", label: "Friday" },
  { value: "SAT", label: "Saturday" },
  { value: "SUN", label: "Sunday" },
];

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
};

export default function RefereeRegister() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [form, setForm] = useState(emptyForm);
  const [courtIds, setCourtIds] = useState([]);
  const [courts, setCourts] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    getCourts()
      .then(({ data }) => setCourts(Array.isArray(data) ? data : []))
      .catch(() => setCourts([]));
  }, []);

  const toggleCourt = (id) => {
    setCourtIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("fullName", form.fullName.trim());
      fd.append("email", form.email.trim());
      fd.append("phoneNumber", form.phoneNumber.trim());
      fd.append("password", form.password);
      if (form.location) fd.append("location", form.location);
      if (form.province) fd.append("province", form.province);
      if (form.hourlyRate !== "") {
        fd.append("hourlyRate", String(Number(form.hourlyRate)));
      }
      fd.append("availableFromDay", form.availableFromDay);
      fd.append("availableToDay", form.availableToDay);
      fd.append("availableFromTime", form.availableFromTime);
      fd.append("availableToTime", form.availableToTime);
      fd.append("courtIds", JSON.stringify(courtIds));
      if (imageFile) fd.append("profileImage", imageFile);
      await refereeRegister(fd);
      navigate("/referee/login");
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Registration failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const preview = imageFile ? URL.createObjectURL(imageFile) : null;

  return (
    <div className="min-h-dvh bg-[var(--color-background)] px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/15">
            <FaClipboardCheck className="h-7 w-7 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Referee Register</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Create an account to officiate padel matches
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border border-white/10 bg-[var(--color-surface)] p-6 shadow-xl"
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="h-16 w-16 overflow-hidden rounded-full border border-white/15 bg-[#0e1821]"
            >
              {preview ? (
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-xs text-white/40">
                  Photo
                </span>
              )}
            </button>
            <div>
              <p className="text-sm font-medium text-white">Profile picture</p>
              <p className="text-xs text-white/40">Optional · JPG or PNG</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
          </div>

          <label className="block text-sm text-white/70">
            Full name
            <input
              required
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
            />
          </label>
          <label className="block text-sm text-white/70">
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
            />
          </label>
          <label className="block text-sm text-white/70">
            Phone number
            <input
              required
              value={form.phoneNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, phoneNumber: e.target.value }))
              }
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
            />
          </label>
          <label className="block text-sm text-white/70">
            Password
            <div className="relative mt-1.5">
              <input
                required
                type={showPassword ? "text" : "password"}
                minLength={4}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#0e1821] py-2.5 pl-3 pr-11 text-sm text-white outline-none"
              />
              <PasswordToggleButton
                show={showPassword}
                onClick={() => setShowPassword((s) => !s)}
              />
            </div>
          </label>
          <CustomSelect
            label="City"
            value={form.location}
            onChange={(v) => setForm((f) => ({ ...f, location: v }))}
            placeholder="Select city"
            searchable
            options={PAKISTAN_CITIES}
          />
          <CustomSelect
            label="Province"
            value={form.province}
            onChange={(v) => setForm((f) => ({ ...f, province: v }))}
            placeholder="Select province"
            options={PAKISTAN_PROVINCES}
          />
          <label className="block text-sm text-white/70">
            Hourly rate (PKR)
            <input
              type="number"
              min="0"
              value={form.hourlyRate}
              onChange={(e) =>
                setForm((f) => ({ ...f, hourlyRate: e.target.value }))
              }
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <CustomSelect
              label="From day"
              value={form.availableFromDay}
              onChange={(v) => setForm((f) => ({ ...f, availableFromDay: v }))}
              allowEmpty={false}
              options={WEEK_DAYS}
            />
            <CustomSelect
              label="To day"
              value={form.availableToDay}
              onChange={(v) => setForm((f) => ({ ...f, availableToDay: v }))}
              allowEmpty={false}
              options={WEEK_DAYS}
            />
            <label className="block text-sm text-white/70">
              From time
              <input
                type="time"
                value={form.availableFromTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, availableFromTime: e.target.value }))
                }
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
              />
            </label>
            <label className="block text-sm text-white/70">
              To time
              <input
                type="time"
                value={form.availableToTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, availableToTime: e.target.value }))
                }
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-white/70">
              Available courts
            </p>
            <CourtImagePicker
              courts={courts}
              selectedIds={courtIds}
              onToggle={toggleCourt}
              layout="scroll"
              emptyText="No courts listed yet. You can add them later from your profile."
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[var(--color-primary)] py-3 text-sm font-bold text-[var(--color-background)] disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
          <p className="text-center text-sm text-white/45">
            Already registered?{" "}
            <Link
              to="/referee/login"
              className="font-semibold text-[var(--color-primary)]"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
