import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaUndo } from "react-icons/fa";
import LiveScoreBoard, { teamsFromMatch } from "../../components/LiveScoreBoard";
import {
  getRefereeMatch,
  scoreRefereeMatch,
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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
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
  const finished = Boolean(match?.score?.finished);
  const timeEnded = matchTimeEnded(match) || match?.lifecycle === "COMPLETED";
  const canScore = Boolean(match) && match.lifecycle === "LIVE" && !finished && !timeEnded;

  const send = async (kind, team) => {
    if (!canScore) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await scoreRefereeMatch(id, { kind, team });
      setMatch(data);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Could not update score.");
    } finally {
      setBusy(false);
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
                Match complete. Winning team received +1 win and +50 points each.
              </p>
            ) : timeEnded ? (
              <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white/70">
                Match time has ended. Scoring is closed.
              </p>
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
                <p className="text-center text-[11px] text-white/40">
                  Golden point at 40–40. First to 6 games (win by 2). Best of 3
                  sets. Tie-break at 6–6.
                </p>
              </>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
