import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FaCheck,
  FaComments,
  FaStar,
  FaTrophy,
} from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import {
  acceptChallenge,
  getMyChallenges,
  getTopPlayers,
  sendChallenge,
} from "../api/challenges";
import { updateMyProfile } from "../api/auth";
import topPlayerBanner from "../assets/images/top_player_banner.png";

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

function playerLocation(player) {
  const city = player?.location?.trim();
  const province = player?.province?.trim();
  if (city && province) return `${city}, ${province}`;
  return city || province || "Location not set";
}

function formatPoints(value) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString();
}

export default function TopPlayers() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "challenges" ? "challenges" : "players";

  const [players, setPlayers] = useState([]);
  const [mine, setMine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [makingPublic, setMakingPublic] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [playersRes, mineRes] = await Promise.all([
        getTopPlayers(),
        getMyChallenges(),
      ]);
      setPlayers(Array.isArray(playersRes.data) ? playersRes.data : []);
      setMine(mineRes.data || null);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load players."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setTab = (next) => {
    if (next === "challenges") setSearchParams({ tab: "challenges" });
    else setSearchParams({});
  };

  const onChallenge = async (player) => {
    if (!player?.id || busyId) return;
    setBusyId(`send-${player.id}`);
    setError("");
    try {
      await sendChallenge(player.id);
      await load();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Failed to send challenge."
      );
    } finally {
      setBusyId("");
    }
  };

  const onAccept = async (challengeId) => {
    if (!challengeId || busyId) return;
    setBusyId(`accept-${challengeId}`);
    setError("");
    try {
      await acceptChallenge(challengeId);
      await load();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg)
          ? msg.join(", ")
          : msg || "Failed to accept challenge."
      );
    } finally {
      setBusyId("");
    }
  };

  const onMakePublic = async () => {
    setMakingPublic(true);
    setError("");
    try {
      await updateMyProfile({ isProfilePublic: true });
      await load();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg)
          ? msg.join(", ")
          : msg || "Failed to make profile public."
      );
    } finally {
      setMakingPublic(false);
    }
  };

  const incoming = mine?.incoming || [];
  const outgoing = mine?.outgoing || [];
  const accepted = mine?.accepted || [];

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />

      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-20">
        <section className="overflow-hidden rounded-2xl">
          <img
            src={topPlayerBanner}
            alt="Top Players"
            className="h-auto w-full object-cover"
          />
        </section>

        <div className="mt-4 grid grid-cols-2 border-b border-white/10">
          <button
            type="button"
            onClick={() => setTab("players")}
            className={`flex items-center justify-center gap-2 pb-3 text-sm font-semibold ${
              tab === "players"
                ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-b-2 border-transparent text-white"
            }`}
          >
            <FaStar className="h-3.5 w-3.5" />
            Top Players
          </button>
          <button
            type="button"
            onClick={() => setTab("challenges")}
            className={`flex items-center justify-center gap-2 pb-3 text-sm font-semibold ${
              tab === "challenges"
                ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-b-2 border-transparent text-white"
            }`}
          >
            <FaTrophy
              className={`h-3.5 w-3.5 ${
                tab === "challenges" ? "" : "text-white/45"
              }`}
            />
            My Challenges
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        {loading ? (
          <p className="mt-6 text-sm text-white/40">Loading...</p>
        ) : tab === "players" ? (
          players.length === 0 ? (
            <p className="mt-6 text-sm text-white/40">
              No public players are open to challenges yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {players.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  rank={player.listRank}
                  busy={busyId}
                  onChallenge={() => onChallenge(player)}
                  onAccept={() => onAccept(player.challenge?.id)}
                  onChat={() =>
                    navigate(`/chat?dm=${player.challenge?.conversationId}`)
                  }
                />
              ))}
            </ul>
          )
        ) : !mine?.isProfilePublic ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-[var(--color-surface)] p-5 text-center">
            <p className="text-sm leading-relaxed text-white/80">
              To accept challenges, make your profile public first.
            </p>
            <button
              type="button"
              disabled={makingPublic}
              onClick={onMakePublic}
              className="mt-4 rounded-full bg-[var(--color-primary)] px-8 py-2.5 text-sm font-bold text-[var(--color-background)] disabled:opacity-60"
            >
              {makingPublic ? "Updating..." : "OK"}
            </button>
          </div>
        ) : incoming.length === 0 &&
          outgoing.length === 0 &&
          accepted.length === 0 ? (
          <p className="mt-6 text-sm text-white/40">
            No challenges yet. Challenge a top player to get started.
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            {incoming.length > 0 && (
              <ChallengeGroup title="Incoming">
                {incoming.map((item) => (
                  <PlayerRow
                    key={item.id}
                    player={item.otherPlayer}
                    rank={null}
                    challengeOverride={{
                      id: item.id,
                      status: "PENDING",
                      direction: "RECEIVED",
                      conversationId: item.conversationId,
                    }}
                    busy={busyId}
                    onAccept={() => onAccept(item.id)}
                  />
                ))}
              </ChallengeGroup>
            )}
            {outgoing.length > 0 && (
              <ChallengeGroup title="Sent">
                {outgoing.map((item) => (
                  <PlayerRow
                    key={item.id}
                    player={item.otherPlayer}
                    rank={null}
                    challengeOverride={{
                      id: item.id,
                      status: "PENDING",
                      direction: "SENT",
                      conversationId: item.conversationId,
                    }}
                    busy={busyId}
                  />
                ))}
              </ChallengeGroup>
            )}
            {accepted.length > 0 && (
              <ChallengeGroup title="Accepted">
                {accepted.map((item) => (
                  <PlayerRow
                    key={item.id}
                    player={item.otherPlayer}
                    rank={null}
                    challengeOverride={{
                      id: item.id,
                      status: "ACCEPTED",
                      direction: item.direction,
                      conversationId: item.conversationId,
                    }}
                    busy={busyId}
                    onChat={() => navigate(`/chat?dm=${item.conversationId}`)}
                  />
                ))}
              </ChallengeGroup>
            )}
          </div>
        )}
      </main>

      <BottomNav
        onChange={(id) => {
          if (id === "home") navigate("/");
          else if (id === "profile") navigate("/profile");
          else navigate(`/${id}`);
        }}
      />
    </div>
  );
}

