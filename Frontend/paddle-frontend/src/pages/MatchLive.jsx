import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import MatchCard from "../components/MatchCard";
import { getMatch, deleteMatch, switchMatchTeams, setMatchReminder, setMatchCalendar } from "../api/matches";

export default function MatchLive() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [message, setMessage] = useState("");

  const meId = (() => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return null;
      return Number(JSON.parse(atob(token.split(".")[1])).sub);
    } catch {
      return null;
    }
  })();

  const isHost = Number(match?.hostUserId) === Number(meId);

  const removeMatch = async () => {
    if (
      !window.confirm(
        "Delete this match? The court slot will be freed and invited players will be notified."
      )
    ) {
      return;
    }
    setDeleting(true);
    setError("");
    try {
      await deleteMatch(id);
      navigate("/matches");
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Could not delete match.");
      setDeleting(false);
    }
  };

  const switchTeams = async (payload) => {
    setSwitching(true);
    setError("");
    try {
      const { data } = await switchMatchTeams(id, payload);
      setMatch(data);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Could not switch teams.");
    } finally {
      setSwitching(false);
    }
  };

  const toggleRemind = async () => {
    if (!match) return;
    setError("");
    try {
      const { data } = await setMatchReminder(id, !match.reminded);
      setMatch(data);
      setMessage(
        data.reminded
          ? "Reminder set. You will be notified when the match starts."
          : "Reminder removed."
      );
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Could not update reminder.");
    }
  };

  const toggleCalendar = async () => {
    if (!match) return;
    setError("");
    try {
      const on = !match.onCalendar;
      const { data } = await setMatchCalendar(id, on);
      setMatch(data);
      if (on) {
        navigate(`/calendar?date=${String(data.bookingDate).slice(0, 10)}`);
      } else {
        setMessage("Removed from your calendar.");
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Could not update calendar.");
    }
  };

  useEffect(() => {
    getMatch(id)
      .then(({ data }) => setMatch(data))
      .catch((err) => {
        const msg = err.response?.data?.message;
        setError(Array.isArray(msg) ? msg.join(", ") : msg || "Match not found.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />
      <main className="mx-auto w-full max-w-md space-y-4 px-4 pb-28 pt-20">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/matches")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/5"
          >
            <FaArrowLeft className="h-3.5 w-3.5" />
          </button>
          <h1 className="text-lg font-bold text-white">Match</h1>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-emerald-400">{message}</p>}
        {loading ? (
          <p className="text-sm text-white/40">Loading...</p>
        ) : match ? (
          <>
            <MatchCard
              match={match}
              isHost={isHost}
              reminding={Boolean(match.reminded)}
              calendared={Boolean(match.onCalendar)}
              deleting={deleting}
              switching={switching}
              onView={() => navigate(`/live/${id}`)}
              onRemind={toggleRemind}
              onCalendar={toggleCalendar}
              onDelete={removeMatch}
              onSwitchTeams={switchTeams}
            />
            {match.referee && (
              <div className="rounded-2xl border border-white/10 bg-[var(--color-surface)] px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-white/40">
                  Referee
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {match.referee.fullName}
                </p>
                <p className="text-xs text-white/45">
                  {match.refereeInviteStatus === "ACCEPTED"
                    ? "Confirmed"
                    : match.refereeInviteStatus === "PENDING"
                      ? "Invite pending"
                      : "Not confirmed"}
                </p>
              </div>
            )}
            <p className="text-sm text-white/50">
              Chat opens in the Chat tab once players and the referee accept.
            </p>
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
