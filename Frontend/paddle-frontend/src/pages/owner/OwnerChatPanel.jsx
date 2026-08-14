import { useCallback, useEffect, useState } from "react";
import { FaPlus, FaUsers } from "react-icons/fa";
import ChatThread from "../../components/ChatThread";
import {
  acceptChatJoinRequest,
  createChatGroup,
  getChatJoinRequests,
  getOwnerChatGroups,
  getOwnerChatMessages,
  rejectChatJoinRequest,
  sendOwnerChatMessage,
} from "../../api/chat";

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

export default function OwnerChatPanel() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [view, setView] = useState("chat");
  const ownerId = idFromJwt("ownerAccessToken");

  const loadGroups = useCallback(async () => {
    try {
      const { data } = await getOwnerChatGroups();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load groups.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const active = groups.find((g) => g.id === activeId);

  const loadMessages = useCallback(async (groupId, after) => {
    const { data } = await getOwnerChatMessages(groupId, after);
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

  const loadRequests = useCallback(async (groupId) => {
    const { data } = await getChatJoinRequests(groupId);
    setRequests(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    if (!activeId) return undefined;
    loadMessages(activeId);
    loadRequests(activeId);
    const t = setInterval(() => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        loadMessages(activeId, last?.id);
        return prev;
      });
      loadRequests(activeId);
    }, 4000);
    return () => clearInterval(t);
  }, [activeId, loadMessages, loadRequests]);

  const onSend = async ({ type, text, file, durationSec }) => {
    if (!activeId) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("type", type);
      if (text) fd.append("text", text);
      if (file) fd.append("file", file);
      if (durationSec) fd.append("durationSec", String(durationSec));
      const { data } = await sendOwnerChatMessage(activeId, fd);
      setMessages((prev) => [...prev, data]);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Send failed.");
    } finally {
      setSending(false);
    }
  };

  const createGroup = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      if (description.trim()) fd.append("description", description.trim());
      if (imageFile) fd.append("image", imageFile);
      const { data } = await createChatGroup(fd);
      setGroups((prev) => [data, ...prev]);
      setName("");
      setDescription("");
      setImageFile(null);
      setShowCreate(false);
      setActiveId(data.id);
      setMessage("Group created.");
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Create failed.");
    } finally {
      setCreating(false);
    }
  };

  const accept = async (requestId) => {
    await acceptChatJoinRequest(activeId, requestId);
    await loadRequests(activeId);
    await loadGroups();
  };

  const reject = async (requestId) => {
    await rejectChatJoinRequest(activeId, requestId);
    await loadRequests(activeId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white md:text-2xl">Chat</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Create groups, approve join requests, and message members
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-3 py-2 text-sm font-bold text-[var(--color-background)]"
        >
          <FaPlus className="h-3.5 w-3.5" />
          New group
        </button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}
      {message && (
        <p className="rounded-xl bg-[var(--color-primary)]/10 px-3 py-2 text-sm text-[var(--color-primary)]">
          {message}
        </p>
      )}

      {showCreate && (
        <form
          onSubmit={createGroup}
          className="space-y-3 rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4"
        >
          <label className="block text-sm text-white/70">
            Group name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
            />
          </label>
          <label className="block text-sm text-white/70">
            Description
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
            />
          </label>
          <label className="block text-sm text-white/70">
            Group photo
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="mt-1.5 block w-full text-xs text-white/60"
            />
          </label>
          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-[var(--color-background)] disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create group"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading groups...</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--color-surface)]">
            {groups.length === 0 ? (
              <p className="px-4 py-6 text-sm text-white/40">No groups yet.</p>
            ) : (
              <ul>
                {groups.map((g) => (
                  <li key={g.id} className="border-b border-white/5 last:border-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveId(g.id);
                        setView("chat");
                      }}
                      className={`flex w-full items-center gap-3 px-3 py-3 text-left ${
                        activeId === g.id ? "bg-white/5" : "hover:bg-white/5"
                      }`}
                    >
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#1f2c34]">
                        {g.image ? (
                          <img
                            src={mediaUrl(g.image)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-white/40">
                            <FaUsers className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-white">
                            {g.name}
                          </p>
                          {g._count?.joinRequests > 0 && (
                            <span className="rounded-full bg-[var(--color-primary)] px-1.5 text-[10px] font-bold text-[var(--color-background)]">
                              {g._count.joinRequests}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-white/45">
                          {lastPreview(g)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="min-h-[32rem] overflow-hidden rounded-2xl border border-white/10">
            {!active ? (
              <div className="flex h-full items-center justify-center bg-[#0b141a] text-sm text-white/40">
                Select a group to open chat
              </div>
            ) : (
              <div className="flex h-full min-h-[32rem] flex-col">
                <div className="flex gap-2 bg-[#1f2c34] px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setView("chat")}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      view === "chat"
                        ? "bg-[#00a884] text-white"
                        : "text-white/70"
                    }`}
                  >
                    Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("requests")}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      view === "requests"
                        ? "bg-[#00a884] text-white"
                        : "text-white/70"
                    }`}
                  >
                    Requests
                    {requests.length > 0 ? ` (${requests.length})` : ""}
                  </button>
                </div>
                {view === "chat" ? (
                  <div className="min-h-0 flex-1">
                    <ChatThread
                      group={active}
                      messages={messages}
                      me={{ kind: "owner", id: ownerId }}
                      onSend={onSend}
                      sending={sending}
                    />
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto bg-[#0b141a] p-4">
                    {requests.length === 0 ? (
                      <p className="text-sm text-white/40">No pending requests.</p>
                    ) : (
                      <ul className="space-y-2">
                        {requests.map((r) => (
                          <li
                            key={r.id}
                            className="flex items-center justify-between gap-3 rounded-xl bg-[#1f2c34] px-3 py-3"
                          >
                            <div>
                              <p className="text-sm font-medium text-white">
                                {r.user?.fullName || "Player"}
                              </p>
                              <p className="text-xs text-white/45">
                                {r.user?.mobileNumber || ""}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => accept(r.id)}
                                className="rounded-lg bg-[#00a884] px-3 py-1.5 text-xs font-bold text-white"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => reject(r.id)}
                                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80"
                              >
                                Reject
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