function ChallengeGroup({ title, children }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
        {title}
      </h2>
      <ul className="space-y-3">{children}</ul>
    </section>
  );
}

function PlayerRow({
  player,
  rank,
  challengeOverride,
  busy,
  onChallenge,
  onAccept,
  onChat,
}) {
  const challenge = challengeOverride || player?.challenge;
  const avatar = mediaUrl(player?.profileImage);
  const status = challenge?.status;
  const direction = challenge?.direction;

  let action = (
    <button
      type="button"
      disabled={Boolean(busy)}
      onClick={onChallenge}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-bold text-[var(--color-background)] disabled:opacity-60"
    >
      Challenge
      <FaComments className="h-3 w-3" />
    </button>
  );

  if (status === "ACCEPTED" && challenge?.conversationId) {
    action = (
      <button
        type="button"
        onClick={onChat}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-bold text-[var(--color-background)]"
      >
        Chat
        <FaComments className="h-3 w-3" />
      </button>
    );
  } else if (status === "PENDING" && direction === "SENT") {
    action = (
      <span className="shrink-0 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/50">
        Pending
      </span>
    );
  } else if (status === "PENDING" && direction === "RECEIVED") {
    action = (
      <button
        type="button"
        disabled={Boolean(busy)}
        onClick={onAccept}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-bold text-[var(--color-background)] disabled:opacity-60"
      >
        {busy === `accept-${challenge?.id}` ? "Accepting..." : "Accept"}
      </button>
    );
  } else if (busy === `send-${player?.id}`) {
    action = (
      <button
        type="button"
        disabled
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-bold text-[var(--color-background)] opacity-60"
      >
        Sending...
        <FaComments className="h-3 w-3" />
      </button>
    );
  }

  return (
    <li className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-[var(--color-surface)] px-3 py-3">
      {rank != null && (
        <span className="w-6 shrink-0 text-center text-xl font-bold text-[var(--color-primary)]">
          {rank}
        </span>
      )}
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#0e1821]">
        {avatar ? (
          <img src={avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-bold text-[var(--color-primary)]">
            {(player?.fullName || "?").charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-bold text-white">
          <span className="truncate">{player?.fullName}</span>
          <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]">
            <FaCheck className="h-2 w-2 text-[var(--color-background)]" />
          </span>
        </p>
        <p className="truncate text-xs text-white/45">
          {playerLocation(player)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="text-right">
          <p className="text-sm font-bold text-white">
            {formatPoints(player?.points)}
          </p>
          <p className="text-[11px] font-semibold text-[var(--color-primary)]">
            Points
          </p>
        </div>
        {action}
      </div>
    </li>
  );
}
