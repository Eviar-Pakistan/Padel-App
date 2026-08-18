import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import MatchCard from "../components/MatchCard";
import { getMatches, requestJoinMatch, deleteMatch, switchMatchTeams } from "../api/matches";

const REMIND_KEY = "paddle-match-reminders";

function userIdFromJwt() {
  try {
    const token = localStorage.getItem("accessToken");
    if (!token) return null;
    return Number(JSON.parse(atob(token.split(".")[1])).sub);
  } catch {
    return null;
  }
}

function loadReminders() {
  try {
    return JSON.parse(localStorage.getItem(REMIND_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveReminder(id) {
  const next = { ...loadReminders(), [id]: Date.now() };
  localStorage.setItem(REMIND_KEY, JSON.stringify(next));
}

function toGCalDates(match) {
  const day = String(match.bookingDate).slice(0, 10).replace(/-/g, "");
  const start = String(match.startTime || "00:00").replace(":", "");
  const end = String(match.endTime || "00:00").replace(":", "");
  return `${day}T${start}00/${day}T${end}00`;
}

function addToCalendar(match) {
  const title = encodeURIComponent(
    match.title || `Padel match · ${match.court?.name || "Court"}`
  );
  const details = encodeURIComponent(
    `Padel match at ${match.court?.name || "court"}`
  );
  const location = encodeURIComponent(
    match.court?.address || match.court?.paddleOwner?.organizationName || ""
  );
  const dates = toGCalDates(match);
  window.open(
    `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`,
    "_blank"
  );
}

export default function Matches() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reminders, setReminders] = useState(loadReminders);
  const [joiningId, setJoiningId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [switchingId, setSwitchingId] = useState("");
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

  const removeMatch = async (id) => {
    if (!window.confirm("Delete this match? The court slot will be freed and invited players will be notified.")) {
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
      setMatches((prev) => prev.map((m) => (m.id === id ? data : m)));
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Could not switch teams.");
    } finally {
      setSwitchingId("");
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Matches</h1>
            <p className="text-xs text-white/40">Upcoming and live games</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/matches/new")}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-3.5 py-2 text-xs font-bold text-[var(--color-background)]"
          >
            <FaPlus className="h-3 w-3" />
            Initiate match
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-emerald-400">{message}</p>}

        {loading ? (
          <p className="text-sm text-white/40">Loading matches...</p>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-white/40">
            No matches yet. Initiate one to book a court and invite players.
          </p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((match) => (
              <li key={match.id}>
                <MatchCard
                  match={match}
                  isHost={Number(match.hostUserId) === Number(meId)}
                  reminding={Boolean(reminders[match.id])}
                  deleting={deletingId === match.id}
                  switching={switchingId === match.id}
                  onView={() => navigate(`/matches/${match.id}`)}
                  onRemind={() => {
                    saveReminder(match.id);
                    setReminders(loadReminders());
                    setMessage("Reminder saved. You will see it on this page.");
                  }}
                  onCalendar={() => addToCalendar(match)}
                  onDelete={() => removeMatch(match.id)}
                  onSwitchTeams={(payload) => switchTeams(match.id, payload)}
                />
                {match.isPublic && match.openSlots > 0 && match.lifecycle === "SCHEDULED" && (
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
            ))}
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
