import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser } from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import { getLeaderboard } from "../api/auth";

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

function formatPoints(value) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString();
}

const COLS =
  "grid-cols-[1.75rem_minmax(0,1.35fr)_3.4rem_2.3rem_4.4rem] gap-1.5";

function RankMark({ rank }) {
  if (rank === 1) {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-amber-200 to-amber-500 text-[11px] font-black text-amber-950 shadow-[0_0_0_1px_rgba(255,215,0,0.35)]">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-slate-100 to-slate-400 text-[11px] font-black text-slate-800 shadow-[0_0_0_1px_rgba(226,232,240,0.4)]">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-orange-200 to-amber-700 text-[11px] font-black text-amber-950 shadow-[0_0_0_1px_rgba(180,83,9,0.4)]">
        3
      </span>
    );
  }
  return (
    <span className="w-6 text-center text-sm font-bold text-white">{rank}</span>
  );
}

function PlayerAvatar({ player }) {
  const src = mediaUrl(player?.profileImage);
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-white/15"
      />
    );
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/50 ring-1 ring-white/10">
      <FaUser className="h-3 w-3" />
    </span>
  );
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getLeaderboard()
      .then(({ data }) => setPlayers(Array.isArray(data) ? data : []))
      .catch((err) => {
        const msg = err.response?.data?.message;
        setError(
          Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load leaderboard."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />
      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-20">
        <div>
          <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
          <p className="mt-0.5 text-sm font-medium text-[var(--color-primary)]">
            Top players in the community.
          </p>
        </div>

        <div
          className={`mt-5 grid ${COLS} px-2.5 text-[11px] font-semibold text-[var(--color-primary)]`}
        >
          <span>Rank</span>
          <span>Player</span>
          <span className="text-right">Points</span>
          <span className="text-right">Wins</span>
          <span className="text-right">City</span>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {loading ? (
          <p className="mt-6 text-sm text-white/40">Loading leaderboard...</p>
        ) : players.length === 0 ? (
          <p className="mt-6 text-sm text-white/40">No players on the board yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {players.map((player) => {
              const rank = player.listRank;
              return (
                <li
                  key={player.id}
                  className={`grid ${COLS} items-center rounded-xl bg-[#1a2633] px-2.5 py-2.5`}
                >
                  <div className="flex justify-center">
                    <RankMark rank={rank} />
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <PlayerAvatar player={player} />
                    <span className="truncate text-[12px] font-semibold text-white">
                      {player.fullName}
                    </span>
                  </div>
                  <span className="text-right text-[12px] font-bold text-[var(--color-primary)]">
                    {formatPoints(player.points)}
                  </span>
                  <span className="text-right text-[12px] font-semibold text-white">
                    {Number(player.wins) || 0}
                  </span>
                  <span className="truncate text-right text-[11px] text-white/70">
                    {player.location?.trim() || "—"}
                  </span>
                </li>
              );
            })}
          </ul>
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
