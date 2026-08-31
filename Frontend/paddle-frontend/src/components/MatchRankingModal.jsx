import { useEffect, useMemo, useState } from "react";
import { FaTrophy } from "react-icons/fa";

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

const PEER_LABELS = [
  { rank: 1, label: "Top", points: "+10" },
  { rank: 2, label: "Middle", points: "+5" },
  { rank: 3, label: "Bottom", points: "0" },
];

const REF_LABELS = [
  { rank: 1, label: "Rank 1", points: "+15" },
  { rank: 2, label: "Rank 2", points: "+10" },
  { rank: 3, label: "Rank 3", points: "+5" },
  { rank: 4, label: "Rank 4", points: "0" },
];

/**
 * mode: "peer" | "referee"
 * players: [{ userId, user: { fullName, profileImage } }]
 * excludeUserId: for peer mode, hide self
 */
export default function MatchRankingModal({
  open,
  mode = "peer",
  matchTitle,
  players = [],
  excludeUserId,
  onSubmit,
  submitting,
  error,
}) {
  const targets = useMemo(() => {
    const list = Array.isArray(players) ? players : [];
    if (mode === "peer" && excludeUserId != null) {
      return list.filter((p) => Number(p.userId) !== Number(excludeUserId));
    }
    return list;
  }, [players, mode, excludeUserId]);

  const slots = mode === "referee" ? REF_LABELS.slice(0, targets.length) : PEER_LABELS.slice(0, targets.length);
  const targetKey = targets.map((p) => p.userId).join(",");
  const [order, setOrder] = useState(() => targets.map((p) => p.userId));

  useEffect(() => {
    setOrder(targets.map((p) => p.userId));
  }, [targetKey]);

  if (!open) return null;

  const move = (userId, direction) => {
    setOrder((prev) => {
      const idx = prev.indexOf(userId);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = idx + direction;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const handleSubmit = () => {
    const rankings = order.map((userId, i) => ({
      userId: Number(userId),
      rank: i + 1,
    }));
    onSubmit?.(rankings);
  };

  const byId = Object.fromEntries(targets.map((p) => [p.userId, p]));

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4 shadow-2xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
            <FaTrophy className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-bold text-white">Rank players</h2>
            <p className="text-xs text-white/45">
              {matchTitle || "Match finished"} · required before points are awarded
            </p>
          </div>
        </div>

        <p className="mb-3 text-xs text-white/55">
          {mode === "referee"
            ? "Order all players from best (1) to lowest (4)."
            : "Order the other players: Top, Middle, Bottom."}
        </p>

        <ul className="space-y-2">
          {order.map((userId, index) => {
            const p = byId[userId];
            const slot = slots[index];
            if (!p || !slot) return null;
            return (
              <li
                key={userId}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5"
              >
                <div className="flex w-14 shrink-0 flex-col items-center">
                  <span className="text-xs font-bold text-[var(--color-primary)]">
                    {slot.label}
                  </span>
                  <span className="text-[10px] text-white/40">{slot.points}</span>
                </div>
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/10">
                  {p.user?.profileImage ? (
                    <img
                      src={mediaUrl(p.user.profileImage)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-white/40">
                      {(p.user?.fullName || "?")[0]}
                    </div>
                  )}
                </div>
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                  {p.user?.fullName || `Player ${userId}`}
                </p>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(userId, -1)}
                    className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-white disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={index === order.length - 1}
                    onClick={() => move(userId, 1)}
                    className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-white disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          type="button"
          disabled={submitting || order.length === 0}
          onClick={handleSubmit}
          className="mt-4 w-full rounded-xl bg-[var(--color-primary)] py-3 text-sm font-bold text-[var(--color-background)] disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Submit rankings"}
        </button>
        <p className="mt-2 text-center text-[11px] text-white/35">
          You must rank before this screen closes.
        </p>
      </div>
    </div>
  );
}
