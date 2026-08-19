import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import LiveScoreBoard from "../components/LiveScoreBoard";
import { getLiveMatches } from "../api/matches";
import { useMatchLiveFeed, useAuthToken } from "../hooks/useMatchLiveFeed";

export default function LiveMatches() {
  const navigate = useNavigate();
  const token = useAuthToken();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    setError("");
    try {
      const { data } = await getLiveMatches();
      setMatches(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load live matches.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  useMatchLiveFeed({
    matchIds: matches.map((m) => m.id),
    token,
    enabled: matches.length > 0,
    onScore: (payload) => {
      if (!payload?.id) return;
      if (payload.lifecycle && payload.lifecycle !== "LIVE") {
        setExpandedId((id) => (id === payload.id ? null : id));
        setMatches((prev) => prev.filter((m) => m.id !== payload.id));
        return;
      }
      setMatches((prev) => {
        if (prev.some((m) => m.id === payload.id)) {
          return prev.map((m) => (m.id === payload.id ? payload : m));
        }
        return prev;
      });
    },
  });

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />
      <main className="mx-auto w-full max-w-md space-y-4 px-4 pb-28 pt-20">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Live Matches</h1>
            <p className="text-xs text-white/40">
              Tap Watch Live Score to open scoring
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)]">
            <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
            Live
          </span>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {loading ? (
          <p className="text-sm text-white/40">Loading live matches...</p>
        ) : matches.length === 0 ? (
          <p className="text-sm text-white/40">
            No live matches right now. Check back when a court is in play.
          </p>
        ) : (
          <ul className="space-y-3">
            {matches.map((match) => (
              <li key={match.id}>
                <LiveScoreBoard
                  match={match}
                  expandable
                  expanded={expandedId === match.id}
                  onWatch={() =>
                    setExpandedId((current) =>
                      current === match.id ? null : match.id
                    )
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </main>
      <BottomNav
        active="matches"
        onChange={(id) => {
          if (id === "home") navigate("/");
          else navigate(`/${id}`);
        }}
      />
    </div>
  );
}
