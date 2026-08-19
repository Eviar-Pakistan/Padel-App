import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaPlus } from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import MatchCard from "../components/MatchCard";
import {
  getMatches,
  requestJoinMatch,
  deleteMatch,
  switchMatchTeams,
  setMatchReminder,
  setMatchCalendar,
} from "../api/matches";

function userIdFromJwt() {
  try {
    const token = localStorage.getItem("accessToken");
    if (!token) return null;
    return Number(JSON.parse(atob(token.split(".")[1])).sub);
  } catch {
    return null;
  }
}

export default function Matches() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [joiningId, setJoiningId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [switchingId, setSwitchingId] = useState("");
  const [busyId, setBusyId] = useState("");
  const meId = userIdFromJwt();

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getMatches();
      setMatches(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load matches.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const upcoming = useMemo(
    () =>
      matches.filter(
        (m) => m.lifecycle === "SCHEDULED" || m.lifecycle === "LIVE"
      ),
    [matches]
  );

  const patchMatch = (data) => {
    setMatches((prev) => prev.map((m) => (m.id === data.id ? data : m)));
  };

  const removeMatch = async (id) => {
    if (
      !window.confirm(
        "Delete this match? The court slot will be freed and invited players will be notified."
      )
    ) {
      return;
    }
    setDeletingId(id);
    setError("");
    setMessage("");
    try {
      await deleteMatch(id);
      setMessage("Match deleted. Court and referee are free.");
      await load();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Could not delete match.");
    } finally {
      setDeletingId("");
    }
  };

  const switchTeams = async (id, payload) => {
    setSwitchingId(id);
    setError("");
    try {
      const { data } = await switchMatchTeams(id, payload);
      patchMatch(data);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Could not switch teams.");
    } finally {
      setSwitchingId("");
    }
  };

  const toggleRemind = async (match) => {
    setBusyId(match.id);
    setError("");
    try {
      const { data } = await setMatchReminder(match.id, !match.reminded);
      patchMatch(data);
      setMessage(
        data.reminded
          ? "Reminder set. You will be notified when the match starts."
          : "Reminder removed."
      );
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Could not update reminder.");
    } finally {
      setBusyId("");
    }
  };

  const toggleCalendar = async (match) => {
    setBusyId(match.id);
    setError("");
    try {
      const on = !match.onCalendar;
      const { data } = await setMatchCalendar(match.id, on);
      patchMatch(data);
      if (on) {
        const day = String(data.bookingDate).slice(0, 10);
        navigate(`/calendar?date=${day}`);
      } else {
        setMessage("Removed from your calendar.");
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Could not update calendar.");
    } finally {
      setBusyId("");
    }
  };

  const joinPublic = async (id) => {
    setJoiningId(id);
    setError("");
    setMessage("");
    try {
      await requestJoinMatch(id);
      setMessage("Join request sent to the match host.");
      await load();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Could not join.");
    } finally {
      setJoiningId("");
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />
      <main className="mx-auto w-full max-w-md space-y-4 px-4 pb-28 pt-20">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-white">Matches</h1>
            <p className="text-xs text-white/40">
              All upcoming games · set a reminder or add to your calendar
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => navigate("/calendar")}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-white"
            >
              <FaCalendarAlt className="h-3 w-3" />
              Calendar
            </button>
            <button
              type="button"
              onClick={() => navigate("/matches/new")}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-3.5 py-2 text-xs font-bold text-[var(--color-background)]"
            >
              <FaPlus className="h-3 w-3" />
              Initiate
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-emerald-400">{message}</p>}

        {loading ? (
          <p className="text-sm text-white/40">Loading matches...</p>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-white/40">
            No upcoming or live matches. Past results are on your profile.
          </p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((match) => {
              const isHost = Number(match.hostUserId) === Number(meId);
              const alreadyIn = (match.participants || []).some(
                (p) =>
                  Number(p.userId) === Number(meId) && p.status !== "REJECTED"
              );
              const canRequestJoin =
                match.isPublic &&
                match.openSlots > 0 &&
                match.lifecycle === "SCHEDULED" &&
                !isHost &&
                !alreadyIn;
              return (
                <li key={match.id}>
                  <MatchCard
                    match={match}
                    isHost={isHost}
                    reminding={Boolean(match.reminded)}
                    calendared={Boolean(match.onCalendar)}
                    deleting={deletingId === match.id}
                    switching={switchingId === match.id}
                    onView={() => navigate(`/live/${match.id}`)}
                    onRemind={() => busyId !== match.id && toggleRemind(match)}
                    onCalendar={() => busyId !== match.id && toggleCalendar(match)}
                    onDelete={() => removeMatch(match.id)}
                    onSwitchTeams={(payload) => switchTeams(match.id, payload)}
                  />
                  {canRequestJoin && (
                    <button
                      type="button"
                      disabled={joiningId === match.id}
                      onClick={() => joinPublic(match.id)}
                      className="mt-2 w-full rounded-xl border border-white/10 py-2 text-xs font-semibold text-white/80 hover:bg-white/5 disabled:opacity-50"
                    >
                      {joiningId === match.id
                        ? "Sending..."
                        : `Request to join · ${match.openSlots} spot${match.openSlots === 1 ? "" : "s"} open`}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <BottomNav
        active="matches"
        onChange={(id) => {
          if (id === "home") navigate("/");
          else if (id === "profile") navigate("/profile");
          else navigate(`/${id}`);
        }}
      />
    </div>
  );
}
