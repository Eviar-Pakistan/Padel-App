import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import LiveScoreBoard from "../components/LiveScoreBoard";
import MatchResultCard from "../components/MatchResultCard";
import { getMatch } from "../api/matches";
import { useMatchLiveSocket } from "../hooks/useMatchLiveSocket";
import { useAuthToken } from "../hooks/useMatchLiveFeed";

export default function LiveMatch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = useAuthToken();
  const [match, setMatch] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMatch(id)
      .then(({ data }) => setMatch(data))
      .catch((err) => {
        const msg = err.response?.data?.message;
        setError(Array.isArray(msg) ? msg.join(", ") : msg || "Match not found.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useMatchLiveSocket({
    matchId: id,
    token,
    enabled: Boolean(id && token),
    onScore: (payload) => payload?.id === id && setMatch(payload),
    onFinished: (payload) => payload?.id === id && setMatch(payload),
  });

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />
      <main className="mx-auto w-full max-w-md space-y-4 px-4 pb-28 pt-20">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/live")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/5"
          >
            <FaArrowLeft className="h-3.5 w-3.5" />
          </button>
          <h1 className="text-lg font-bold text-white">Live scoring</h1>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {loading ? (
          <p className="text-sm text-white/40">Loading score...</p>
        ) : match ? (
          <>
            <LiveScoreBoard match={match} />
            {match.score?.finished && <MatchResultCard match={match} />}
          </>
        ) : null}
      </main>
      <BottomNav
        active="matches"
        onChange={(navId) => {
          if (navId === "home") navigate("/");
          else navigate(`/${navId}`);
        }}
      />
    </div>
  );
}
