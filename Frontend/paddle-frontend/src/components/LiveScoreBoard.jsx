import { FaChartBar, FaCheck, FaUser } from "react-icons/fa";

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

export function activePlayers(match) {
  return (match?.participants || []).filter((p) => p.status !== "REJECTED");
}

export function teamsFromMatch(match) {
  const players = activePlayers(match);
  const left = players.filter((p) => Number(p.team) !== 1).slice(0, 2);
  const right = players.filter((p) => Number(p.team) === 1).slice(0, 2);
  while (left.length < 2) left.push(null);
  while (right.length < 2) right.push(null);
  return { left, right };
}

function Avatar({ user, compact }) {
  const size = compact ? "h-9 w-9" : "h-11 w-11";
  return (
    <div className={`relative ${size} shrink-0`}>
      <div className={`${size} overflow-hidden rounded-full bg-white/10 ring-2 ring-white/10`}>
        {user?.profileImage ? (
          <img
            src={mediaUrl(user.profileImage)}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/35">
            <FaUser className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </div>
        )}
      </div>
      {user && (
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[var(--color-primary)] ring-2 ring-[#16301f]" />
      )}
    </div>
  );
}

function TeamCol({ players, align = "left" }) {
  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-2 ${align === "right" ? "items-end" : "items-start"}`}>
      {players.map((p, i) => (
        <div
          key={p?.id || i}
          className={`flex min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}
        >
          <Avatar user={p?.user} compact />
          <p className="truncate text-[11px] font-semibold text-white">
            {p?.user?.fullName || "Open"}
          </p>
        </div>
      ))}
    </div>
  );
}

function StatBar({ label, a, b }) {
  const total = Number(a) + Number(b) || 1;
  const left = (Number(a) / total) * 100;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-white/50">
        <span className="text-white">{a}</span>
        <span>{label}</span>
        <span className="text-white">{b}</span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-[var(--color-primary)]"
          style={{ width: `${left}%` }}
        />
        <div
          className="h-full bg-white/35"
          style={{ width: `${100 - left}%` }}
        />
      </div>
    </div>
  );
}

export default function LiveScoreBoard({
  match,
  onWatch,
  compact = false,
}) {
  const score = match?.score || {};
  const { left, right } = teamsFromMatch(match);
  const live = match?.lifecycle === "LIVE" && !score.finished;

  return (
    <article className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#16301f] p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            live
              ? "bg-red-500 text-white"
              : score.finished
                ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
                : "bg-white/10 text-white/70"
          }`}
        >
          {live ? "LIVE" : score.finished ? "FT" : match?.lifecycle || "Match"}
        </span>
        <span className="text-[11px] font-semibold text-white/55">
          {match?.isPublic ? "Group Doubles" : "Men's Doubles"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <TeamCol players={left} />
        <div className="grid w-[9.5rem] shrink-0 grid-cols-3 gap-1">
          {[
            ["SETS", score.setA ?? 0, score.setB ?? 0],
            ["GAMES", score.gameA ?? 0, score.gameB ?? 0],
            ["POINTS", score.pointsLabelA ?? "0", score.pointsLabelB ?? "0"],
          ].map(([label, a, b]) => (
            <div
              key={label}
              className="rounded-lg bg-black/35 px-1 py-1.5 text-center"
            >
              <p className="text-[8px] font-bold uppercase tracking-wide text-white/40">
                {label}
              </p>
              <p className="text-sm font-black text-[var(--color-primary)]">{a}</p>
              <p className="text-sm font-black text-white">{b}</p>
            </div>
          ))}
        </div>
        <TeamCol players={right} align="right" />
      </div>

      {score.event && (
        <p className="mt-3 text-center text-[11px] font-bold text-[var(--color-primary)]">
          {score.event}
        </p>
      )}

      {!compact && (
        <div className="mt-4 space-y-3">
          <StatBar label="ACES" a={score.aceA || 0} b={score.aceB || 0} />
          <StatBar
            label="WINNERS"
            a={score.winnersA || 0}
            b={score.winnersB || 0}
          />
          <StatBar
            label="ERRORS"
            a={score.errorsA || 0}
            b={score.errorsB || 0}
          />
        </div>
      )}

      {onWatch && (
        <button
          type="button"
          onClick={onWatch}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] py-3 text-sm font-bold text-[var(--color-background)]"
        >
          <FaChartBar className="h-4 w-4" />
          Watch Live Score
        </button>
      )}

      {score.finished && (
        <p className="mt-3 inline-flex w-full items-center justify-center gap-1.5 text-[11px] font-semibold text-[var(--color-primary)]">
          <FaCheck className="h-3 w-3" />
          Match finished
        </p>
      )}
    </article>
  );
}
