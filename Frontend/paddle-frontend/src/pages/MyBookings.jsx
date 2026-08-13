import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import { getMyBookings } from "../api/courts";

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
        const { data } = await getMyBookings();
        if (!cancelled) setBookings(Array.isArray(data) ? data : []);
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
            No bookings yet. Book a court to get started.
          </p>
        ) : (
          <ul className="space-y-3">
            {bookings.map((b) => {
              const players = bookingPlayers(b);
              return (
                <li
                  key={b.id}
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
                    <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                      {b.status}
                    </span>
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
