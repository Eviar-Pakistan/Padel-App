import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaCheck,
  FaClipboardCheck,
  FaComments,
  FaHome,
  FaSignOutAlt,
  FaTimes,
  FaUser,
} from "react-icons/fa";
import ChatThread from "../../components/ChatThread";
import CustomSelect from "../../components/CustomSelect";
import CourtImagePicker from "../../components/CourtImagePicker";
import PasswordToggleButton from "../../components/PasswordToggleButton";
import {
  acceptRefereeMatch,
  getRefereeMatchConversations,
  getRefereeMatchMessages,
  getRefereeMatches,
  getRefereeMe,
  rejectRefereeMatch,
  sendRefereeMatchMessage,
  updateRefereeMe,
} from "../../api/referee";
import { getCourts } from "../../api/courts";
import {
  PAKISTAN_CITIES,
  PAKISTAN_PROVINCES,
} from "../../constants/pakistanCities";
import { sanitizeFullName, sanitizePhone } from "../../utils/authFields";

const WEEK_DAYS = [
  { value: "MON", label: "Monday" },
  { value: "TUE", label: "Tuesday" },
  { value: "WED", label: "Wednesday" },
  { value: "THU", label: "Thursday" },
  { value: "FRI", label: "Friday" },
  { value: "SAT", label: "Saturday" },
  { value: "SUN", label: "Sunday" },
];

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

function matchChatTitle(c) {
  if (c?.displayTitle) return c.displayTitle;
  const court = c?.court?.name || c?.title || "Match";
  const players = (c?.participants || []).filter((p) => p.status === "ACCEPTED");
  const names = (team) =>
    players
      .filter((p) => (team === 1 ? Number(p.team) === 1 : Number(p.team) !== 1))
      .map((p) => p.user?.fullName)
      .filter(Boolean)
      .join(" / ");
  const a = names(0);
  const b = names(1);
  if (!a && !b) return c?.title || court;
  return `${court} · ${a || "Team A"} vs ${b || "Team B"}`;
}

function refereeIdFromJwt() {
  try {
    const token = localStorage.getItem("refereeAccessToken");
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1])).sub ?? null;
  } catch {
    return null;
  }
}

function lastPreview(match) {
  const m = match.messages?.[0];
  if (!m) return "No messages yet";
  if (m.type === "TEXT") return m.text || "Message";
  if (m.type === "IMAGE") return "Photo";
  if (m.type === "AUDIO") return "Voice message";
  return m.fileName || "File";
}

