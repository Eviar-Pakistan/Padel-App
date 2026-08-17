import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaComments, FaUser, FaUserTie, FaUsers } from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import ChatThread from "../components/ChatThread";
import {
  getChatGroups,
  getChatMessages,
  requestJoinChatGroup,
  sendChatMessage,
} from "../api/chat";
import {
  getCoachDmMessages,
  getMyCoachConversations,
  sendCoachDmMessage,
} from "../api/coaches";
import {
  getPlayerConversations,
  getPlayerDmMessages,
  sendPlayerDmMessage,
} from "../api/challenges";

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

function lastPreview(group) {
  const m = group.messages?.[0];
  if (!m) return "No messages yet";
  if (m.type === "TEXT") return m.text || "Message";
  if (m.type === "IMAGE") return "Photo";
  if (m.type === "VIDEO") return "Video";
  if (m.type === "AUDIO") return "Voice message";
  return m.fileName || "File";
}

function idFromJwt(key) {
  try {
    const token = localStorage.getItem(key);
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export default function Chat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState("chats");
  const [groups, setGroups] = useState([]);
  const [coachChats, setCoachChats] = useState([]);
  const [playerChats, setPlayerChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState("");
  const [activeKind, setActiveKind] = useState("group");
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [joiningId, setJoiningId] = useState("");
  const meId = idFromJwt("accessToken");
  const dmId = searchParams.get("dm");

  const loadGroups = useCallback(async () => {
    try {
      const [groupsRes, coachRes, playerRes] = await Promise.all([
        getChatGroups(),
        getMyCoachConversations().catch(() => ({ data: [] })),
        getPlayerConversations().catch(() => ({ data: [] })),
      ]);
      setGroups(Array.isArray(groupsRes.data) ? groupsRes.data : []);
      setCoachChats(Array.isArray(coachRes.data) ? coachRes.data : []);
      setPlayerChats(Array.isArray(playerRes.data) ? playerRes.data : []);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load chats.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (!dmId || loading) return;
    const found = playerChats.find((c) => c.id === dmId);
    if (found) {
      setActiveKind("player");
      setActiveId(dmId);
    }
  }, [dmId, playerChats, loading]);

  const active =
    activeKind === "coach"
      ? coachChats.find((c) => c.id === activeId)
      : activeKind === "player"
        ? playerChats.find((c) => c.id === activeId)
        : groups.find((g) => g.id === activeId);
  const myGroups = groups.filter((g) => g.isMember);
  const discover = groups.filter((g) => !g.isMember);

  const loadMessages = useCallback(
    async (id, after, kind = "group") => {
      const { data } =
        kind === "coach"
          ? await getCoachDmMessages(id, after)
          : kind === "player"
            ? await getPlayerDmMessages(id, after)
            : await getChatMessages(id, after);
      const list = Array.isArray(data) ? data : [];
      if (after) {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...list.filter((m) => !seen.has(m.id))];
        });
      } else {
        setMessages(list);
      }
    },
    []
  );

  useEffect(() => {
    if (!activeId) return undefined;
    loadMessages(activeId, undefined, activeKind);
    const t = setInterval(() => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        loadMessages(activeId, last?.id, activeKind);
        return prev;
      });
    }, 3000);
    return () => clearInterval(t);
  }, [activeId, activeKind, loadMessages]);

  const onSend = async ({ type, text, file, durationSec }) => {
    if (!activeId) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("type", type);
      if (text) fd.append("text", text);
      if (file) fd.append("file", file);
      if (durationSec) fd.append("durationSec", String(durationSec));
      const { data } =
        activeKind === "coach"
          ? await sendCoachDmMessage(activeId, fd)
          : activeKind === "player"
            ? await sendPlayerDmMessage(activeId, fd)
            : await sendChatMessage(activeId, fd);
      setMessages((prev) => [...prev, data]);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Send failed.");
    } finally {
      setSending(false);
    }
  };

  const requestJoin = async (id) => {
    setJoiningId(id);
    setError("");
    try {
      await requestJoinChatGroup(id);
      await loadGroups();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Request failed.");
    } finally {
      setJoiningId("");
    }
  };

  const threadMessages =
    activeKind === "coach"
      ? messages.map((m) => ({
          ...m,
          senderOwnerId: m.senderCoachId,
          senderOwner: m.senderCoach
            ? {
                organizationName: `Coach ${m.senderCoach.firstName} ${m.senderCoach.lastName}`.trim(),
              }
            : null,
        }))
      : messages;

  const showThread =
    active &&
    (activeKind === "coach" ||
      activeKind === "player" ||
      (activeKind === "group" && active.isMember));

  return (
    <div className="h-dvh overflow-hidden bg-[var(--color-background)]">
      <TopNav />
      <main className="mx-auto flex h-dvh w-full max-w-md flex-col pt-16">
        {showThread ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <ChatThread
              group={
                activeKind === "coach"
                  ? {
                      name: active.coach
                        ? `Coach ${active.coach.firstName} ${active.coach.lastName}`.trim()
                        : "Coach",
                      image: active.coach?.profileImage,
                      _count: { members: 2 },
                    }
                  : activeKind === "player"
                    ? {
                        name: active.otherUser?.fullName || "Player",
                        image: active.otherUser?.profileImage,
                        _count: { members: 2 },
                      }
                    : active
              }
              messages={threadMessages}
              me={{ kind: "user", id: meId }}
              onBack={() => {
                setActiveId("");
                setActiveKind("group");
              }}
              onSend={onSend}
              sending={sending}
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-24 pt-3">
            <h1 className="text-lg font-bold text-white">Chats</h1>
            <div className="mt-3 flex gap-2">
              {[
                { id: "chats", label: "My chats" },
                { id: "discover", label: "Discover" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                    tab === t.id
                      ? "bg-[var(--color-primary)] text-[var(--color-background)]"
                      : "bg-white/10 text-white/80"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            {loading ? (
              <p className="mt-6 text-sm text-white/40">Loading chats...</p>
            ) : tab === "chats" ? (
              myGroups.length === 0 &&
              coachChats.length === 0 &&
              playerChats.length === 0 ? (
                <p className="mt-6 text-sm text-white/40">
                  No chats yet. Join a group, book a coach, or accept a player
                  challenge.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-white/5">
                  {playerChats.map((c) => (
                    <li key={`player-${c.id}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveKind("player");
                          setActiveId(c.id);
                        }}
                        className="flex w-full items-center gap-3 py-3 text-left border-b border-white/10"
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#1f2c34]">
                          {c.otherUser?.profileImage ? (
                            <img
                              src={mediaUrl(c.otherUser.profileImage)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[var(--color-primary)]">
                              <FaUser className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {c.otherUser?.fullName || "Player"}
                          </p>
                          <p className="truncate text-xs text-white/45">
                            {lastPreview(c)}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                  {coachChats.map((c) => (
                    <li key={`coach-${c.id}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveKind("coach");
                          setActiveId(c.id);
                        }}
                        className="flex w-full items-center gap-3 py-3 text-left border-b border-white/10"
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#1f2c34]">
                          {c.coach?.profileImage ? (
                            <img
                              src={mediaUrl(c.coach.profileImage)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[var(--color-primary)]">
                              <FaUserTie className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {c.coach
                              ? `Coach ${c.coach.firstName} ${c.coach.lastName}`.trim()
                              : "Coach"}
                          </p>
                          <p className="truncate text-xs text-white/45">
                            {lastPreview(c)}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                  {myGroups.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveKind("group");
                          setActiveId(g.id);
                        }}
                        className="flex w-full items-center gap-3 py-3 text-left border-b border-white/10"
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#1f2c34]">
                          {g.image ? (
                            <img
                              src={mediaUrl(g.image)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-white/40">
                              <FaUsers className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {g.name}
                          </p>
                          <p className="truncate text-xs text-white/45">
                            {lastPreview(g)}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : discover.length === 0 ? (
              <p className="mt-6 text-sm text-white/40">No groups yet.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {discover.map((g) => (
                  <li
                    key={g.id}
                    className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#1f2c34]">
                        {g.image ? (
                          <img
                            src={mediaUrl(g.image)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-white/40">
                            <FaComments className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">{g.name}</p>
                        <p className="text-xs text-white/45">
                          {g.paddleOwner?.organizationName || "Club"}
                          {g._count?.members != null
                            ? ` · ${g._count.members} members`
                            : ""}
                        </p>
                        {g.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-white/55">
                            {g.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3">
                      {g.joinStatus === "PENDING" ? (
                        <span className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70">
                          Request sent
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={joiningId === g.id}
                          onClick={() => requestJoin(g.id)}
                          className="rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold text-[var(--color-background)] disabled:opacity-50"
                        >
                          {joiningId === g.id ? "Sending..." : "Request to join"}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
      {!showThread && (
        <BottomNav
          onChange={(id) => {
            if (id === "home") navigate("/");
            else if (id === "profile") navigate("/profile");
            else navigate(`/${id}`);
          }}
        />
      )}
    </div>
  );
}
