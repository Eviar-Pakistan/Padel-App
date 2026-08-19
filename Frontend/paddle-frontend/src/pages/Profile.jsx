import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCamera,
  FaLock,
  FaMedal,
  FaNewspaper,
  FaStar,
  FaTrophy,
  FaChartLine,
  FaUser,
} from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import CustomSelect from "../components/CustomSelect";
import PasswordToggleButton from "../components/PasswordToggleButton";
import {
  changeMyPassword,
  getMyProfile,
  updateMyAvatar,
  updateMyProfile,
} from "../api/auth";
import { getMatchHistory } from "../api/matches";
import MatchResultCard from "../components/MatchResultCard";
import {
  PAKISTAN_CITIES,
  PAKISTAN_PROVINCES,
} from "../constants/pakistanCities";

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

const HAND_OPTIONS = ["LEFT", "RIGHT", "AMBIDEXTROUS"];

const emptyPersonal = {
  fullName: "",
  mobileNumber: "",
  cnicNumber: "",
  handedness: "",
  location: "",
  province: "",
  isProfilePublic: true,
};

export default function Profile() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [personal, setPersonal] = useState(emptyPersonal);
  const [loading, setLoading] = useState(true);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [matchHistory, setMatchHistory] = useState([]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [{ data }, historyRes] = await Promise.all([
        getMyProfile(),
        getMatchHistory().catch(() => ({ data: [] })),
      ]);
      setMatchHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
      setProfile(data);
      setPersonal({
        fullName: data.fullName || "",
        mobileNumber: data.mobileNumber || "",
        cnicNumber: data.cnicNumber || "",
        handedness: data.handedness || "",
        location: data.location || "",
        province: data.province || "",
        isProfilePublic: Boolean(data.isProfilePublic),
      });
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load profile."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const applyProfile = (data) => {
    setProfile(data);
    setPersonal({
      fullName: data.fullName || "",
      mobileNumber: data.mobileNumber || "",
      cnicNumber: data.cnicNumber || "",
      handedness: data.handedness || "",
      location: data.location || "",
      province: data.province || "",
      isProfilePublic: Boolean(data.isProfilePublic),
    });
  };

  const savePersonal = async (e) => {
    e.preventDefault();
    setSavingPersonal(true);
    setError("");
    setMessage("");
    try {
      const { data } = await updateMyProfile({
        fullName: personal.fullName.trim(),
        mobileNumber: personal.mobileNumber.trim(),
        cnicNumber: personal.cnicNumber.trim(),
        handedness: personal.handedness || undefined,
        location: personal.location || undefined,
        province: personal.province || "",
        isProfilePublic: Boolean(personal.isProfilePublic),
      });
      applyProfile(data);
      setMessage("Personal details saved.");
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Save failed.");
    } finally {
      setSavingPersonal(false);
    }
  };

  const onAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const { data } = await updateMyAvatar(fd);
      applyProfile(data);
      setMessage("Profile image updated.");
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Image upload failed."
      );
    } finally {
      setUploading(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const currentPassword = String(
      fd.get("currentPassword") || passwordForm.currentPassword || ""
    ).trim();
    const newPassword = String(
      fd.get("newPassword") || passwordForm.newPassword || ""
    );
    const confirmPassword = String(
      fd.get("confirmPassword") || passwordForm.confirmPassword || ""
    );

    setPasswordError("");
    setPasswordMessage("");
    setError("");
    setMessage("");

    if (!currentPassword) {
      setPasswordError("Enter your current password.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      await changeMyPassword({ currentPassword, newPassword });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordMessage("Password changed successfully.");
    } catch (err) {
      const msg = err.response?.data?.message;
      setPasswordError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Password change failed."
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const avatar = mediaUrl(profile?.profileImage);
  const activity = profile?.activity || {};
  const reviews = profile?.coachReviews || [];

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />

      <main className="mx-auto w-full max-w-md space-y-4 px-4 pb-28 pt-20">
        <h1 className="text-xl font-bold text-white">Profile</h1>

        {loading ? (
          <p className="text-sm text-[var(--color-muted)]">Loading profile...</p>
        ) : (
          <>
            {/* Header: avatar + name | handedness */}
            <section className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/15 bg-[#0e1821]"
                  aria-label="Change profile image"
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-lg font-bold text-[var(--color-primary)]">
                      {(profile?.fullName || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/55 py-0.5">
                    <FaCamera className="h-2.5 w-2.5 text-white" />
                  </span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onAvatarChange}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-white">
                    {profile?.fullName}
                  </p>
                  <p className="truncate text-xs text-white/45">
                    {profile?.location || "No location set"}
                  </p>
                  {uploading && (
                    <p className="mt-1 text-[11px] text-[var(--color-primary)]">
                      Uploading...
                    </p>
                  )}
                </div>

                <div className="shrink-0 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-2 text-right">
                  <p className="text-[10px] uppercase tracking-wide text-white/40">
                    Handedness
                  </p>
                  <p className="text-sm font-semibold text-[var(--color-primary)]">
                    {profile?.handedness || "—"}
                  </p>
                </div>
              </div>
            </section>

            {error && <p className="text-sm text-red-400">{error}</p>}
            {message && <p className="text-sm text-emerald-400">{message}</p>}

            {/* Ranking (read-only) */}
            <section className="space-y-3 rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4">
              <div className="flex items-center gap-2">
                <FaMedal className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                <h2 className="text-sm font-semibold text-white">Ranking</h2>
              </div>
              <p className="text-[11px] text-white/35">
                Skill level defaults to Beginner. Rank, points, and wins update
                from match activity and cannot be edited here.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <RankStat
                  label="Skill level"
                  value={profile?.skillLevel || "BEGINNER"}
                  icon={FaChartLine}
                />
                <RankStat
                  label="Rank"
                  value={profile?.rank ?? 0}
                  icon={FaMedal}
                />
                <RankStat
                  label="Points"
                  value={profile?.points ?? 0}
                  icon={FaStar}
                />
                <RankStat
                  label="Wins"
                  value={profile?.wins ?? 0}
                  icon={FaTrophy}
                />
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4">
              <div className="flex items-center gap-2">
                <FaTrophy className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                <h2 className="text-sm font-semibold text-white">
                  Match history
                </h2>
              </div>
              <p className="text-[11px] text-white/35">
                Completed matches you played, with results.
              </p>
              {matchHistory.length === 0 ? (
                <p className="text-sm text-white/40">
                  No completed matches yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {matchHistory.map((match) => (
                    <li key={match.id}>
                      <MatchResultCard match={match} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Personal details */}
            <form
              onSubmit={savePersonal}
              className="space-y-3 rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4"
            >
              <div className="flex items-center gap-2">
                <FaUser className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                <h2 className="text-sm font-semibold text-white">
                  Personal details
                </h2>
              </div>
              <Field
                label="Full name"
                value={personal.fullName}
                onChange={(v) => setPersonal((p) => ({ ...p, fullName: v }))}
                required
              />
              <Field
                label="Mobile number"
                value={personal.mobileNumber}
                onChange={(v) =>
                  setPersonal((p) => ({ ...p, mobileNumber: v }))
                }
                required
              />
              <Field
                label="CNIC number"
                value={personal.cnicNumber}
                onChange={(v) => setPersonal((p) => ({ ...p, cnicNumber: v }))}
                required
              />
              <CustomSelect
                label="Location"
                value={personal.location}
                onChange={(v) => setPersonal((p) => ({ ...p, location: v }))}
                placeholder="Select city"
                searchable
                searchPlaceholder="Search city..."
                options={
                  !PAKISTAN_CITIES.includes(personal.location) &&
                  personal.location
                    ? [personal.location, ...PAKISTAN_CITIES]
                    : PAKISTAN_CITIES
                }
              />
              <CustomSelect
                label="Province"
                value={personal.province}
                onChange={(v) => setPersonal((p) => ({ ...p, province: v }))}
                placeholder="None"
                options={
                  !PAKISTAN_PROVINCES.includes(personal.province) &&
                  personal.province
                    ? [personal.province, ...PAKISTAN_PROVINCES]
                    : PAKISTAN_PROVINCES
                }
              />
              <CustomSelect
                label="Handedness"
                value={personal.handedness}
                onChange={(v) => setPersonal((p) => ({ ...p, handedness: v }))}
                placeholder="Select"
                options={HAND_OPTIONS}
              />
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3">
                <div>
                  <p className="text-xs text-white/45">Public profile</p>
                  <p className="mt-0.5 text-sm text-white/70">
                    Allow others to view your profile
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={personal.isProfilePublic}
                  onClick={() =>
                    setPersonal((p) => ({
                      ...p,
                      isProfilePublic: !p.isProfilePublic,
                    }))
                  }
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                    personal.isProfilePublic
                      ? "bg-[var(--color-primary)]"
                      : "bg-white/15"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                      personal.isProfilePublic ? "left-[1.35rem]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
              <button
                type="submit"
                disabled={savingPersonal}
                className="rounded-full bg-[var(--color-secondary)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {savingPersonal ? "Saving..." : "Save personal details"}
              </button>
            </form>

            {/* Activity */}
            <section className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <FaNewspaper className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                <h2 className="text-sm font-semibold text-white">Activity</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="News posts" value={activity.newsPosts} />
                <Stat label="Post likes" value={activity.newsLikes} />
                <Stat label="Saves" value={activity.newsSaves} />
                <Stat label="Comments" value={activity.newsComments} />
                <Stat label="Comment likes" value={activity.newsCommentLikes} />
                <Stat label="Coach reviews" value={activity.coachReviews} />
              </div>
            </section>

            {/* Coach reviews */}
            <section className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <FaStar className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                <h2 className="text-sm font-semibold text-white">
                  Coach reviews
                </h2>
              </div>
              {reviews.length === 0 ? (
                <p className="text-sm text-white/40">No coach reviews yet.</p>
              ) : (
                <ul className="space-y-3">
                  {reviews.map((review) => (
                    <li
                      key={review.id}
                      className="rounded-xl border border-white/10 bg-[#0e1821] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white">
                          {review.coach
                            ? `${review.coach.firstName} ${review.coach.lastName}`
                            : "Coach"}
                        </p>
                        <span className="text-xs text-[var(--color-primary)]">
                          {review.rating}/5
                        </span>
                      </div>
                      {review.comment && (
                        <p className="mt-1 text-xs text-white/60">
                          {review.comment}
                        </p>
                      )}
                      <p className="mt-2 text-[10px] text-white/30">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Password */}
            <form
              onSubmit={savePassword}
              className="space-y-3 rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4"
            >
              <div className="flex items-center gap-2">
                <FaLock className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                <h2 className="text-sm font-semibold text-white">Password</h2>
              </div>
              <p className="text-[11px] text-white/35">
                Enter your current password, then choose a new one (min. 6
                characters).
              </p>
              <Field
                label="Current password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                onChange={(v) =>
                  setPasswordForm((p) => ({ ...p, currentPassword: v }))
                }
                required
              />
              <Field
                label="New password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                value={passwordForm.newPassword}
                onChange={(v) =>
                  setPasswordForm((p) => ({ ...p, newPassword: v }))
                }
                required
                minLength={6}
              />
              <Field
                label="Confirm new password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={passwordForm.confirmPassword}
                onChange={(v) =>
                  setPasswordForm((p) => ({ ...p, confirmPassword: v }))
                }
                required
                minLength={6}
              />
              {passwordError && (
                <p className="text-sm text-red-400">{passwordError}</p>
              )}
              {passwordMessage && (
                <p className="text-sm text-emerald-400">{passwordMessage}</p>
              )}
              <button
                type="submit"
                disabled={savingPassword}
                className="rounded-full border border-[var(--color-secondary)]/40 px-5 py-2.5 text-sm font-bold text-[var(--color-secondary)] disabled:opacity-60"
              >
                {savingPassword ? "Updating..." : "Change password"}
              </button>
            </form>
          </>
        )}
      </main>

      <BottomNav
        active="profile"
        onChange={(id) => {
          if (id === "home") navigate("/");
          else if (id === "profile") navigate("/profile");
          else navigate(`/${id}`);
        }}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  name,
  autoComplete,
  minLength,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-white/45">{label}</span>
      <div className="relative">
        <input
          name={name}
          type={isPassword && showPassword ? "text" : type}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          min={type === "number" ? 0 : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#0e1821] py-2.5 pl-3 text-sm text-white outline-none"
          style={{ paddingRight: isPassword ? "2.75rem" : "0.75rem" }}
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

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3">
      <p className="text-[11px] text-white/40">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value ?? 0}</p>
    </div>
  );
}

function RankStat({ label, value, icon: Icon }) {
  return (
    <div className="relative rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3 pr-10">
      <Icon className="absolute right-3 top-3 h-4 w-4 text-[var(--color-primary)]" />
      <p className="text-[11px] text-white/40">{label}</p>
      <p className="mt-1 truncate text-lg font-bold text-white">{value ?? 0}</p>
    </div>
  );
}