function RefereeBottomNav({ active, onChange, chatUnread = 0 }) {
  const items = [
    { id: "home", label: "Home", icon: FaHome },
    { id: "chats", label: "Chats", icon: FaComments },
    { id: "profile", label: "Profile", icon: FaUser },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[var(--color-background)]">
      <div className="mx-auto flex w-full max-w-md items-end justify-between px-2 pb-3 pt-2">
        {items.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          const showBadge = id === "chats" && chatUnread > 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <span
                className={`relative flex h-10 w-12 items-center justify-center rounded-xl ${
                  isActive ? "bg-[var(--color-primary)]" : ""
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    isActive
                      ? "text-[var(--color-background)]"
                      : "text-[var(--color-primary)]"
                  }`}
                />
                {showBadge && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {chatUnread > 99 ? "99+" : chatUnread}
                  </span>
                )}
              </span>
              <span
                className={`text-[11px] font-medium ${
                  isActive ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default function RefereeDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(location.state?.tab || "home");
  const [referee, setReferee] = useState(null);
  const [courts, setCourts] = useState([]);
  const [form, setForm] = useState({});
  const [courtIds, setCourtIds] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [matches, setMatches] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [messages, setMessages] = useState([]);
  const [actingId, setActingId] = useState("");
  const [sending, setSending] = useState(false);
  const meId = refereeIdFromJwt();

  const applyReferee = (data) => {
    setReferee(data);
    setForm({
      fullName: data.fullName || "",
      email: data.email || "",
      phoneNumber: data.phoneNumber || "",
      location: data.location || "",
      province: data.province || "",
      hourlyRate: data.hourlyRate != null ? String(data.hourlyRate) : "",
      availableFromDay: data.availableFromDay || "MON",
      availableToDay: data.availableToDay || "SUN",
      availableFromTime: data.availableFromTime || "09:00",
      availableToTime: data.availableToTime || "18:00",
      password: "",
    });
    setCourtIds(
      Array.isArray(data.courts)
        ? data.courts.map((c) => c.courtId || c.court?.id).filter(Boolean)
        : []
    );
  };

  const loadMatches = useCallback(async () => {
    const [mRes, cRes] = await Promise.all([
      getRefereeMatches(),
      getRefereeMatchConversations().catch(() => ({ data: [] })),
    ]);
    setMatches(Array.isArray(mRes.data) ? mRes.data : []);
    setConversations(Array.isArray(cRes.data) ? cRes.data : []);
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      const { data } = await getRefereeMatchConversations();
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      // keep existing list
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      refreshConversations();
    }, 4000);
    return () => clearInterval(t);
  }, [refreshConversations]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meRes, courtsRes] = await Promise.all([
          getRefereeMe(),
          getCourts().catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        applyReferee(meRes.data);
        setCourts(Array.isArray(courtsRes.data) ? courtsRes.data : []);
        await loadMatches();
      } catch {
        if (!cancelled) {
          localStorage.removeItem("refereeAccessToken");
          navigate("/referee/login");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, loadMatches]);

  const pending = useMemo(
    () => matches.filter((m) => m.refereeInviteStatus === "PENDING"),
    [matches]
  );
  const accepted = useMemo(
    () => matches.filter((m) => m.refereeInviteStatus === "ACCEPTED"),
    [matches]
  );
  const chatUnreadConversations = useMemo(
    () =>
      conversations.filter((c) => {
        if (activeChatId && c.id === activeChatId) return false;
        return Number(c.unreadCount) > 0;
      }).length,
    [conversations, activeChatId]
  );

  const respond = async (id, accept) => {
    setActingId(id);
    setError("");
    setMessage("");
    try {
      await (accept ? acceptRefereeMatch(id) : rejectRefereeMatch(id));
      await loadMatches();
      setMessage(accept ? "You accepted this match." : "Request declined.");
      if (accept) setTab("chats");
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Action failed.");
    } finally {
      setActingId("");
    }
  };

  useEffect(() => {
    if (!activeChatId) return undefined;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeChatId ? { ...c, unreadCount: 0 } : c))
    );
    getRefereeMatchMessages(activeChatId)
      .then(({ data }) => setMessages(Array.isArray(data) ? data : []))
      .catch(() => setMessages([]));
    const t = setInterval(() => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        getRefereeMatchMessages(activeChatId, last?.id)
          .then(({ data }) => {
            const list = Array.isArray(data) ? data : [];
            if (!list.length) return;
            setMessages((cur) => {
              const seen = new Set(cur.map((m) => m.id));
              return [...cur, ...list.filter((m) => !seen.has(m.id))];
            });
          })
          .catch(() => {});
        return prev;
      });
    }, 3000);
    return () => clearInterval(t);
  }, [activeChatId]);

  const onSend = async ({ type, text, file, durationSec }) => {
    if (!activeChatId) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("type", type);
      if (text) fd.append("text", text);
      if (file) fd.append("file", file);
      if (durationSec) fd.append("durationSec", String(durationSec));
      const { data } = await sendRefereeMatchMessage(activeChatId, fd);
      setMessages((prev) => [...prev, data]);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Send failed.");
    } finally {
      setSending(false);
    }
  };

  const toggleCourt = (id) => {
    setCourtIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("fullName", form.fullName.trim());
      if (!form.phoneNumber.trim()) {
        throw new Error("Phone number is required.");
      }
      fd.append("phoneNumber", form.phoneNumber.trim());
      fd.append("email", form.email.trim());
      fd.append("location", form.location || "");
      fd.append("province", form.province || "");
      if (form.hourlyRate !== "") {
        fd.append("hourlyRate", String(Number(form.hourlyRate)));
      }
      fd.append("availableFromDay", form.availableFromDay);
      fd.append("availableToDay", form.availableToDay);
      fd.append("availableFromTime", form.availableFromTime);
      fd.append("availableToTime", form.availableToTime);
      fd.append("courtIds", JSON.stringify(courtIds));
      if (form.password?.trim()) fd.append("password", form.password.trim());
      if (imageFile) fd.append("profileImage", imageFile);
      const { data } = await updateRefereeMe(fd);
      applyReferee(data);
      setImageFile(null);
      setMessage("Profile saved.");
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("refereeAccessToken");
    localStorage.removeItem("refereeProfile");
    navigate("/referee/login");
  };

  const activeChat = conversations.find((c) => c.id === activeChatId);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--color-background)] text-white/50">
        Loading...
      </div>
    );
  }

  if (tab === "chats" && activeChat) {
    return (
      <div className="h-dvh overflow-hidden bg-[var(--color-background)] text-white">
        <ChatThread
          group={{
            name: matchChatTitle(activeChat),
            _count: {
              members:
                activeChat.participants?.filter((p) => p.status === "ACCEPTED")
                  .length || 4,
            },
          }}
          messages={messages}
          me={{ kind: "referee", id: meId }}
          onBack={() => {
            setActiveChatId("");
            refreshConversations();
          }}
          onSend={onSend}
          sending={sending}
          headerRight={
            <span className="shrink-0 rounded-full bg-[var(--color-primary)]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-primary)]">
              Match
            </span>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--color-background)] text-white">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#0b1219] px-4 py-3">
        <div className="flex items-center gap-2">
          <FaClipboardCheck className="h-4 w-4 text-[var(--color-primary)]" />
          <p className="text-sm font-bold">Referee Portal</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
        >
          <FaSignOutAlt className="h-3.5 w-3.5" />
          Logout
        </button>
      </header>

      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
        {error && (
          <p className="mb-3 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        {message && (
          <p className="mb-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            {message}
          </p>
        )}

        {tab === "home" && (
          <div className="space-y-4">
            {!referee?.fullName?.trim() && (
              <button
                type="button"
                onClick={() => setTab("profile")}
                className="w-full rounded-2xl border border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 px-4 py-3 text-left"
              >
                <p className="text-sm font-semibold text-white">
                  Complete your profile
                </p>
                <p className="mt-1 text-xs text-white/50">
                  Add your name, photo, location, and courts so you can be
                  assigned to matches.
                </p>
              </button>
            )}
            <h1 className="text-lg font-bold">Match requests</h1>
            {pending.length === 0 ? (
              <p className="text-sm text-white/40">No pending referee requests.</p>
            ) : (
              <ul className="space-y-3">
                {pending.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4"
                  >
                    <p className="text-sm font-semibold">{m.host?.fullName}</p>
                    <p className="mt-1 text-xs text-white/70">
                      {String(m.bookingDate).slice(0, 10)} · {m.startTime} – {m.endTime}
                    </p>
                    <p className="text-xs text-[var(--color-primary)]">{m.court?.name}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={actingId === m.id}
                        onClick={() => respond(m.id, true)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] py-2.5 text-xs font-bold text-[var(--color-background)] disabled:opacity-50"
                      >
                        <FaCheck className="h-3 w-3" />
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={actingId === m.id}
                        onClick={() => respond(m.id, false)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/20 py-2.5 text-xs font-semibold disabled:opacity-50"
                      >
                        <FaTimes className="h-3 w-3" />
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {accepted.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-semibold text-white/80">
                  Upcoming matches
                </h2>
                <ul className="space-y-2">
                  {accepted.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-xl border border-white/10 bg-[var(--color-surface)] px-3 py-3"
                  >
                    <p className="text-sm font-semibold">{m.court?.name}</p>
                    <p className="text-xs text-white/50">
                      {String(m.bookingDate).slice(0, 10)} · {m.startTime}
                      {m.lifecycle === "LIVE" ? " · LIVE" : ""}
                      {m.score?.finished ? " · Finished" : ""}
                    </p>
                    {m.refereeInviteStatus === "ACCEPTED" &&
                      m.lifecycle === "LIVE" &&
                      !m.score?.finished && (
                      <button
                        type="button"
                        onClick={() => navigate(`/referee/matches/${m.id}`)}
                        className="mt-2 w-full rounded-xl bg-[var(--color-primary)] py-2 text-xs font-bold text-[var(--color-background)]"
                      >
                        Score live match
                      </button>
                    )}
                    {m.lifecycle === "COMPLETED" && !m.score?.finished && (
                      <p className="mt-2 text-[11px] font-semibold text-white/45">
                        Match time ended · scoring closed
                      </p>
                    )}
                    {m.score?.finished && !m.needsRefereeRanking && (
                      <p className="mt-2 text-[11px] font-semibold text-[var(--color-primary)]">
                        Result saved
                      </p>
                    )}
                    {m.needsRefereeRanking && (
                      <button
                        type="button"
                        onClick={() => navigate(`/referee/matches/${m.id}`)}
                        className="mt-2 w-full rounded-xl bg-amber-400 py-2 text-xs font-bold text-[var(--color-background)]"
                      >
                        Rank players (required)
                      </button>
                    )}
                  </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === "chats" && (
          <div>
            <h1 className="text-lg font-bold">Chats</h1>
            {conversations.length === 0 ? (
              <p className="mt-3 text-sm text-white/40">
                Match groups appear here after you accept a request.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-white/5">
                {conversations.map((c) => {
                  const unread = Number(c.unreadCount) || 0;
                  return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setActiveChatId(c.id)}
                      className="flex w-full items-center gap-3 py-3 text-left"
                    >
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-[var(--color-primary)]">
                        <FaClipboardCheck className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm ${
                            unread > 0 ? "font-bold text-white" : "font-semibold"
                          }`}
                        >
                          {matchChatTitle(c)}
                        </p>
                        <p
                          className={`truncate text-xs ${
                            unread > 0
                              ? "font-medium text-white/80"
                              : "text-white/45"
                          }`}
                        >
                          {lastPreview(c)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="rounded-full bg-[var(--color-primary)]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-primary)]">
                          Match
                        </span>
                        {unread > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 text-[10px] font-bold text-[var(--color-background)]">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {tab === "profile" && (
          <>
            <p className="mb-4 text-sm text-white/50">
              Add your name, availability, and courts. You can update this
              anytime.
            </p>
            <form onSubmit={save} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-full bg-white/10">
                  {imageFile ? (
                    <img
                      src={URL.createObjectURL(imageFile)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : referee?.profileImage ? (
                    <img
                      src={mediaUrl(referee.profileImage)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[var(--color-primary)]">
                      <FaUser className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <label className="text-xs text-[var(--color-primary)]">
                  Change photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <label className="block text-sm text-white/70">
                Full name
                <input
                  value={form.fullName || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      fullName: sanitizeFullName(e.target.value),
                    }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
                />
              </label>
              <label className="block text-sm text-white/70">
                Phone number (login)
                <input
                  required
                  value={form.phoneNumber || ""}
                  inputMode="tel"
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      phoneNumber: sanitizePhone(e.target.value),
                    }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
                />
              </label>
              <label className="block text-sm text-white/70">
                Email (optional)
                <input
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
                />
              </label>
              <CustomSelect
                label="City"
                value={form.location || ""}
                onChange={(v) => setForm((f) => ({ ...f, location: v }))}
                searchable
                options={PAKISTAN_CITIES}
              />
              <CustomSelect
                label="Province"
                value={form.province || ""}
                onChange={(v) => setForm((f) => ({ ...f, province: v }))}
                options={PAKISTAN_PROVINCES}
              />
              <label className="block text-sm text-white/70">
                Hourly rate (PKR)
                <input
                  type="number"
                  min="0"
                  value={form.hourlyRate || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hourlyRate: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <CustomSelect
                  label="From day"
                  value={form.availableFromDay || ""}
                  onChange={(v) => setForm((f) => ({ ...f, availableFromDay: v }))}
                  allowEmpty={false}
                  options={WEEK_DAYS}
                />
                <CustomSelect
                  label="To day"
                  value={form.availableToDay || ""}
                  onChange={(v) => setForm((f) => ({ ...f, availableToDay: v }))}
                  allowEmpty={false}
                  options={WEEK_DAYS}
                />
                <label className="block text-sm text-white/70">
                  From time
                  <input
                    type="time"
                    value={form.availableFromTime || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, availableFromTime: e.target.value }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
                  />
                </label>
                <label className="block text-sm text-white/70">
                  To time
                  <input
                    type="time"
                    value={form.availableToTime || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, availableToTime: e.target.value }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
                  />
                </label>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-white/70">
                  Courts you are available at
                </p>
                <CourtImagePicker
                  courts={courts}
                  selectedIds={courtIds}
                  onToggle={toggleCourt}
                  layout="scroll"
                  emptyText="No courts available."
                />
              </div>
              <label className="block text-sm text-white/70">
                New password (optional)
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, password: e.target.value }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0e1821] py-2.5 pl-3 pr-11 text-sm text-white outline-none"
                  />
                  <PasswordToggleButton
                    show={showPassword}
                    onClick={() => setShowPassword((s) => !s)}
                  />
                </div>
              </label>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-[var(--color-primary)] py-3 text-sm font-bold text-[var(--color-background)] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save profile"}
              </button>
            </form>
          </>
        )}
      </main>

      <RefereeBottomNav
        active={tab}
        chatUnread={chatUnreadConversations}
        onChange={(id) => {
          setActiveChatId("");
          setTab(id);
        }}
      />
    </div>
  );
}
