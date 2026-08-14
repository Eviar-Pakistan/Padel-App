import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaComments, FaUsers } from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import ChatThread from "../components/ChatThread";
import {
  getChatGroups,
  getChatMessages,
  requestJoinChatGroup,
  sendChatMessage,
} from "../api/chat";

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
  const [tab, setTab] = useState("chats");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [joiningId, setJoiningId] = useState("");
  const meId = idFromJwt("accessToken");

  const loadGroups = useCallback(async () => {
    try {
      const { data } = await getChatGroups();
      setGroups(Array.isArray(data) ? data : []);
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

  const active = groups.find((g) => g.id === activeId);
  const myGroups = groups.filter((g) => g.isMember);
  const discover = groups.filter((g) => !g.isMember);

  const loadMessages = useCallback(async (groupId, after) => {
    const { data } = await getChatMessages(groupId, after);
    const list = Array.isArray(data) ? data : [];
    if (after) {
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...prev, ...list.filter((m) => !seen.has(m.id))];
      });
    } else {
      setMessages(list);
    }
  }, []);

  useEffect(() => {
    if (!activeId) return undefined;
    loadMessages(activeId);
    const t = setInterval(() => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        loadMessages(activeId, last?.id);
        return prev;
      });
    }, 3000);
    return () => clearInterval(t);
  }, [activeId, loadMessages]);

  const onSend = async ({ type, text, file, durationSec }) => {
    if (!activeId) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("type", type);
      if (text) fd.append("text", text);
      if (file) fd.append("file", file);
      if (durationSec) fd.append("durationSec", String(durationSec));
      const { data } = await sendChatMessage(activeId, fd);
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

  return (
    <div className="h-dvh overflow-hidden bg-[var(--color-background)]">
      <TopNav />
      <main className="mx-auto flex h-dvh w-full max-w-md flex-col pt-16">
        {active && active.isMember ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <ChatThread
              group={active}
              messages={messages}
              me={{ kind: "user", id: meId }}
              onBack={() => setActiveId("")}
              onSend={onSend}
              sending={sending}
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-24 pt-3">
            <h1 className="text-lg font-bold text-white">Chats</h1>
            <div className="mt-3 flex gap-2">
              {[
                { id: "chats", label: "My groups" },
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
              myGroups.length === 0 ? (
                <p className="mt-6 text-sm text-white/40">
                  You have not joined any groups yet. Open Discover to request access.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-white/5">
                  {myGroups.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(g.id)}
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
      {!active && (
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
