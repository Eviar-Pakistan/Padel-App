import { useState } from "react";
import {
  FaArrowRight,
  FaBell,
  FaCalendarAlt,
  FaCheck,
  FaExchangeAlt,
  FaMapMarkerAlt,
  FaTrash,
  FaTrophy,
  FaUser,
} from "react-icons/fa";

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

export function formatMatchDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatWeekday(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

export function formatTime12(hhmm) {
  if (!hhmm) return "";
  const [hStr, mStr] = String(hhmm).split(":");
  const h = Number(hStr);
  const m = mStr || "00";
  if (Number.isNaN(h)) return hhmm;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${m} ${ampm}`;
}

function playerPlace(player) {
  return player?.location || player?.province || "";
}

function Avatar({ user, accepted }) {
  return (
    <div className="relative mx-auto h-12 w-12">
      <div className="h-10 w-10 overflow-hidden rounded-full bg-white/10 ring-2 ring-white/10">
        {user?.profileImage ? (
          <img
            src={mediaUrl(user.profileImage)}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/35">
            <FaUser className="h-5 w-5" />
          </div>
        )}
      </div>
      {accepted && (
        <span className="absolute -bottom-[-6px] -right-[-6px] flex h-3 w-3 items-center justify-center rounded-full bg-[var(--color-secondary)] text-white">
          <FaCheck className="h-2 w-2" />
        </span>
      )}
    </div>
  );
}

function PlayerSlot({
  participant,
  placeholder,
  onClick,
  selected,
  interactive,
}) {
  const user = participant?.user;
  const accepted = participant?.status === "ACCEPTED";
  const body = (
    <>
      <Avatar user={user} accepted={accepted} />
      <p className="mt-1.5 truncate text-[10px] font-semibold text-white">
        {user?.fullName || placeholder || "Open"}
      </p>
      <p className="truncate text-[10px] text-white/40">
        {user
          ? playerPlace(user)
          : participant?.status === "PENDING"
            ? "Pending"
            : "Spot open"}
      </p>
    </>
  );
  const ring = selected
    ? "ring-2 ring-[var(--color-primary)] bg-[var(--color-primary)]/10"
    : interactive
      ? "hover:bg-white/5"
      : "";
  if (!interactive) {
    return <div className="min-w-0 text-center">{body}</div>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 rounded-xl px-0.5 py-1 text-center transition ${ring}`}
    >
      {body}
    </button>
  );
}

function padTeam(list) {
  const next = list.slice(0, 2);
  while (next.length < 2) next.push(null);
  return next;
}

function splitTeams(players) {
  const hasTeam = players.some((p) => p?.team === 0 || p?.team === 1);
  if (!hasTeam) {
    return {
      left: padTeam(players.slice(0, 2)),
      right: padTeam(players.slice(2, 4)),
    };
  }
  return {
    left: padTeam(players.filter((p) => Number(p.team) !== 1)),
    right: padTeam(players.filter((p) => Number(p.team) === 1)),
  };
}

export default function MatchCard({
  match,
  onView,
  onRemind,
  onCalendar,
  onDelete,
  onSwitchTeams,
  reminding,
  calendared,
  deleting,
  switching,
  isHost,
}) {
  const [selectedUserId, setSelectedUserId] = useState(null);
  const lifecycle = match.lifecycle || "SCHEDULED";
  const live = lifecycle === "LIVE";
  const canSwitch =
    Boolean(isHost && onSwitchTeams) &&
    lifecycle === "SCHEDULED" &&
    match.status !== "CANCELLED";
  const players = (match.participants || []).filter(
    (p) => p.status !== "REJECTED"
  );
  const { left, right } = splitTeams(players);
  const placeholder = match.isPublic ? "Open" : "TBD";

  const handleSlot = (participant, team) => {
    if (!canSwitch || switching) return;
    const userId = participant?.userId;
    if (userId == null) {
      if (selectedUserId == null) return;
      onSwitchTeams({ userId: selectedUserId, team });
      setSelectedUserId(null);
      return;
    }
    if (selectedUserId == null) {
      setSelectedUserId(userId);
      return;
    }
    if (selectedUserId === userId) {
      setSelectedUserId(null);
      return;
    }
    const selected = players.find((p) => p.userId === selectedUserId);
    if (selected && Number(selected.team) === Number(participant.team)) {
      setSelectedUserId(userId);
      return;
    }
    onSwitchTeams({ userId: selectedUserId, swapWithUserId: userId });
    setSelectedUserId(null);
  };

  return (
    <article className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[var(--color-surface)] p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="rounded-md bg-[var(--color-primary)]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-primary)]">
          {match.isPublic ? "Group Match" : "Private Match"}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-primary)]">
          <FaTrophy className="h-3 w-3 text-amber-300" />
          {match.title || match.court?.paddleOwner?.organizationName || "Match"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-[6.6rem] shrink-0 rounded-xl border border-white/10 bg-black/20 px-2.5 py-2">
          <p className="text-xs font-bold leading-tight text-white">
            {formatMatchDate(match.bookingDate)}
          </p>
          <p className="mt-0.5 text-[10px] text-white/55">
            {formatWeekday(match.bookingDate)} • {formatTime12(match.startTime)}
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
            <FaMapMarkerAlt className="h-2.5 w-2.5" />
            {match.court?.name || "Court"}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
            <div className="grid grid-cols-2 gap-1">
              {left.map((p, i) => (
                <PlayerSlot
                  key={p?.id || `l-${i}`}
                  participant={p}
                  placeholder={placeholder}
                  interactive={canSwitch}
                  selected={canSwitch && p?.userId === selectedUserId}
                  onClick={() => handleSlot(p, 0)}
                />
              ))}
            </div>
            <div className="flex flex-col items-center px-0.5">
              {canSwitch && (
                <FaExchangeAlt className="mb-0.5 h-3 w-3 text-[var(--color-primary)]" />
              )}
              <p className="text-xs font-black text-white/70">VS</p>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {right.map((p, i) => (
                <PlayerSlot
                  key={p?.id || `r-${i}`}
                  participant={p}
                  placeholder={placeholder}
                  interactive={canSwitch}
                  selected={canSwitch && p?.userId === selectedUserId}
                  onClick={() => handleSlot(p, 1)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {canSwitch && (
        <p className="mt-2 text-center text-[10px] text-white/45">
          {selectedUserId
            ? "Tap a player on the other team or an empty slot to switch."
            : "Tap a player, then tap the other team to switch sides."}
        </p>
      )}

      {live && (
        <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-wide text-red-400">
          Live now
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        {live && (
          <button
            type="button"
            onClick={onView}
            className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] py-2.5 text-xs font-bold text-[var(--color-background)]"
          >
            View Match
            <FaArrowRight className="h-3 w-3" />
          </button>
        )}
        <button
          type="button"
          onClick={onRemind}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/20 py-2.5 text-xs font-semibold text-white "
        >
          <FaBell className="h-3 w-3" />
          {reminding ? "Reminder set" : "Set Reminder"}
        </button>
        <button
          type="button"
          onClick={onCalendar}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/20 py-2.5 text-xs font-semibold text-white"
        >
          <FaCalendarAlt className="h-3 w-3" />
          {calendared ? "On calendar" : "Add to Calendar"}
        </button>
      </div>
      {isHost && onDelete && (
        <button
          type="button"
          disabled={deleting}
          onClick={onDelete}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-400/30 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
        >
          <FaTrash className="h-3 w-3" />
          {deleting ? "Deleting..." : "Delete match"}
        </button>
      )}
    </article>
  );
}
