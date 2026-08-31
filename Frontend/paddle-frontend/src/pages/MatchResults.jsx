import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaStar } from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import MatchResultCard from "../components/MatchResultCard";
import MatchRankingModal from "../components/MatchRankingModal";
import RefereeReviewModal from "../components/RefereeReviewModal";
import {
  getMatchResults,
  submitMatchPeerRankings,
  submitMatchRefereeReview,
} from "../api/matches";

function idFromJwt() {
  try {
    const token = localStorage.getItem("accessToken");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export default function MatchResults() {
  const navigate = useNavigate();
  const meId = idFromJwt();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rankError, setRankError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewMatchId, setReviewMatchId] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getMatchResults()
      .then(({ data }) => setMatches(Array.isArray(data) ? data : []))
      .catch((err) => {
        const msg = err.response?.data?.message;
        setError(Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load results.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingRankMatch = useMemo(
    () => matches.find((m) => m.needsMyPeerRanking),
    [matches]
  );

  // Only open when the user taps Review (or we keep the selected match after load).
  const reviewMatch = useMemo(
    () =>
      reviewMatchId
        ? matches.find((m) => m.id === reviewMatchId) || null
        : null,
    [matches, reviewMatchId]
  );

  const onSubmitRankings = async (rankings) => {
    if (!pendingRankMatch) return;
    setSubmitting(true);
    setRankError("");
    try {
      await submitMatchPeerRankings(pendingRankMatch.id, rankings);
      await load();
    } catch (err) {
      const msg = err.response?.data?.message;
      setRankError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Could not save rankings."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitRefereeReview = async ({ rating, comment }) => {
    if (!reviewMatch) return;
    setReviewSubmitting(true);
    setReviewError("");
    try {
      await submitMatchRefereeReview(reviewMatch.id, { rating, comment });
      setReviewMatchId("");
      await load();
    } catch (err) {
      const msg = err.response?.data?.message;
      setReviewError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Could not save review."
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />
      <main className="mx-auto w-full max-w-md space-y-4 px-4 pb-28 pt-20">
        <div>
          <h1 className="text-2xl font-bold text-white">Results</h1>
          <p className="text-xs text-white/40">
            Finished matches. Rank other players after each match you played,
            then leave a review for the referee. Points are awarded when
            everyone (and the referee) has ranked.
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
                {match.needsMyPeerRanking && (
                  <p className="mt-1 px-1 text-xs font-medium text-amber-300">
                    You still need to rank players for this match.
                  </p>
                )}
                {match.needsMyRefereeReview && (
                  <button
                    type="button"
                    onClick={() => {
                      setReviewError("");
                      setReviewMatchId(match.id);
                    }}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] py-2.5 text-xs font-bold text-[var(--color-background)]"
                  >
                    <FaStar className="h-3.5 w-3.5" />
                    Review referee
                    {match.referee?.fullName
                      ? ` · ${match.referee.fullName}`
                      : ""}
                  </button>
                )}
                {match.myRefereeReview && (
                  <p className="mt-1 px-1 text-xs text-[var(--color-primary)]">
                    You rated the referee {match.myRefereeReview.rating}/5
                    {match.myRefereeReview.comment
                      ? ` · “${match.myRefereeReview.comment}”`
                      : ""}
                  </p>
                )}
                {match.rankingsComplete &&
                  match.rankablePlayers?.some(
                    (p) => Number(p.userId) === Number(meId) && p.pointsAwarded != null
                  ) && (
                    <p className="mt-1 px-1 text-xs text-[var(--color-primary)]">
                      You earned{" "}
                      {
                        match.rankablePlayers.find(
                          (p) => Number(p.userId) === Number(meId)
                        )?.pointsAwarded
                      }{" "}
                      points from this match.
                    </p>
                  )}
              </li>
            ))}
          </ul>
        )}
      </main>

      <MatchRankingModal
        open={Boolean(pendingRankMatch)}
        mode="peer"
        matchTitle={
          pendingRankMatch?.title ||
          pendingRankMatch?.court?.name ||
          "Match"
        }
        players={pendingRankMatch?.rankablePlayers || pendingRankMatch?.participants || []}
        excludeUserId={meId}
        onSubmit={onSubmitRankings}
        submitting={submitting}
        error={rankError}
      />

      <RefereeReviewModal
        open={Boolean(reviewMatch) && !pendingRankMatch}
        referee={reviewMatch?.referee}
        matchTitle={
          reviewMatch?.title || reviewMatch?.court?.name || "Match"
        }
        onClose={() => {
          setReviewMatchId("");
          setReviewError("");
        }}
        onSubmit={onSubmitRefereeReview}
        submitting={reviewSubmitting}
        error={reviewError}
      />

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
