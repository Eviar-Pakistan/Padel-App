import { useEffect, useMemo, useState } from "react";
import { FaClipboardCheck, FaTrophy } from "react-icons/fa";
import {
  allocateOwnerMatchReferee,
  getOwnerMatches,
  getReferees,
} from "../../api/owner";
import {
  formatMatchDate,
  formatTime12,
  formatWeekday,
} from "../../components/MatchCard";

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

function refereeLabel(match) {
  if (match.refereeInviteStatus === "ACCEPTED" && match.referee) {
    return match.referee.fullName;
  }
  if (match.refereeInviteStatus === "PENDING" && match.referee) {
    return `${match.referee.fullName} (pending)`;
  }
  if (match.allocateRefereeByOrg) return "Awaiting club allocation";
  if (match.refereeInviteStatus === "REJECTED") return "Referee declined";
  return "No referee";
}

export default function OwnerMatchesPanel() {
  const [matches, setMatches] = useState([]);
  const [referees, setReferees] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [allocatingId, setAllocatingId] = useState("");
  const [picked, setPicked] = useState({});

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [mRes, rRes] = await Promise.all([getOwnerMatches(), getReferees()]);
      setMatches(Array.isArray(mRes.data) ? mRes.data : []);
      setReferees(Array.isArray(rRes.data) ? rRes.data : []);
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

  const visible = useMemo(() => {
    if (filter === "needs") return matches.filter((m) => m.needsReferee);
    if (filter === "assigned") return matches.filter((m) => !m.needsReferee);
    return matches;
  }, [matches, filter]);

  const refsForCourt = (courtId) =>
    referees.filter(
      (r) =>
        r.status === "ACTIVE" &&
        Array.isArray(r.courts) &&
        r.courts.some((c) => c.courtId === courtId || c.court?.id === courtId)
    );

  const onAllocate = async (matchId) => {
    const refereeId = picked[matchId];
    if (!refereeId) {
      setError("Select a referee before allocating.");
      return;
    }
    setAllocatingId(matchId);
    setError("");
    try {
      await allocateOwnerMatchReferee(matchId, refereeId);
      await load();
      setPicked((prev) => {
        const next = { ...prev };
        delete next[matchId];
        return next;
      });
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Allocation failed.");
    } finally {
      setAllocatingId("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white md:text-2xl">Matches</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Matches on your courts — allocate referees when the host asks the club
          to assign one, or when a match still needs a referee.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "All" },
          { id: "needs", label: "Needs referee" },
          { id: "assigned", label: "Has referee" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
              filter === t.id
                ? "bg-[var(--color-primary)] text-[var(--color-background)]"
                : "bg-white/10 text-white/80 hover:bg-white/15"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading matches...</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          {filter === "needs"
            ? "No matches waiting for a referee."
            : filter === "assigned"
              ? "No matches with an assigned referee yet."
              : "No matches on your courts yet."}
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((m) => {
            const courtRefs = refsForCourt(m.courtId || m.court?.id);
            const needs = Boolean(m.needsReferee);
            return (
              <li
                key={m.id}
                className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FaTrophy className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                      <p className="truncate text-sm font-bold text-white">
                        {m.title || `Match · ${m.court?.name || "Court"}`}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          m.lifecycle === "LIVE"
                            ? "bg-red-500/20 text-red-300"
                            : m.lifecycle === "COMPLETED"
                              ? "bg-white/10 text-white/60"
                              : "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                        }`}
                      >
                        {m.lifecycle || m.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-primary)]">
                      {formatWeekday(m.bookingDate)} · {formatMatchDate(m.bookingDate)}{" "}
                      · {formatTime12(m.startTime)}
                      {m.endTime ? ` – ${formatTime12(m.endTime)}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {m.court?.name || "Court"}
                      {m.host?.fullName ? ` · Host ${m.host.fullName}` : ""}
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-white/70">
                      <FaClipboardCheck className="h-3 w-3 text-white/40" />
                      {refereeLabel(m)}
                      {m.allocateRefereeByOrg && needs && (
                        <span className="ml-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          Org allocate
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {needs && (
                  <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:items-center">
                    <select
                      value={picked[m.id] || ""}
                      onChange={(e) =>
                        setPicked((prev) => ({ ...prev, [m.id]: e.target.value }))
                      }
                      className="w-full flex-1 rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-primary)] sm:max-w-xs"
                    >
                      <option value="">Select referee…</option>
                      {courtRefs.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.fullName}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={allocatingId === m.id || !picked[m.id]}
                      onClick={() => onAllocate(m.id)}
                      className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-[var(--color-background)] disabled:opacity-50"
                    >
                      {allocatingId === m.id ? "Allocating..." : "Allocate referee"}
                    </button>
                    {courtRefs.length === 0 && (
                      <p className="text-xs text-amber-300/90">
                        No active referees linked to this court. Add one in Referees.
                      </p>
                    )}
                  </div>
                )}

                {!needs && m.referee && (
                  <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
                    <div className="h-8 w-8 overflow-hidden rounded-full bg-white/10">
                      {m.referee.profileImage ? (
                        <img
                          src={mediaUrl(m.referee.profileImage)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-white/40">
                          <FaClipboardCheck className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-white/60">
                      Assigned · {m.referee.fullName}
                      {m.refereeInviteStatus === "PENDING" ? " (awaiting accept)" : ""}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
