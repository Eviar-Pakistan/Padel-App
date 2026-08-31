import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaFlagCheckered, FaUndo } from "react-icons/fa";
import LiveScoreBoard, { teamsFromMatch } from "../../components/LiveScoreBoard";
import MatchRankingModal from "../../components/MatchRankingModal";
import {
  getRefereeMatch,
  scoreRefereeMatch,
  submitRefereeMatchRankings,
} from "../../api/referee";
import { useMatchLiveSocket } from "../../hooks/useMatchLiveSocket";
import { useAuthToken } from "../../hooks/useMatchLiveFeed";

function matchTimeEnded(match) {
  if (!match?.bookingDate || !match.endTime) {
    return match?.lifecycle === "COMPLETED";
  }
  const key = String(match.bookingDate).slice(0, 10);
  const [y, mo, d] = key.split("-").map(Number);
  const [eh, em = 0] = String(match.endTime).split(":").map(Number);
  const [sh, sm = 0] = String(match.startTime || "00:00").split(":").map(Number);
  const start = new Date(y, mo - 1, d, sh, sm, 0, 0);
  let end = new Date(y, mo - 1, d, eh, em, 0, 0);
  if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  return Date.now() >= end.getTime();
}

const ACTIONS = [
  { kind: "POINT", label: "Point" },
  { kind: "ACE", label: "Ace" },
  { kind: "WINNER", label: "Winner" },
  { kind: "ERROR", label: "Error" },
];

export default function RefereeScore() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = useAuthToken("refereeAccessToken");
  const [match, setMatch] = useState(null);
  const [error, setError] = useState("");
  const [rankError, setRankError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rankingBusy, setRankingBusy] = useState(false);
  const [, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);

  const load = () =>
    getRefereeMatch(id)
      .then(({ data }) => setMatch(data))
      .catch((err) => {
        const msg = err.response?.data?.message;
        setError(Array.isArray(msg) ? msg.join(", ") : msg || "Match not found.");
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, [id]);

  useMatchLiveSocket({
    matchId: id,
    token,
    enabled: Boolean(id && token),
    onScore: (payload) => payload?.id === id && setMatch(payload),
    onFinished: (payload) => payload?.id === id && setMatch(payload),
  });

  const { left, right } = teamsFromMatch(match);
  const finished = Boolean(match?.score?.finished) || match?.lifecycle === "COMPLETED";
  const timeEnded = matchTimeEnded(match) || match?.lifecycle === "COMPLETED";
  const canScore = Boolean(match) && match.lifecycle === "LIVE" && !finished && !timeEnded;
  const needsRanking = Boolean(match?.needsRefereeRanking);

  const send = async (kind, team) => {
    if (kind !== "END" && !canScore) return;
    if (kind === "END" && (finished || (!canScore && !timeEnded))) return;
    setBusy(true);
    setError("");
    try {
      const payload = kind === "END" ? { kind: "END" } : { kind, team };
      const { data } = await scoreRefereeMatch(id, payload);
      setMatch(data);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Could not update score.");
    } finally {
      setBusy(false);
    }
  };

  const endMatch = () => {
    const sets = match?.score;
    const summary =
      sets != null
        ? `Current score — Sets ${sets.setA ?? 0}–${sets.setB ?? 0}, Games ${sets.gameA ?? 0}–${sets.gameB ?? 0}. The leading team wins.`
        : "The leading team on sets (then games, then points) will be declared the winner.";
    if (
      !window.confirm(
        `End this match now?\n\n${summary}\n\nPlayers will then rank each other.`
      )
    ) {
      return;
    }
    send("END");
  };

  const onSubmitRankings = async (rankings) => {
    setRankingBusy(true);
    setRankError("");
    try {
      const { data } = await submitRefereeMatchRankings(id, rankings);
      setMatch(data);
    } catch (err) {
      const msg = err.response?.data?.message;
      setRankError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Could not save rankings."
      );
    } finally {
      setRankingBusy(false);
    }
  };

  const teamLabel = (players, fallback) =>
    players.map((p) => p?.user?.fullName).filter(Boolean).join(" & ") || fallback;

  return (
    <div className="min-h-dvh bg-[var(--color-background)] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[var(--color-background)] px-4 py-3">
        <div className="mx-auto flex max-w-md items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/referee")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/5"
          >
            <FaArrowLeft className="h-3.5 w-3.5" />
          </button>
          <div>
            <h1 className="text-base font-bold">Live scoring</h1>
            <p className="text-[11px] text-white/45">
              {match?.court?.name || "Court"} · tap a team to award the rally
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md space-y-4 px-4 pb-10 pt-4">
        {error && <p className="text-sm text-red-400">{error}</p>}
        {loading ? (
          <p className="text-sm text-white/40">Loading match...</p>
        ) : match ? (
          <>
            <LiveScoreBoard match={match} />
            {finished ? (
              <p className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3 text-center text-sm font-semibold text-[var(--color-primary)]">
                {needsRanking
                  ? "Match complete. Rank all 4 players to unlock final points."
                  : match.rankingsComplete
                    ? "Match complete. Rankings saved — points awarded."
                    : "Match complete. Waiting for player rankings before points are awarded."}
              </p>
            ) : timeEnded ? (
              <div className="space-y-3">
                <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white/70">
                  Match time has ended. Scoring is closed — you can still end
                  the match from the current score.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={endMatch}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/90 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  <FaFlagCheckered className="h-3.5 w-3.5" />
                  End match
                </button>
              </div>
            ) : !canScore ? (
              <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white/70">
                Scoring opens when the match goes live.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { team: 0, players: left, title: "Team A" },
                    { team: 1, players: right, title: "Team B" },
                  ].map((side) => (
                    <div
                      key={side.team}
                      className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-3"
                    >
                      <p className="mb-2 truncate text-xs font-bold text-white">
                        {teamLabel(side.players, side.title)}
                      </p>
                      <div className="grid gap-2">
                        {ACTIONS.map((action) => (
                          <button
                            key={action.kind}
                            type="button"
                            disabled={busy}
                            onClick={() => send(action.kind, side.team)}
                            className={`rounded-xl py-2.5 text-xs font-bold disabled:opacity-50 ${
                              action.kind === "POINT"
                                ? "bg-[var(--color-primary)] text-[var(--color-background)]"
                                : "border border-white/15 text-white"
                            }`}
                          >
                            {action.kind === "ERROR"
                              ? `Error (+point other)`
                              : `+ ${action.label}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => send("UNDO")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 py-3 text-sm font-semibold text-white/80 disabled:opacity-50"
                >
                  <FaUndo className="h-3.5 w-3.5" />
                  Undo last point
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={endMatch}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/90 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  <FaFlagCheckered className="h-3.5 w-3.5" />
                  End match
                </button>
                <p className="text-center text-[11px] text-white/40">
                  Deuce at 40–40, then Advantage. Win by 2 points after deuce.
                  First to 6 games (win by 2). Best of 3 sets. Tie-break at 6–6.
                  End match uses the current sets/games lead as the final result.
                </p>
              </>
            )}
          </>
        ) : null}
      </main>

      <MatchRankingModal
        open={needsRanking}
        mode="referee"
        matchTitle={match?.court?.name || "Match"}
        players={match?.rankablePlayers || match?.participants || []}
        onSubmit={onSubmitRankings}
        submitting={rankingBusy}
        error={rankError}
      />
    </div>
  );
}
