import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import MatchResultCard from "../components/MatchResultCard";
import { getMatchResults } from "../api/matches";

export default function MatchResults() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMatchResults()
      .then(({ data }) => setMatches(Array.isArray(data) ? data : []))
      .catch((err) => {
        const msg = err.response?.data?.message;
        setError(Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load results.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />
      <main className="mx-auto w-full max-w-md space-y-4 px-4 pb-28 pt-20">
        <div>
          <h1 className="text-2xl font-bold text-white">Results</h1>
          <p className="text-xs text-white/40">
            Every finished match, visible to all players
          </p>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {loading ? (
          <p className="text-sm text-white/40">Loading results...</p>
        ) : matches.length === 0 ? (
          <p className="text-sm text-white/40">No completed match results yet.</p>
        ) : (
          <ul className="space-y-3">
            {matches.map((match) => (
              <li key={match.id}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => navigate(`/matches/${match.id}`)}
                >
                  <MatchResultCard match={match} />
                </button>
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
