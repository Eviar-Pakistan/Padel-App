import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import {
  formatMatchDate,
  formatTime12,
  formatWeekday,
} from "../components/MatchCard";
import { getCalendarEvents } from "../api/matches";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthCells(year, month) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, key });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function eventTitle(match) {
  return match.title || `Padel · ${match.court?.name || "Court"}`;
}

export default function Calendar() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const todayKey = toDateKey(new Date());
  const paramDate = params.get("date") || "";
  const initial = paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate)
    ? new Date(`${paramDate}T12:00:00`)
    : new Date();
  const [cursor, setCursor] = useState(
    Number.isNaN(initial.getTime()) ? new Date() : initial
  );
  const [selected, setSelected] = useState(
    paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate) ? paramDate : todayKey
  );
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    getCalendarEvents()
      .then(({ data }) => setEvents(Array.isArray(data) ? data : []))
      .catch((err) => {
        const msg = err.response?.data?.message;
        setError(Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load calendar.");
      })
      .finally(() => setLoading(false));
  }, []);

  const byDate = useMemo(() => {
    const map = {};
    events.forEach((m) => {
      const key = toDateKey(m.bookingDate);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [events]);

  const selectedEvents = byDate[selected] || [];

  const selectDay = (key) => {
    setSelected(key);
    setParams(key === todayKey ? {} : { date: key });
  };

  const shiftMonth = (delta) => {
    const next = new Date(year, month + delta, 1);
    setCursor(next);
  };

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />
      <main className="mx-auto w-full max-w-md space-y-4 px-4 pb-28 pt-20">
        <div>
          <h1 className="text-lg font-bold text-white">Calendar</h1>
          <p className="text-xs text-white/40">
            Dates you added from Matches are highlighted. Tap a date to see the event.
          </p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <section className="rounded-[1.4rem] border border-white/10 bg-[var(--color-surface)] p-3">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/5"
            >
              <FaChevronLeft className="h-3 w-3" />
            </button>
            <p className="text-sm font-bold text-white">{monthLabel}</p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/5"
            >
              <FaChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-white/35">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (!cell) return <span key={`e-${i}`} className="h-10" />;
              const has = Boolean(byDate[cell.key]?.length);
              const isSelected = selected === cell.key;
              const isToday = cell.key === todayKey;
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => selectDay(cell.key)}
                  className={`relative flex h-10 items-center justify-center rounded-xl text-sm font-semibold ${
                    isSelected
                      ? "bg-[var(--color-primary)] text-[var(--color-background)]"
                      : has
                        ? "border border-[var(--color-primary)] text-[var(--color-primary)]"
                        : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  {cell.day}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-white/50" />
                  )}
                  {has && !isSelected && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[var(--color-primary)]" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-white">
            {selected
              ? formatMatchDate(`${selected}T12:00:00`)
              : "Select a date"}
          </h2>
          {loading ? (
            <p className="text-sm text-white/40">Loading events...</p>
          ) : selectedEvents.length === 0 ? (
            <p className="text-sm text-white/40">
              No events on this date. Add a match from the Matches page.
            </p>
          ) : (
            <ul className="space-y-2">
              {selectedEvents.map((match) => (
                <li key={match.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/matches/${match.id}`)}
                    className="w-full rounded-2xl border border-white/10 bg-[#16301f] px-4 py-3 text-left"
                  >
                    <p className="text-sm font-bold text-white">
                      {eventTitle(match)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-primary)]">
                      {formatWeekday(match.bookingDate)} ·{" "}
                      {formatTime12(match.startTime)}
                      {match.endTime ? ` – ${formatTime12(match.endTime)}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {match.court?.name || "Court"}
                      {match.court?.paddleOwner?.organizationName
                        ? ` · ${match.court.paddleOwner.organizationName}`
                        : ""}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
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
