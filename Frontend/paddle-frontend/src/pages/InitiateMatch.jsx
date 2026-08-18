import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCheck, FaClipboardCheck, FaUser } from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import {
  createMatch,
  getMatchPlayers,
  getMatchReferees,
} from "../api/matches";
import { getCourtAvailability, getCourts } from "../api/courts";

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

function courtImage(court) {
  const imgs = Array.isArray(court?.images) ? court.images : [];
  const first = imgs[0];
  const path = typeof first === "string" ? first : first?.url;
  return mediaUrl(path || court?.image);
}

function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildDateOptions(days = 14) {
  const out = [];
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    out.push({
      key: toDateKey(d),
      weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
      day: d.getDate(),
      month: d.toLocaleDateString(undefined, { month: "short" }),
    });
  }
  return out;
}

function formatSlotLabel(hhmm) {
  if (!hhmm) return "";
  const [hStr, mStr] = hhmm.split(":");
  let h = Number(hStr);
  const m = mStr || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${m} ${ampm}`;
}

function isSlotPast(dateKey, startTime) {
  if (!dateKey || !startTime) return false;
  const todayKey = toDateKey(new Date());
  if (dateKey < todayKey) return true;
  if (dateKey > todayKey) return false;
  const [hStr, mStr = "0"] = String(startTime).split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const now = new Date();
  return h * 60 + m <= now.getHours() * 60 + now.getMinutes();
}

export default function InitiateMatch() {
  const navigate = useNavigate();
  const dates = useMemo(() => buildDateOptions(), []);
  const [step, setStep] = useState(1);
  const [courts, setCourts] = useState([]);
  const [players, setPlayers] = useState([]);
  const [referees, setReferees] = useState([]);
  const [selectedDate, setSelectedDate] = useState(dates[0]?.key || "");
  const [selectedCourtId, setSelectedCourtId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [playerIds, setPlayerIds] = useState([]);
  const [allowJoin, setAllowJoin] = useState(false);
  const [refereeId, setRefereeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedCourt = courts.find((c) => c.id === selectedCourtId);
  const selectedSlot = slots.find((s) => s.id === selectedSlotId);
  const remaining = Math.max(0, 3 - playerIds.length);

  useEffect(() => {
    Promise.all([getCourts(), getMatchPlayers()])
      .then(([cRes, pRes]) => {
        setCourts(Array.isArray(cRes.data) ? cRes.data : []);
        setPlayers(Array.isArray(pRes.data) ? pRes.data : []);
      })
      .catch(() => setError("Failed to load courts or players."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCourtId || !selectedDate) {
      setSlots([]);
      setSelectedSlotId("");
      return;
    }
    setLoadingSlots(true);
    getCourtAvailability(selectedCourtId, selectedDate)
      .then(({ data }) => {
        setSlots(Array.isArray(data?.slots) ? data.slots : []);
        setSelectedSlotId("");
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedCourtId, selectedDate]);

  useEffect(() => {
    if (step !== 3 || !selectedCourtId || !selectedDate || !selectedSlot) {
      return;
    }
    getMatchReferees({
      courtId: selectedCourtId,
      date: selectedDate,
      startTime: selectedSlot.startTime,
    })
      .then(({ data }) => setReferees(Array.isArray(data) ? data : []))
      .catch(() => setReferees([]));
  }, [step, selectedCourtId, selectedDate, selectedSlot]);

  const togglePlayer = (id) => {
    setPlayerIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const nextFromCourt = () => {
    setError("");
    if (!selectedCourtId || !selectedSlotId) {
      setError("Select a court and an available time slot.");
      return;
    }
    setStep(2);
  };

  const nextFromPlayers = () => {
    setError("");
    if (playerIds.length < 1) {
      setError("Invite at least one public player so the match has two people.");
      return;
    }
    if (allowJoin && remaining < 1) {
      setError("The match is already full. Turn off public join or remove a player.");
      return;
    }
    setStep(3);
  };

  const submit = async () => {
    setError("");
    if (!refereeId) {
      setError("Select a referee available for this court.");
      return;
    }
    setSaving(true);
    try {
      await createMatch({
        courtId: selectedCourtId,
        timeSlotId: selectedSlotId,
        bookingDate: selectedDate,
        playerIds,
        isPublic: allowJoin,
        ...(allowJoin ? { openSlots: remaining } : {}),
        refereeId,
      });
      navigate("/matches");
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Could not create match.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />
      <main className="mx-auto w-full max-w-md space-y-4 px-4 pb-28 pt-20">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (step === 1 ? navigate("/matches") : setStep(step - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/5"
          >
            <FaArrowLeft className="h-3.5 w-3.5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Initiate match</h1>
            <p className="text-xs text-white/40">
              Step {step} of 3 ·{" "}
              {step === 1 ? "Book court" : step === 2 ? "Add players" : "Choose referee"}
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {loading && <p className="text-sm text-white/40">Loading...</p>}

        {step === 1 && (
          <>
            <section>
              <h2 className="mb-3 text-sm font-semibold text-white">Select date</h2>
              <div className="-mx-4 overflow-x-auto px-4 pb-1">
                <div className="flex w-max gap-2">
                  {dates.map((d) => {
                    const active = selectedDate === d.key;
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => setSelectedDate(d.key)}
                        className={`flex w-[4.5rem] shrink-0 flex-col items-center rounded-2xl border px-3 py-2.5 ${
                          active
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                            : "border-white/10 bg-[#0e1821]"
                        }`}
                      >
                        <span className={`text-[11px] ${active ? "text-[var(--color-primary)]" : "text-white/45"}`}>
                          {d.weekday}
                        </span>
                        <span className="mt-0.5 text-lg font-bold text-white">{d.day}</span>
                        <span className="text-[11px] text-white/45">{d.month}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold text-white">Available courts</h2>
              {courts.length === 0 ? (
                <p className="text-sm text-white/40">No courts available.</p>
              ) : (
                <div className="-mx-1 overflow-x-auto px-1 pb-1">
                  <div className="flex w-max gap-3">
                    {courts.map((court) => {
                      const active = selectedCourtId === court.id;
                      const img = courtImage(court);
                      return (
                        <button
                          key={court.id}
                          type="button"
                          onClick={() => setSelectedCourtId(court.id)}
                          className={`w-[9.5rem] shrink-0 overflow-hidden rounded-2xl border text-left ${
                            active
                              ? "border-[var(--color-primary)]"
                              : "border-white/10"
                          } bg-[var(--color-surface)]`}
                        >
                          <div className="relative aspect-[4/3] bg-[#0e1821]">
                            {img ? (
                              <img src={img} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[10px] text-white/30">
                                No image
                              </div>
                            )}
                            {active && (
                              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-background)]">
                                <FaCheck className="h-2.5 w-2.5" />
                              </span>
                            )}
                          </div>
                          <div className="px-2.5 py-2">
                            <p className="truncate text-sm font-semibold text-white">
                              {court.name}
                            </p>
                            <p className="truncate text-[11px] text-white/45">
                              {court.paddleOwner?.organizationName || court.address || "Court"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold text-white">Select time</h2>
              {!selectedCourtId ? (
                <p className="text-sm text-white/40">Select a court first.</p>
              ) : loadingSlots ? (
                <p className="text-sm text-white/40">Loading slots...</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((slot) => {
                    const disabled = slot.isBooked || isSlotPast(selectedDate, slot.startTime);
                    const active = selectedSlotId === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`rounded-xl border px-1 py-2.5 text-[11px] font-semibold ${
                          disabled
                            ? "border-white/5 bg-white/5 text-white/25"
                            : active
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-background)]"
                              : "border-white/10 bg-[#0e1821] text-white"
                        }`}
                      >
                        {formatSlotLabel(slot.startTime)}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <button
              type="button"
              onClick={nextFromCourt}
              className="w-full rounded-xl bg-[var(--color-primary)] py-3 text-sm font-bold text-[var(--color-background)]"
            >
              Next · Add players
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-white/50">
              {selectedCourt?.name} · {selectedDate} ·{" "}
              {formatSlotLabel(selectedSlot?.startTime)}
            </p>
            <p className="text-xs text-white/40">
              Public profiles only. Pick at least one player (max 3).
            </p>
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {players.map((p) => {
                const on = playerIds.includes(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => togglePlayer(p.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left ${
                        on
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                          : "border-white/10 bg-[var(--color-surface)]"
                      }`}
                    >
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-white/10">
                        {p.profileImage ? (
                          <img
                            src={mediaUrl(p.profileImage)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-white/35">
                            <FaUser className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {p.fullName}
                        </p>
                        <p className="truncate text-[11px] text-white/40">
                          {p.location || p.province || "Player"}
                        </p>
                      </div>
                      {on && (
                        <FaCheck className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-[#0e1821] px-3 py-3">
              <input
                type="checkbox"
                checked={allowJoin}
                onChange={(e) => setAllowJoin(e.target.checked)}
                disabled={remaining < 1}
                className="mt-1 accent-[var(--color-primary)]"
              />
              <span>
                <span className="block text-sm font-semibold text-white">
                  Allow other members to join
                </span>
                <span className="mt-0.5 block text-xs text-white/45">
                  {remaining < 1
                    ? "Match is full (4 players)."
                    : `${remaining} extra spot${remaining === 1 ? "" : "s"} can be filled publicly.`}
                </span>
              </span>
            </label>
            <button
              type="button"
              onClick={nextFromPlayers}
              className="w-full rounded-xl bg-[var(--color-primary)] py-3 text-sm font-bold text-[var(--color-background)]"
            >
              Next · Choose referee
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-sm text-white/50">
              Referees available for {selectedCourt?.name} at{" "}
              {formatSlotLabel(selectedSlot?.startTime)}
            </p>
            {referees.length === 0 ? (
              <p className="text-sm text-white/40">
                No referees are available for this court and time.
              </p>
            ) : (
              <ul className="space-y-2">
                {referees.map((r) => {
                  const on = refereeId === r.id;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setRefereeId(r.id)}
                        className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left ${
                          on
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                            : "border-white/10 bg-[var(--color-surface)]"
                        }`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/10">
                          {r.profileImage ? (
                            <img
                              src={mediaUrl(r.profileImage)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FaClipboardCheck className="h-4 w-4 text-[var(--color-primary)]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {r.fullName}
                          </p>
                          <p className="truncate text-[11px] text-white/40">
                            {r.location || r.province || "Referee"}
                            {r.hourlyRate != null
                              ? ` · PKR ${Number(r.hourlyRate).toLocaleString()}/hr`
                              : ""}
                          </p>
                        </div>
                        {on && (
                          <FaCheck className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={submit}
              className="w-full rounded-xl bg-[var(--color-primary)] py-3 text-sm font-bold text-[var(--color-background)] disabled:opacity-50"
            >
              {saving ? "Creating match..." : "Create match"}
            </button>
          </>
        )}
      </main>
      <BottomNav
        active="matches"
        onChange={(id) => {
          if (id === "home") navigate("/");
          else navigate(`/${id}`);
        }}
      />
    </div>
  );
}
