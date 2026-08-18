import { FaCalendarAlt, FaTrophy } from "react-icons/fa";
import { formatMatchDate } from "./MatchCard";
import { teamsFromMatch } from "./LiveScoreBoard";

function names(players) {
  return players
    .map((p) => p?.user?.fullName)
    .filter(Boolean)
    .join(" / ");
}

export default function MatchResultCard({ match }) {
  const score = match?.score || {};
  const { left, right } = teamsFromMatch(match);
  const winnerIsLeft = Number(match?.winnerTeam) !== 1;
  const winners = winnerIsLeft ? left : right;
  const losers = winnerIsLeft ? right : left;
  const sets = score.setsLabel || "";

  return (
    <article className="rounded-[1.4rem] border border-[var(--color-primary)]/35 bg-[#16301f] px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-2 text-[11px] text-white/50">
        <span className="inline-flex items-center gap-1.5">
          <FaCalendarAlt className="h-3 w-3 text-[var(--color-primary)]" />
          <FaTrophy className="h-3 w-3 text-[var(--color-primary)]" />
          {match?.isPublic ? "Group Doubles" : "Men's Doubles"}
        </span>
        <span>{formatMatchDate(match?.bookingDate)}</span>
      </div>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-background)]">
          <FaTrophy className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">
            {names(winners) || "Winning team"}
          </p>
          <p className="mt-1 text-xs font-semibold text-[var(--color-primary)]">
            def.
          </p>
          <p className="mt-1 text-sm font-medium text-white/45">
            {names(losers) || "Opponents"}
          </p>
        </div>
      </div>
      {sets ? (
        <p className="mx-auto mt-4 w-fit rounded-full border border-[var(--color-primary)]/50 px-4 py-1.5 text-sm font-bold text-[var(--color-primary)]">
          {sets}
        </p>
      ) : null}
    </article>
  );
}
