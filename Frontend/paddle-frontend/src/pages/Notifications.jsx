import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCheck } from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications";
import { acceptJoinRequest } from "../api/courts";
import { acceptChallenge } from "../api/challenges";
import { acceptMatchInvite, acceptMatchJoin } from "../api/matches";
import { notifyNotificationsChanged } from "../context/NotificationsContext";

const SWIPE_THRESHOLD = 80;

function formatWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function notificationMeta(item) {
  const meta = item?.meta;
  if (!meta || typeof meta !== "object") return null;
  return meta;
}

function SwipeNotificationRow({ item, onMarkedRead, onAccepted }) {
  const navigate = useNavigate();
  const startX = useRef(0);
  const dragging = useRef(false);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [actionError, setActionError] = useState("");

  const meta = notificationMeta(item);
  const canAcceptJoin =
    meta?.action === "ACCEPT_JOIN" &&
    meta?.joinRequestId &&
    !meta?.resolved;
  const canAcceptChallenge =
    meta?.action === "ACCEPT_CHALLENGE" &&
    meta?.challengeId &&
    !meta?.resolved;
  const canAcceptMatch =
    meta?.action === "ACCEPT_MATCH" &&
    meta?.matchId &&
    !meta?.resolved;
  const canAcceptMatchJoin =
    meta?.action === "ACCEPT_MATCH_JOIN" &&
    meta?.joinRequestId &&
    meta?.matchId &&
    !meta?.resolved;
  const canOpenChallengeChat =
    meta?.action === "OPEN_CHALLENGE_CHAT" && meta?.conversationId;
  const canViewChallenges = canAcceptChallenge;
  const canOpenMatch = meta?.action === "OPEN_MATCH" && meta?.matchId;
  const canAccept =
    canAcceptJoin || canAcceptChallenge || canAcceptMatch || canAcceptMatchJoin;

  const reset = () => setOffset(0);

  const markRead = async () => {
    if (item.isRead || busy) {
      reset();
      return;
    }
    setBusy(true);
    try {
      await markNotificationRead(item.id);
      onMarkedRead(item.id);
      notifyNotificationsChanged();
      reset();
    } catch {
      reset();
    } finally {
      setBusy(false);
    }
  };

  const onAccept = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!canAccept || accepting) return;
    setAccepting(true);
    setActionError("");
    try {
      if (canAcceptJoin) {
        await acceptJoinRequest(meta.joinRequestId);
        onAccepted?.(item.id, { kind: "join", joinRequestId: meta.joinRequestId });
      } else if (canAcceptChallenge) {
        await acceptChallenge(meta.challengeId);
        onAccepted?.(item.id, { kind: "challenge", challengeId: meta.challengeId });
      } else if (canAcceptMatch) {
        await acceptMatchInvite(meta.matchId);
        onAccepted?.(item.id, { kind: "match", matchId: meta.matchId });
      } else if (canAcceptMatchJoin) {
        await acceptMatchJoin(meta.matchId, meta.joinRequestId);
        onAccepted?.(item.id, { kind: "match-join", joinRequestId: meta.joinRequestId });
      }
      notifyNotificationsChanged();
      if (!item.isRead) {
        await markNotificationRead(item.id);
        onMarkedRead(item.id);
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      setActionError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Failed to accept request."
      );
    } finally {
      setAccepting(false);
    }
  };

  const onView = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!item.isRead) {
      markNotificationRead(item.id)
        .then(() => {
          onMarkedRead(item.id);
          notifyNotificationsChanged();
        })
        .catch(() => {});
    }
    if (canOpenChallengeChat) {
      navigate(`/chat?dm=${meta.conversationId}`);
      return;
    }
    if (canOpenMatch || canAcceptMatch) {
      navigate(`/matches/${meta.matchId}`);
      return;
    }
    if (canViewChallenges) {
      navigate("/players?tab=challenges");
    }
  };

  const onPointerDown = (e) => {
    if (item.isRead) return;
    if (e.target.closest?.("[data-no-swipe]")) return;
    dragging.current = true;
    startX.current = e.clientX;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragging.current || item.isRead) return;
    const dx = e.clientX - startX.current;
    setOffset(Math.max(-140, Math.min(140, dx)));
  };

  const onPointerUp = async () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (Math.abs(offset) >= SWIPE_THRESHOLD) {
      setOffset(offset > 0 ? 140 : -140);
      await markRead();
    } else {
      reset();
    }
  };

  return (
    <li className="relative overflow-hidden rounded-2xl">
      {!item.isRead && (
        <div className="absolute inset-0 flex items-center justify-between bg-[var(--color-primary)]/20 px-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)]">
            <FaCheck className="h-3 w-3" />
            Mark read
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)]">
            Mark read
            <FaCheck className="h-3 w-3" />
          </span>
        </div>
      )}
      <div
        role="button"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={reset}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !item.isRead && !canAccept) {
            e.preventDefault();
            markRead();
          }
        }}
        style={{ transform: `translateX(${offset}px)` }}
        className={`relative touch-pan-y rounded-2xl border px-4 py-3 transition-colors ${
          item.isRead
            ? "border-white/5 bg-[#0e1821] opacity-70"
            : "border-white/10 bg-[var(--color-surface)]"
        } ${busy ? "pointer-events-none" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-xs font-semibold uppercase tracking-wide ${
              item.isRead ? "text-white/35" : "text-[var(--color-primary)]"
            }`}
          >
            {item.type}
          </p>
          {!item.isRead && (
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" />
          )}
        </div>
        <p className="mt-1 text-sm text-white/90">{item.message}</p>
        {canAccept || canOpenChallengeChat || canOpenMatch ? (
          <div data-no-swipe className="mt-3 flex flex-wrap gap-2">
            {(canViewChallenges || canOpenChallengeChat || canOpenMatch || canAcceptMatch) && (
              <button
                type="button"
                onClick={onView}
                onPointerDown={(e) => e.stopPropagation()}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-white hover:bg-white/5"
              >
                {canOpenChallengeChat ? "Chat" : "View"}
              </button>
            )}
            {canAccept && (
              <button
                type="button"
                disabled={accepting}
                onClick={onAccept}
                onPointerDown={(e) => e.stopPropagation()}
                className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-[var(--color-background)] disabled:opacity-50"
              >
                {accepting ? "Accepting..." : "Accept"}
              </button>
            )}
            {actionError && (
              <p className="w-full text-xs text-red-400">{actionError}</p>
            )}
          </div>
        ) : null}
        <p className="mt-2 text-[11px] text-white/40">
          {formatWhen(item.createdAt)}
          {!item.isRead && !canAccept && (
            <span className="ml-2 text-white/30">· Swipe to mark read</span>
          )}
        </p>
      </div>
    </li>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getNotifications();
      setItems(Array.isArray(data) ? data : []);
      notifyNotificationsChanged();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg)
          ? msg.join(", ")
          : msg || "Failed to load notifications."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onMarkedRead = (id) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const onAccepted = (notificationId) => {
    setItems((prev) =>
      prev.map((n) => {
        if (n.id !== notificationId) return n;
        const meta =
          n.meta && typeof n.meta === "object"
            ? { ...n.meta, resolved: true }
            : n.meta;
        return { ...n, isRead: true, meta };
      })
    );
  };

  const markAll = async () => {
    setMarkingAll(true);
    setError("");
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      notifyNotificationsChanged();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg)
          ? msg.join(", ")
          : msg || "Failed to mark all as read."
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const unread = items.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />
      <main className="mx-auto w-full max-w-md space-y-4 px-4 pb-28 pt-20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/5"
              aria-label="Back"
            >
              <FaArrowLeft className="h-3.5 w-3.5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white">Notifications</h1>
              <p className="text-xs text-white/40">
                {unread > 0 ? `${unread} unread` : "All caught up"}
              </p>
            </div>
          </div>
          {unread > 0 && (
            <button
              type="button"
              disabled={markingAll}
              onClick={markAll}
              className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/5 disabled:opacity-50"
            >
              {markingAll ? "..." : "Mark all read"}
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {loading ? (
          <p className="text-sm text-white/40">Loading notifications...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-white/40">No notifications yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {items.map((item) => (
              <SwipeNotificationRow
                key={item.id}
                item={item}
                onMarkedRead={onMarkedRead}
                onAccepted={onAccepted}
              />
            ))}
          </ul>
        )}
      </main>
      <BottomNav
        active=""
        onChange={(id) => {
          if (id === "home") navigate("/");
          else if (id === "profile") navigate("/profile");
          else if (id === "courts") navigate("/courts");
          else if (id === "bookings") navigate("/bookings");
          else navigate(`/${id}`);
        }}
      />
    </div>
  );
}
