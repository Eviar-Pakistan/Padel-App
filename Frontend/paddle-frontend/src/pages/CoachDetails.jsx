import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaClock,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaStar,
  FaStore,
  FaUserTie,
} from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import { bookCoachSession, getCoach } from "../api/coaches";

const DAY_SHORT = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

function formatPrice(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return null;
  return `PKR ${n.toLocaleString()} / Session`;
}

function formatTime12(hhmm) {
  if (!hhmm) return "";
  const [hStr, mStr] = String(hhmm).split(":");
  const h = Number(hStr);
  const m = mStr || "00";
  if (Number.isNaN(h)) return hhmm;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m === "00" ? `${h12} ${ampm}` : `${h12}:${m} ${ampm}`;
}

function formatAvailability(coach) {
  const fromDay = DAY_SHORT[coach.availableFromDay];
  const toDay = DAY_SHORT[coach.availableToDay];
  const days =
    fromDay && toDay
      ? fromDay === toDay
        ? fromDay
        : `${fromDay} – ${toDay}`
      : fromDay || toDay || "";
  const times =
    coach.availableFromTime && coach.availableToTime
      ? `${formatTime12(coach.availableFromTime)} – ${formatTime12(coach.availableToTime)}`
      : formatTime12(coach.availableFromTime) ||
        formatTime12(coach.availableToTime) ||
        "";
  if (days && times) return `${days}, ${times}`;
  return days || times || "Availability on request";
}

function specialtyList(coach) {
  const s = coach?.specialties;
  if (Array.isArray(s)) return s.filter(Boolean);
  if (typeof s === "string" && s.trim()) {
    return s.split(",").map((x) => x.trim()).filter(Boolean);
  }
  return coach?.certificationLevel ? [coach.certificationLevel] : [];
}

const DAY_ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const JS_TO_WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayInRange(from, to, day) {
  if (!from || !to) return true;
  const a = DAY_ORDER.indexOf(from);
  const b = DAY_ORDER.indexOf(to);
  const d = DAY_ORDER.indexOf(day);
  if (a < 0 || b < 0 || d < 0) return true;
  if (a <= b) return d >= a && d <= b;
  return d >= a || d <= b;
}

function isSlotPast(dateKey, startTime) {
  const todayKey = toDateKey(new Date());
  if (dateKey < todayKey) return true;
  if (dateKey > todayKey) return false;
  const [hStr, mStr = "0"] = String(startTime).split(":");
  const slotMinutes = Number(hStr) * 60 + Number(mStr);
  const now = new Date();
  return slotMinutes <= now.getHours() * 60 + now.getMinutes();
}

function buildDateOptions(coach, days = 14) {
  const out = [];
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const weekday = JS_TO_WEEK[d.getDay()];
    if (!dayInRange(coach.availableFromDay, coach.availableToDay, weekday)) {
      continue;
    }
    out.push({
      key: toDateKey(d),
      weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
      day: d.getDate(),
      month: d.toLocaleDateString(undefined, { month: "short" }),
    });
  }
  return out;
}

