import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCalendarAlt,
  FaCheck,
  FaComments,
  FaSignOutAlt,
  FaTimes,
  FaUser,
  FaUserTie,
} from "react-icons/fa";
import ChatThread from "../../components/ChatThread";
import CustomSelect from "../../components/CustomSelect";
import PasswordToggleButton from "../../components/PasswordToggleButton";
import {
  acceptCoachBooking,
  getCoachConversationMessages,
  getCoachConversations,
  getCoachMe,
  getCoachPortalBookings,
  rejectCoachBooking,
  sendCoachConversationMessage,
  updateCoachMe,
} from "../../api/coach";

const WEEK_DAYS = [
  { value: "MON", label: "Monday" },
  { value: "TUE", label: "Tuesday" },
  { value: "WED", label: "Wednesday" },
  { value: "THU", label: "Thursday" },
  { value: "FRI", label: "Friday" },
  { value: "SAT", label: "Saturday" },
  { value: "SUN", label: "Sunday" },
];

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

function formatTime12(hhmm) {
  if (!hhmm) return "";
  const [hStr, mStr] = String(hhmm).split(":");
  const h = Number(hStr);
  const m = mStr || "00";
  if (Number.isNaN(h)) return hhmm;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m === "00" ? `${h12} ${ampm}` : `${h12}:${m} ${ampm}`;
}

function coachIdFromJwt() {
  try {
    const token = localStorage.getItem("coachAccessToken");
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1])).sub ?? null;
  } catch {
    return null;
  }
}

