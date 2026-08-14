import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import { getMyBookings } from "../api/courts";
import { getMyCoachBookings } from "../api/coaches";

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

function formatSlot(start, end) {
  if (!start) return "";
  return end ? `${start} – ${end}` : start;
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

function formatPrice(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return `PKR ${price}`;
  return `PKR ${n.toLocaleString()}`;
}

function bookingPlayers(b) {
  const players = [
    b.user,
    ...(Array.isArray(b.participants) ? b.participants.map((p) => p.user) : []),
  ].filter(Boolean);
  const seen = new Set();
  return players.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

function PlayerAvatars({ players }) {
  if (!players.length) return null;
  return (
    <div className="mt-3 flex items-center gap-2">
      <div className="flex -space-x-2">
        {players.slice(0, 4).map((p, i) => {
          const src = mediaUrl(p.profileImage);
          return src ? (
            <img
              key={p.id || i}
              src={src}
              alt={p.fullName || ""}
              title={p.fullName || ""}
              className="h-8 w-8 rounded-full border-2 border-[var(--color-surface)] object-cover"
            />
          ) : (
            <span
              key={p.id || i}
              title={p.fullName || ""}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--color-surface)] bg-white/10 text-[10px] font-bold text-white/70"
            >
              {(p.fullName || "?").slice(0, 1).toUpperCase()}
            </span>
          );
        })}
      </div>
      <p className="min-w-0 flex-1 truncate text-xs text-white/50">
        {players.map((p) => p.fullName).filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}

export default function MyBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [courtsRes, coachesRes] = await Promise.all([
          getMyBookings(),
          getMyCoachBookings().catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        const courts = (Array.isArray(courtsRes.data) ? courtsRes.data : []).map(
          (b) => ({ ...b, kind: "court" })
        );
        const coaches = (
          Array.isArray(coachesRes.data) ? coachesRes.data : []
        ).map((b) => ({ ...b, kind: "coach" }));
        const merged = [...courts, ...coaches].sort((a, b) => {
          const da = String(a.bookingDate).slice(0, 10);
          const db = String(b.bookingDate).slice(0, 10);
          if (da !== db) return db.localeCompare(da);
          const ta = a.timeSlot?.startTime || a.startTime || "";
          const tb = b.timeSlot?.startTime || b.startTime || "";
          return ta.localeCompare(tb);
        });
        setBookings(merged);
      } catch (err) {
        const msg = err.response?.data?.message;
        if (!cancelled) {
          setError(
            Array.isArray(msg)
              ? msg.join(", ")
              : msg || "Failed to load bookings."
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

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />
      <main className="mx-auto w-full max-w-md space-y-4 px-4 pb-28 pt-20">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-bold text-white">My Bookings</h1>
          <button
            type="button"
            onClick={() => navigate("/courts")}
            className="rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold text-[var(--color-background)]"
          >
            Book court
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {loading ? (
          <p className="text-sm text-white/40">Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <p className="text-sm text-white/40">
            No bookings yet. Book a court or a coach to get started.
          </p>
        ) : (
          <ul className="space-y-3">
            {bookings.map((b) => {
              if (b.kind === "coach") {
                const coachName = b.coach
                  ? `Coach ${b.coach.firstName} ${b.coach.lastName}`.trim()
                  : "Coach";
                return (
                  <li
                    key={`coach-${b.id}`}
                    className="rounded-2xl border border-white/10 bg-[var(--color-surface)] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {coachName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-white/45">
                          {b.coach?.paddleOwner?.organizationName || "Club"}
                          {b.coach?.paddleOwner?.location
                            ? ` · ${b.coach.paddleOwner.location}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="rounded-full bg-[var(--color-primary)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                          Coach
                        </span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                          {b.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/55">
                      <span>{String(b.bookingDate).slice(0, 10)}</span>
                      <span>
                        {formatTime12(b.startTime)}
                        {b.endTime ? ` – ${formatTime12(b.endTime)}` : ""}
                      </span>
                      <span className="font-semibold text-[var(--color-primary)]">
                        {formatPrice(b.totalPrice)}
                      </span>
                    </div>
                  </li>
                );
              }

              const players = bookingPlayers(b);
              return (
                <li
                  key={`court-${b.id}`}
                  className="rounded-2xl border border-white/10 bg-[var(--color-surface)] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {b.court?.name || "Court"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-white/45">
                        {b.court?.paddleOwner?.organizationName || "Club"}
                        {b.court?.paddleOwner?.location
                          ? ` · ${b.court.paddleOwner.location}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                        Court
                      </span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                        {b.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/55">
                    <span>{String(b.bookingDate).slice(0, 10)}</span>
                    <span>
                      {formatSlot(b.timeSlot?.startTime, b.timeSlot?.endTime)}
                    </span>
                    <span className="font-semibold text-[var(--color-primary)]">
                      {formatPrice(b.totalPrice)}
                    </span>
                    {b.isPublic && (
                      <span>Public · {b.availableSlots} open</span>
                    )}
                  </div>
                  <PlayerAvatars players={players} />
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <BottomNav
        active="bookings"
        onChange={(id) => {
          if (id === "home") navigate("/");
          else if (id === "profile") navigate("/profile");
          else if (id === "courts") navigate("/courts");
          else if (id === "bookings") navigate("/bookings");
          else navigate(`/${id}`);
        }}
      />
    </div>
  );
}