function buildTimeSlots(coach, dateKey) {
  const from = coach.availableFromTime || "09:00";
  const to = coach.availableToTime || "18:00";
  const [fh, fm = 0] = from.split(":").map(Number);
  const [th, tm = 0] = to.split(":").map(Number);
  let start = fh * 60 + fm;
  let end = th * 60 + tm;
  if (end <= start) end += 24 * 60;
  const slots = [];
  for (let t = start; t < end; t += 60) {
    const mins = t % (24 * 60);
    const id = `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
    if (!isSlotPast(dateKey, id)) slots.push(id);
  }
  return slots;
}

function DetailRow({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 border-b border-white/5 py-3">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-white/40">
        {label}
      </dt>
      <dd className="text-sm text-white/90">{value}</dd>
    </div>
  );
}

export default function CoachDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [coach, setCoach] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await getCoach(id);
        if (!cancelled) setCoach(data);
      } catch (err) {
        const msg = err.response?.data?.message;
        if (!cancelled) {
          setError(
            Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load coach."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const specialties = useMemo(() => specialtyList(coach), [coach]);
  const languages = useMemo(() => {
    const l = coach?.languages;
    if (Array.isArray(l)) return l.filter(Boolean).join(", ");
    if (typeof l === "string") return l;
    return "";
  }, [coach]);

  const image = mediaUrl(coach?.profileImage);
  const rating = Number(coach?.rating);
  const price = formatPrice(coach?.sessionRate);
  const name = coach ? `Coach ${coach.firstName} ${coach.lastName}`.trim() : "";
  const highlightBook = Boolean(location.state?.book);

  const dates = useMemo(
    () => (coach ? buildDateOptions(coach, 14) : []),
    [coach]
  );

  useEffect(() => {
    if (!dates.length) {
      setSelectedDate("");
      return;
    }
    if (!selectedDate || !dates.some((d) => d.key === selectedDate)) {
      setSelectedDate(dates[0].key);
    }
  }, [dates, selectedDate]);

  const timeSlots = useMemo(
    () => (coach && selectedDate ? buildTimeSlots(coach, selectedDate) : []),
    [coach, selectedDate]
  );

  useEffect(() => {
    if (!timeSlots.length) {
      setSelectedTime("");
      return;
    }
    if (!selectedTime || !timeSlots.includes(selectedTime)) {
      setSelectedTime(timeSlots[0]);
    }
  }, [timeSlots, selectedTime]);

  const bookSession = async () => {
    if (!coach || !selectedDate || !selectedTime) return;
    setBooking(true);
    setError("");
    setMessage("");
    try {
      await bookCoachSession(coach.id, {
        bookingDate: selectedDate,
        startTime: selectedTime,
      });
      setMessage("Session booked.");
      navigate("/bookings");
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Failed to book session."
      );
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />

      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-20">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
        >
          <FaArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        {loading ? (
          <p className="text-sm text-[var(--color-muted)]">Loading coach...</p>
        ) : !coach ? (
          <p className="text-sm text-red-400">{error || "Coach not found."}</p>
        ) : (
          <>
            <section className="rounded-2xl border border-white/10 bg-[var(--color-surface)] px-4 py-3">
              <div className="flex gap-3">
                <div className="relative h-20 w-20 shrink-0">
                  <div className="h-full w-full overflow-hidden rounded-full bg-[#0e1821]">
                    {image ? (
                      <img
                        src={image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[var(--color-primary)]">
                        <FaUserTie className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  {coach.isVerified && (
                    <span className="absolute bottom-0.5 left-0.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-background)] ring-2 ring-[#0a1610]">
                      <FaShieldAlt className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-bold text-white">{name}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="inline-flex items-center gap-1 text-sm font-semibold leading-none text-[var(--color-primary)]">
                      <FaStar className="h-3.5 w-3.5" />
                      {Number.isFinite(rating) && rating > 0
                        ? `${rating.toFixed(1)} (${coach.totalReviews || 0})`
                        : "New"}
                    </p>
                    {price && (
                      <p className="inline-flex rounded-full border border-[var(--color-primary)]/50 px-2.5 py-0.5 text-[11px] font-semibold leading-none text-[var(--color-primary)]">
                        {price}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {coach.bio && (
                <p className="mt-4 text-sm leading-relaxed text-white/70">
                  {coach.bio}
                </p>
              )}
            </section>

            <section
              id="book"
              className={`mt-4 rounded-2xl border p-4 ${
                highlightBook
                  ? "border-[var(--color-primary)]/50 bg-[var(--color-primary)]/5"
                  : "border-white/10 bg-[var(--color-surface)]"
              }`}
            >
              <h2 className="text-sm font-semibold text-white">Book a session</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
                <FaClock className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                {formatAvailability(coach)}
              </p>
              {coach.paddleOwner?.organizationName && (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/55">
                  <FaStore className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                  {coach.paddleOwner.organizationName}
                </p>
              )}
              {coach.paddleOwner?.location && (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/55">
                  <FaMapMarkerAlt className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                  {coach.paddleOwner.location}
                </p>
              )}

              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-white/40">
                Date
              </p>
              {dates.length === 0 ? (
                <p className="mt-2 text-sm text-white/40">
                  No upcoming available days.
                </p>
              ) : (
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {dates.map((d) => {
                    const active = selectedDate === d.key;
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => setSelectedDate(d.key)}
                        className={`shrink-0 rounded-xl px-3 py-2 text-center ${
                          active
                            ? "bg-[var(--color-primary)] text-[var(--color-background)]"
                            : "bg-white/10 text-white/80"
                        }`}
                      >
                        <span className="block text-[10px] font-medium uppercase">
                          {d.weekday}
                        </span>
                        <span className="block text-sm font-bold">{d.day}</span>
                        <span className="block text-[10px]">{d.month}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-white/40">
                Time
              </p>
              {timeSlots.length === 0 ? (
                <p className="mt-2 text-sm text-white/40">
                  No open times for this day.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {timeSlots.map((t) => {
                    const active = selectedTime === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTime(t)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          active
                            ? "bg-[var(--color-primary)] text-[var(--color-background)]"
                            : "bg-white/10 text-white/80"
                        }`}
                      >
                        {formatTime12(t)}
                      </button>
                    );
                  })}
                </div>
              )}

              {error && (
                <p className="mt-3 text-sm text-red-400">{error}</p>
              )}
              {message && (
                <p className="mt-3 text-sm text-[var(--color-primary)]">
                  {message}
                </p>
              )}

              <button
                type="button"
                disabled={booking || !selectedDate || !selectedTime}
                onClick={bookSession}
                className="mt-4 flex w-full items-center justify-center rounded-xl bg-[var(--color-primary)] py-3 text-sm font-bold text-[var(--color-background)] disabled:opacity-50"
              >
                {booking ? "Booking..." : "Book Session"}
              </button>
            </section>

            <section className="mt-4 rounded-2xl border border-white/10 bg-[var(--color-surface)] px-4">
              <dl>
                <DetailRow
                  label="Specialty"
                  value={
                    specialties.length
                      ? specialties.join(", ")
                      : "Padel Coaching"
                  }
                />
                <DetailRow
                  label="Experience"
                  value={
                    coach.yearsOfExperience != null
                      ? `${coach.yearsOfExperience} year${
                          coach.yearsOfExperience === 1 ? "" : "s"
                        }`
                      : ""
                  }
                />
                <DetailRow
                  label="Certification"
                  value={coach.certificationLevel}
                />
                <DetailRow label="Languages" value={languages} />
                <DetailRow label="Nationality" value={coach.nationality} />
              </dl>
            </section>

            {Array.isArray(coach.reviews) && coach.reviews.length > 0 && (
              <section className="mt-4">
                <h2 className="mb-2 text-sm font-semibold text-white">Reviews</h2>
                <ul className="space-y-2">
                  {coach.reviews.map((review) => (
                    <li
                      key={review.id}
                      className="rounded-xl border border-white/10 bg-[var(--color-surface)] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-white">
                          {review.user?.fullName || "Player"}
                        </p>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)]">
                          <FaStar className="h-3 w-3" />
                          {review.rating}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="mt-1 text-xs text-white/55">
                          {review.comment}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
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