function CoachBottomNav({ active, onChange, chatUnread = 0 }) {
  const items = [
    { id: "bookings", label: "Bookings", icon: FaCalendarAlt },
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
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
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

export default function CoachDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("bookings");
  const [coach, setCoach] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [actingId, setActingId] = useState("");
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const meId = coachIdFromJwt();

  const load = useCallback(async () => {
    setError("");
    try {
      const [meRes, bookingsRes, chatsRes] = await Promise.all([
        getCoachMe(),
        getCoachPortalBookings(),
        getCoachConversations(),
      ]);
      setCoach(meRes.data);
      setBookings(Array.isArray(bookingsRes.data) ? bookingsRes.data : []);
      setConversations(Array.isArray(chatsRes.data) ? chatsRes.data : []);
      const c = meRes.data;
      setProfileForm({
        firstName: c.firstName || "",
        lastName: c.lastName || "",
        email: c.email || "",
        phoneNumber: c.phoneNumber || "",
        gender: c.gender || "",
        bio: c.bio || "",
        sessionRate: c.sessionRate != null ? String(c.sessionRate) : "",
        languages: Array.isArray(c.languages) ? c.languages.join(", ") : "",
        specialties: Array.isArray(c.specialties) ? c.specialties.join(", ") : "",
        availableFromDay: c.availableFromDay || "MON",
        availableToDay: c.availableToDay || "FRI",
        availableFromTime: c.availableFromTime || "",
        availableToTime: c.availableToTime || "",
        password: "",
      });
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshConversations = useCallback(async () => {
    try {
      const { data } = await getCoachConversations();
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      // keep existing list
    }
  }, []);

  // Poll for new chat unread counts while on the coach app.
  useEffect(() => {
    const t = setInterval(() => {
      refreshConversations();
    }, 4000);
    return () => clearInterval(t);
  }, [refreshConversations]);

  const pending = useMemo(
    () => bookings.filter((b) => b.status === "PENDING"),
    [bookings]
  );
  const otherBookings = useMemo(
    () => bookings.filter((b) => b.status !== "PENDING"),
    [bookings]
  );
  const activeChat = conversations.find((c) => c.id === activeChatId);

  // Number of conversations that have unread user messages.
  const chatUnreadConversations = useMemo(
    () =>
      conversations.filter((c) => {
        if (activeChatId && c.id === activeChatId) return false;
        return Number(c.unreadCount) > 0;
      }).length,
    [conversations, activeChatId]
  );

  const loadMessages = useCallback(async (id, after) => {
    const { data } = await getCoachConversationMessages(id, after);
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
    if (!activeChatId) return undefined;
    // Clear unread locally as soon as the thread is opened.
    setConversations((prev) =>
      prev.map((c) => (c.id === activeChatId ? { ...c, unreadCount: 0 } : c))
    );
    loadMessages(activeChatId);
    const t = setInterval(() => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        loadMessages(activeChatId, last?.id);
        return prev;
      });
    }, 3000);
    return () => clearInterval(t);
  }, [activeChatId, loadMessages]);

  const respond = async (id, accept) => {
    setActingId(id);
    setError("");
    setMessage("");
    try {
      const { data } = accept
        ? await acceptCoachBooking(id)
        : await rejectCoachBooking(id);
      await load();
      if (accept && data?.conversation?.id) {
        setTab("chats");
        setActiveChatId(data.conversation.id);
        setMessage("Booking accepted. Chat started with the player.");
      } else {
        setMessage(accept ? "Booking accepted." : "Booking rejected.");
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Action failed.");
    } finally {
      setActingId("");
    }
  };

  const onSend = async ({ type, text, file, durationSec }) => {
    if (!activeChatId) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("type", type);
      if (text) fd.append("text", text);
      if (file) fd.append("file", file);
      if (durationSec) fd.append("durationSec", String(durationSec));
      const { data } = await sendCoachConversationMessage(activeChatId, fd);
      setMessages((prev) => [...prev, data]);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Send failed.");
    } finally {
      setSending(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("firstName", profileForm.firstName.trim());
      fd.append("lastName", profileForm.lastName.trim());
      fd.append("email", profileForm.email.trim());
      fd.append("phoneNumber", profileForm.phoneNumber.trim());
      if (profileForm.gender) fd.append("gender", profileForm.gender);
      if (profileForm.bio.trim()) fd.append("bio", profileForm.bio.trim());
      if (profileForm.sessionRate !== "") {
        fd.append("sessionRate", String(Number(profileForm.sessionRate)));
      }
      if (profileForm.availableFromDay) {
        fd.append("availableFromDay", profileForm.availableFromDay);
      }
      if (profileForm.availableToDay) {
        fd.append("availableToDay", profileForm.availableToDay);
      }
      if (profileForm.availableFromTime) {
        fd.append("availableFromTime", profileForm.availableFromTime);
      }
      if (profileForm.availableToTime) {
        fd.append("availableToTime", profileForm.availableToTime);
      }
      if (profileForm.languages.trim()) {
        fd.append(
          "languages",
          JSON.stringify(
            profileForm.languages.split(",").map((s) => s.trim()).filter(Boolean)
          )
        );
      }
      if (profileForm.specialties.trim()) {
        fd.append(
          "specialties",
          JSON.stringify(
            profileForm.specialties
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          )
        );
      }
      if (profileForm.password?.trim()) {
        fd.append("password", profileForm.password.trim());
      }
      if (imageFile) fd.append("profileImage", imageFile);
      const { data } = await updateCoachMe(fd);
      setCoach(data);
      setImageFile(null);
      setMessage("Profile updated.");
      setProfileForm((f) => ({ ...f, password: "" }));
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("coachAccessToken");
    localStorage.removeItem("coachProfile");
    navigate("/coach/login");
  };

  const threadMessages = messages.map((m) => ({
    ...m,
    senderOwnerId: m.senderCoachId,
    senderOwner: m.senderCoach
      ? {
          organizationName: `Coach ${m.senderCoach.firstName} ${m.senderCoach.lastName}`.trim(),
        }
      : null,
  }));

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--color-background)] text-sm text-white/50">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--color-background)] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[var(--color-background)] px-4 py-3">
        <div className="mx-auto flex w-full max-w-md items-center justify-between">
          <div className="flex items-center gap-2">
            <FaUserTie className="h-4 w-4 text-[var(--color-primary)]" />
            <div>
              <p className="text-sm font-bold">
                {coach ? `${coach.firstName} ${coach.lastName}` : "Coach"}
              </p>
              <p className="text-[11px] text-white/45">Coach portal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex h-9 w-9 items-center justify-center rounded-full text-red-300 hover:bg-red-500/10"
            aria-label="Logout"
          >
            <FaSignOutAlt className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
        {error && (
          <p className="mb-3 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        {message && (
          <p className="mb-3 rounded-xl bg-[var(--color-primary)]/10 px-3 py-2 text-sm text-[var(--color-primary)]">
            {message}
          </p>
        )}

        {tab === "bookings" && (
          <div className="space-y-4">
            <h1 className="text-lg font-bold">Booking requests</h1>
            {pending.length === 0 ? (
              <p className="text-sm text-white/40">No pending requests.</p>
            ) : (
              <ul className="space-y-3">
                {pending.map((b) => (
                  <li
                    key={b.id}
                    className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{b.user?.fullName}</p>
                        <p className="text-xs text-white/45">{b.user?.mobileNumber}</p>
                      </div>
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-300">
                        Pending
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-white/70">
                      {String(b.bookingDate).slice(0, 10)} ·{" "}
                      {formatTime12(b.startTime)} – {formatTime12(b.endTime)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[var(--color-primary)]">
                      PKR {Number(b.totalPrice).toLocaleString()}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={actingId === b.id}
                        onClick={() => respond(b.id, true)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] py-2.5 text-xs font-bold text-[var(--color-background)] disabled:opacity-50"
                      >
                        <FaCheck className="h-3 w-3" />
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={actingId === b.id}
                        onClick={() => respond(b.id, false)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/20 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        <FaTimes className="h-3 w-3" />
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {otherBookings.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-semibold text-white/80">
                  Other sessions
                </h2>
                <ul className="space-y-2">
                  {otherBookings.map((b) => (
                    <li
                      key={b.id}
                      className="rounded-xl border border-white/10 bg-[var(--color-surface)] px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{b.user?.fullName}</p>
                        <span className="text-[10px] uppercase text-white/50">
                          {b.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-white/45">
                        {String(b.bookingDate).slice(0, 10)} ·{" "}
                        {formatTime12(b.startTime)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === "chats" && (
          <div className="space-y-3">
            {activeChat ? (
              <div className="fixed inset-0 z-[60] mx-auto flex h-dvh w-full max-w-md flex-col bg-[#0b141a]">
                <ChatThread
                  group={{
                    name: activeChat.user?.fullName || "Player",
                    image: activeChat.user?.profileImage,
                    _count: { members: 2 },
                  }}
                  messages={threadMessages}
                  me={{ kind: "owner", id: meId }}
                  onBack={() => {
                    setActiveChatId("");
                    refreshConversations();
                  }}
                  onSend={onSend}
                  sending={sending}
                />
              </div>
            ) : (
              <>
                <h1 className="text-lg font-bold">Chats</h1>
                {conversations.length === 0 ? (
                  <p className="text-sm text-white/40">
                    Accept a booking to start chatting with a player.
                  </p>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {conversations.map((c) => {
                      const last = c.messages?.[0];
                      const unread = Number(c.unreadCount) || 0;
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => setActiveChatId(c.id)}
                            className="flex w-full items-center gap-3 py-3 text-left"
                          >
                            <div className="relative h-11 w-11 overflow-hidden rounded-full bg-white/10">
                              {c.user?.profileImage ? (
                                <img
                                  src={mediaUrl(c.user.profileImage)}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-white/40">
                                  <FaUser className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className={`truncate text-sm ${
                                  unread > 0 ? "font-bold text-white" : "font-semibold"
                                }`}
                              >
                                {c.user?.fullName || "Player"}
                              </p>
                              <p
                                className={`truncate text-xs ${
                                  unread > 0
                                    ? "font-medium text-white/80"
                                    : "text-white/45"
                                }`}
                              >
                                {last?.text ||
                                  (last?.type === "IMAGE"
                                    ? "Photo"
                                    : last?.type === "AUDIO"
                                      ? "Voice message"
                                      : "Tap to open chat")}
                              </p>
                            </div>
                            {unread > 0 && (
                              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 text-[10px] font-bold text-[var(--color-background)]">
                                {unread > 99 ? "99+" : unread}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        {tab === "profile" && (
          <form onSubmit={saveProfile} className="space-y-3">
            <h1 className="text-lg font-bold">Profile</h1>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 overflow-hidden rounded-full bg-white/10">
                {imageFile ? (
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : coach?.profileImage ? (
                  <img
                    src={mediaUrl(coach.profileImage)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[var(--color-primary)]">
                    <FaUserTie className="h-6 w-6" />
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
            {[
              ["firstName", "First name"],
              ["lastName", "Last name"],
              ["email", "Email"],
              ["phoneNumber", "Phone"],
              ["sessionRate", "Session rate (PKR)"],
              ["languages", "Languages (comma separated)"],
              ["specialties", "Specialties (comma separated)"],
            ].map(([key, label]) => (
              <label key={key} className="block text-sm text-white/70">
                {label}
                <input
                  value={profileForm[key] || ""}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
                />
              </label>
            ))}
            <CustomSelect
              label="Gender"
              value={profileForm.gender || ""}
              onChange={(v) => setProfileForm((f) => ({ ...f, gender: v }))}
              options={GENDER_OPTIONS}
            />
            <label className="block text-sm text-white/70">
              Bio
              <textarea
                rows={3}
                value={profileForm.bio || ""}
                onChange={(e) =>
                  setProfileForm((f) => ({ ...f, bio: e.target.value }))
                }
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <CustomSelect
                label="From day"
                value={profileForm.availableFromDay || ""}
                onChange={(v) =>
                  setProfileForm((f) => ({ ...f, availableFromDay: v }))
                }
                options={WEEK_DAYS}
              />
              <CustomSelect
                label="To day"
                value={profileForm.availableToDay || ""}
                onChange={(v) =>
                  setProfileForm((f) => ({ ...f, availableToDay: v }))
                }
                options={WEEK_DAYS}
              />
              <label className="block text-sm text-white/70">
                From time
                <input
                  type="time"
                  value={profileForm.availableFromTime || ""}
                  onChange={(e) =>
                    setProfileForm((f) => ({
                      ...f,
                      availableFromTime: e.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
                />
              </label>
              <label className="block text-sm text-white/70">
                To time
                <input
                  type="time"
                  value={profileForm.availableToTime || ""}
                  onChange={(e) =>
                    setProfileForm((f) => ({
                      ...f,
                      availableToTime: e.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none"
                />
              </label>
            </div>
            <label className="block text-sm text-white/70">
              New password (optional)
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  value={profileForm.password || ""}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, password: e.target.value }))
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
        )}
      </main>

      {!activeChatId && (
        <CoachBottomNav
          active={tab}
          chatUnread={chatUnreadConversations}
          onChange={(id) => {
            setTab(id);
            setActiveChatId("");
            if (id === "chats") refreshConversations();
          }}
        />
      )}
    </div>
  );
}
