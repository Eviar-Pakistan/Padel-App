import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaChevronDown,
  FaClock,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaSearch,
  FaShieldAlt,
  FaStar,
  FaTimes,
  FaUserTie,
} from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import { getCoaches } from "../api/coaches";
import { getMyProfile } from "../api/auth";
import coachBanner from "../assets/images/padel_banner_coach.png";

const WEEK_DAYS = [
  { id: "MON", label: "Monday" },
  { id: "TUE", label: "Tuesday" },
  { id: "WED", label: "Wednesday" },
  { id: "THU", label: "Thursday" },
  { id: "FRI", label: "Friday" },
  { id: "SAT", label: "Saturday" },
  { id: "SUN", label: "Sunday" },
];

const DAY_ORDER = WEEK_DAYS.map((d) => d.id);
const DAY_SHORT = Object.fromEntries(
  WEEK_DAYS.map((d) => [d.id, d.label.slice(0, 3)])
);

const PRICE_OPTIONS = [
  { id: "0-2000", label: "Under PKR 2,000", min: 0, max: 2000 },
  { id: "2000-4000", label: "PKR 2,000 – 4,000", min: 2000, max: 4000 },
  { id: "4000-6000", label: "PKR 4,000 – 6,000", min: 4000, max: 6000 },
  { id: "6000+", label: "PKR 6,000+", min: 6000, max: Infinity },
];

const RATING_OPTIONS = [
  { id: "4.5", label: "4.5 and up", min: 4.5 },
  { id: "4", label: "4.0 and up", min: 4 },
  { id: "3.5", label: "3.5 and up", min: 3.5 },
  { id: "3", label: "3.0 and up", min: 3 },
];

const SORT_OPTIONS = [
  { id: "rating", label: "Rating" },
  { id: "price_asc", label: "Price: low to high" },
  { id: "price_desc", label: "Price: high to low" },
  { id: "name", label: "Name" },
];

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

function formatPrice(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return null;
  return `PKR ${n.toLocaleString()} / Session`;
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

const TIME_OPTIONS = Array.from({ length: 17 }, (_, i) => {
  const hour = i + 6;
  const id = `${String(hour).padStart(2, "0")}:00`;
  return { id, label: formatTime12(id) };
});

function dayInRange(from, to, day) {
  if (!from && !to) return false;
  if (!from || !to) return from === day || to === day;
  const a = DAY_ORDER.indexOf(from);
  const b = DAY_ORDER.indexOf(to);
  const d = DAY_ORDER.indexOf(day);
  if (a < 0 || b < 0 || d < 0) return false;
  if (a <= b) return d >= a && d <= b;
  return d >= a || d <= b;
}

function timeInRange(from, to, time) {
  if (!from || !to || !time) return false;
  if (from <= to) return time >= from && time < to;
  return time >= from || time < to;
}

function specialtyText(coach) {
  const s = coach?.specialties;
  if (Array.isArray(s) && s.length) return s.filter(Boolean).join(", ");
  if (typeof s === "string" && s.trim()) return s.trim();
  return coach?.certificationLevel || "Padel Coaching";
}

function formatAvailability(coach) {
  const fromDay = DAY_SHORT[coach.availableFromDay];
  const toDay = DAY_SHORT[coach.availableToDay];
  const days =
    fromDay && toDay
      ? fromDay === toDay
        ? fromDay
        : `${fromDay} – ${toDay}`
      : fromDay || toDay || "";
  const times =
    coach.availableFromTime && coach.availableToTime
      ? `${formatTime12(coach.availableFromTime)} – ${formatTime12(coach.availableToTime)}`
      : formatTime12(coach.availableFromTime) ||
        formatTime12(coach.availableToTime) ||
        "";
  if (days && times) return `${days}, ${times}`;
  return days || times || "Availability on request";
}

function highlightMatch(text, term) {
  if (!term.trim()) return text;
  const lower = String(text).toLowerCase();
  const idx = lower.indexOf(term.trim().toLowerCase());
  if (idx < 0) return text;
  const end = idx + term.trim().length;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-[var(--color-primary)]/30 text-inherit">
        {text.slice(idx, end)}
      </mark>
      {text.slice(end)}
    </>
  );
}

function coachLocation(coach) {
  return coach?.paddleOwner?.location || "";
}

export default function Coaches() {
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortId, setSortId] = useState("rating");
  const [sortOpen, setSortOpen] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTab, setSearchTab] = useState("location");
  const [searchText, setSearchText] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterTime, setFilterTime] = useState("");
  const [filterPriceId, setFilterPriceId] = useState("");
  const [filterRatingId, setFilterRatingId] = useState("");
  const searchInputRef = useRef(null);
  const sortRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [coachesRes, profileRes] = await Promise.all([
          getCoaches(),
          getMyProfile().catch(() => ({ data: null })),
        ]);
        if (cancelled) return;
        const list = Array.isArray(coachesRes.data) ? coachesRes.data : [];
        setCoaches(list);
        const loc = profileRes.data?.location?.trim() || "";
        if (loc && list.some((c) => c?.paddleOwner?.location === loc)) {
          setFilterLocation(loc);
        }
      } catch (err) {
        const msg = err.response?.data?.message;
        if (!cancelled) {
          setError(
            Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load coaches."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onDoc = (e) => {
      if (!sortRef.current?.contains(e.target)) setSortOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const locations = useMemo(() => {
    const set = new Set();
    for (const c of coaches) {
      const loc = coachLocation(c);
      if (loc) set.add(loc);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [coaches]);

  const visible = useMemo(() => {
    const price = PRICE_OPTIONS.find((p) => p.id === filterPriceId);
    const rating = RATING_OPTIONS.find((r) => r.id === filterRatingId);
    const list = coaches.filter((c) => {
      if (c.status && c.status !== "ACTIVE") return false;
      if (filterLocation && coachLocation(c) !== filterLocation) return false;
      if (filterDay && !dayInRange(c.availableFromDay, c.availableToDay, filterDay)) {
        return false;
      }
      if (
        filterTime &&
        !timeInRange(c.availableFromTime, c.availableToTime, filterTime)
      ) {
        return false;
      }
      if (price) {
        const p = Number(c.sessionRate);
        if (Number.isNaN(p) || !(p >= price.min && p < price.max)) return false;
      }
      if (rating) {
        const r = Number(c.rating) || 0;
        if (r < rating.min) return false;
      }
      return true;
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortId === "price_asc") {
        return (Number(a.sessionRate) || 0) - (Number(b.sessionRate) || 0);
      }
      if (sortId === "price_desc") {
        return (Number(b.sessionRate) || 0) - (Number(a.sessionRate) || 0);
      }
      if (sortId === "name") {
        const an = `${a.firstName} ${a.lastName}`.trim();
        const bn = `${b.firstName} ${b.lastName}`.trim();
        return an.localeCompare(bn);
      }
      return (Number(b.rating) || 0) - (Number(a.rating) || 0);
    });
    return sorted;
  }, [
    coaches,
    filterLocation,
    filterDay,
    filterTime,
    filterPriceId,
    filterRatingId,
    sortId,
  ]);

  const openSearch = (tab = "location") => {
    setSearchTab(tab);
    setSearchText("");
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchText("");
  };

  const clearFilters = () => {
    setFilterLocation("");
    setFilterDay("");
    setFilterTime("");
    setFilterPriceId("");
    setFilterRatingId("");
  };

  const hasFilters =
    filterLocation || filterDay || filterTime || filterPriceId || filterRatingId;

  const term = searchText.trim().toLowerCase();
  const filteredLocations = !term
    ? locations
    : locations.filter((l) => l.toLowerCase().includes(term));
  const filteredDays = !term
    ? WEEK_DAYS
    : WEEK_DAYS.filter((d) => d.label.toLowerCase().includes(term));
  const filteredTimes = !term
    ? TIME_OPTIONS
    : TIME_OPTIONS.filter((t) => t.label.toLowerCase().includes(term));
  const filteredPrices = !term
    ? PRICE_OPTIONS
    : PRICE_OPTIONS.filter((p) => p.label.toLowerCase().includes(term));
  const filteredRatings = !term
    ? RATING_OPTIONS
    : RATING_OPTIONS.filter((r) => r.label.toLowerCase().includes(term));

  const selectedSort = SORT_OPTIONS.find((s) => s.id === sortId) || SORT_OPTIONS[0];
  const selectedDay = WEEK_DAYS.find((d) => d.id === filterDay);
  const selectedTime = TIME_OPTIONS.find((t) => t.id === filterTime);
  const selectedPrice = PRICE_OPTIONS.find((p) => p.id === filterPriceId);
  const selectedRating = RATING_OPTIONS.find((r) => r.id === filterRatingId);

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />

      <main className="mx-auto w-full max-w-md px-0 pb-28 pt-16">
        <div className="sticky top-16 z-40 border-b border-white/10 bg-[var(--color-background)] px-4 py-3">
          <button
            type="button"
            onClick={() => openSearch("location")}
            className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-left"
          >
            <FaSearch className="h-3.5 w-3.5 shrink-0 text-white/40" />
            <span className="min-w-0 flex-1 truncate text-sm text-white/45">
              Search by location, day, time, price, or rating...
            </span>
          </button>

          {hasFilters && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {filterLocation && (
                <Chip
                  icon={FaMapMarkerAlt}
                  label={filterLocation}
                  onClear={() => setFilterLocation("")}
                  onClick={() => openSearch("location")}
                />
              )}
              {selectedDay && (
                <Chip
                  icon={FaClock}
                  label={selectedDay.label}
                  onClear={() => setFilterDay("")}
                  onClick={() => openSearch("day")}
                />
              )}
              {selectedTime && (
                <Chip
                  icon={FaClock}
                  label={selectedTime.label}
                  onClear={() => setFilterTime("")}
                  onClick={() => openSearch("time")}
                />
              )}
              {selectedPrice && (
                <Chip
                  icon={FaMoneyBillWave}
                  label={selectedPrice.label}
                  onClear={() => setFilterPriceId("")}
                  onClick={() => openSearch("price")}
                />
              )}
              {selectedRating && (
                <Chip
                  icon={FaStar}
                  label={selectedRating.label}
                  onClear={() => setFilterRatingId("")}
                  onClick={() => openSearch("rating")}
                />
              )}
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-white/40 hover:text-white/70"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <div className="px-4 pt-4">
          <section className="overflow-hidden rounded-2xl">
            <img
              src={coachBanner}
              alt="Train with the Right Coach"
              className="h-auto w-full object-cover"
            />
          </section>

          <div className="mt-5 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-white">Our Top Coaches</h2>
            <div ref={sortRef} className="relative">
              <button
                type="button"
                onClick={() => setSortOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#0e1821] px-3 py-1.5 text-xs text-white/80"
              >
                Sort by: {selectedSort.label}
                <FaChevronDown
                  className={`h-2.5 w-2.5 transition ${sortOpen ? "rotate-180" : ""}`}
                />
              </button>
              {sortOpen && (
                <div className="absolute right-0 z-30 mt-1.5 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#152230] shadow-xl">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSortId(opt.id);
                        setSortOpen(false);
                      }}
                      className={`block w-full px-3 py-2.5 text-left text-xs ${
                        sortId === opt.id
                          ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                          : "text-white/80 hover:bg-white/5"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-[var(--color-muted)]">
              Loading coaches...
            </p>
          ) : error ? (
            <p className="mt-6 text-sm text-red-400">{error}</p>
          ) : visible.length === 0 ? (
            <p className="mt-6 text-sm text-white/40">
              No coaches match your filters.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {visible.map((coach) => (
                <CoachCard
                  key={coach.id}
                  coach={coach}
                  onView={() => navigate(`/coaches/${coach.id}`)}
                  onBook={() => navigate(`/coaches/${coach.id}`, { state: { book: true } })}
                />
              ))}
            </ul>
          )}
        </div>
      </main>

      {searchOpen && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-[2px]">
          <div className="mx-auto flex h-full w-full max-w-md flex-col bg-[var(--color-background)] pt-4">
            <div className="px-4">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#152230] px-3 py-2.5">
                <FaSearch className="h-4 w-4 shrink-0 text-white/40" />
                <input
                  ref={searchInputRef}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder={
                    searchTab === "location"
                      ? "Search locations..."
                      : searchTab === "day"
                        ? "Search days..."
                        : searchTab === "time"
                          ? "Search times..."
                          : searchTab === "price"
                            ? "Search price..."
                            : "Search rating..."
                  }
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                />
                <button
                  type="button"
                  onClick={searchText ? () => setSearchText("") : closeSearch}
                  className="rounded-full p-1 text-white/50 hover:bg-white/10"
                  aria-label="Close"
                >
                  <FaTimes className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { id: "location", label: "Location" },
                  { id: "day", label: "Day" },
                  { id: "time", label: "Time" },
                  { id: "price", label: "Price" },
                  { id: "rating", label: "Rating" },
                ].map((tab) => {
                  const active = searchTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setSearchTab(tab.id);
                        setSearchText("");
                        searchInputRef.current?.focus();
                      }}
                      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                        active
                          ? "bg-[var(--color-primary)] text-[var(--color-background)]"
                          : "bg-white/10 text-white/80 hover:bg-white/15"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto px-4 pb-8">
              {searchTab === "location" && (
                <FilterList
                  title="Locations"
                  allLabel="All locations"
                  allHint="Clear location filter"
                  selected={!filterLocation}
                  onSelectAll={() => {
                    setFilterLocation("");
                    closeSearch();
                  }}
                  icon={FaMapMarkerAlt}
                  empty={
                    locations.length === 0
                      ? "No club locations yet."
                      : "No locations match."
                  }
                  items={filteredLocations.map((loc) => ({
                    id: loc,
                    label: loc,
                    active: filterLocation === loc,
                    onSelect: () => {
                      setFilterLocation(loc);
                      closeSearch();
                    },
                  }))}
                  searchText={searchText}
                />
              )}

              {searchTab === "day" && (
                <FilterList
                  title="Available day"
                  allLabel="Any day"
                  allHint="Clear day filter"
                  selected={!filterDay}
                  onSelectAll={() => {
                    setFilterDay("");
                    closeSearch();
                  }}
                  icon={FaClock}
                  empty="No matches."
                  items={filteredDays.map((d) => ({
                    id: d.id,
                    label: d.label,
                    active: filterDay === d.id,
                    onSelect: () => {
                      setFilterDay(d.id);
                      closeSearch();
                    },
                  }))}
                  searchText={searchText}
                />
              )}

              {searchTab === "time" && (
                <FilterList
                  title="Available time"
                  allLabel="Any time"
                  allHint="Clear time filter"
                  selected={!filterTime}
                  onSelectAll={() => {
                    setFilterTime("");
                    closeSearch();
                  }}
                  icon={FaClock}
                  empty="No matches."
                  items={filteredTimes.map((t) => ({
                    id: t.id,
                    label: t.label,
                    active: filterTime === t.id,
                    onSelect: () => {
                      setFilterTime(t.id);
                      closeSearch();
                    },
                  }))}
                  searchText={searchText}
                />
              )}

              {searchTab === "price" && (
                <FilterList
                  title="Session price"
                  allLabel="Any price"
                  allHint="Clear price filter"
                  selected={!filterPriceId}
                  onSelectAll={() => {
                    setFilterPriceId("");
                    closeSearch();
                  }}
                  icon={FaMoneyBillWave}
                  empty="No matches."
                  items={filteredPrices.map((p) => ({
                    id: p.id,
                    label: p.label,
                    active: filterPriceId === p.id,
                    onSelect: () => {
                      setFilterPriceId(p.id);
                      closeSearch();
                    },
                  }))}
                  searchText={searchText}
                />
              )}

              {searchTab === "rating" && (
                <FilterList
                  title="Minimum rating"
                  allLabel="Any rating"
                  allHint="Clear rating filter"
                  selected={!filterRatingId}
                  onSelectAll={() => {
                    setFilterRatingId("");
                    closeSearch();
                  }}
                  icon={FaStar}
                  empty="No matches."
                  items={filteredRatings.map((r) => ({
                    id: r.id,
                    label: r.label,
                    active: filterRatingId === r.id,
                    onSelect: () => {
                      setFilterRatingId(r.id);
                      closeSearch();
                    },
                  }))}
                  searchText={searchText}
                />
              )}
            </div>
          </div>
        </div>
      )}

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

function CoachCard({ coach, onView, onBook }) {
  const name = `Coach ${coach.firstName} ${coach.lastName}`.trim();
  const image = mediaUrl(coach.profileImage);
  const rating = Number(coach.rating);
  const price = formatPrice(coach.sessionRate);
  const loc = coachLocation(coach);

  return (
    <li className="rounded-2xl border border-white/10 bg-[var(--color-surface)] px-4 py-3">
      <div className="flex gap-3">
        <div className="relative h-16 w-16 shrink-0">
          <div className="h-full w-full overflow-hidden rounded-full bg-[#0e1821]">
            {image ? (
              <img src={image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--color-primary)]">
                <FaUserTie className="h-6 w-6" />
              </div>
            )}
          </div>
          {coach.isVerified && (
            <span className="absolute bottom-0.5 left-0.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-background)] ring-2 ring-[var(--color-surface)]">
              <FaShieldAlt className="h-2.5 w-2.5" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <h3 className="text-sm font-bold text-white">{name}</h3>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)]">
              <FaStar className="h-3 w-3" />
              {Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : "New"}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-white/55">
            Specialty:{" "}
            <span className="font-medium text-[var(--color-primary)]">
              {specialtyText(coach)}
            </span>
          </p>
          {coach.bio && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/45">
              {coach.bio}
            </p>
          )}
          {price && (
            <span className="mt-2 inline-flex rounded-full border border-[var(--color-primary)]/50 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
              {price}
            </span>
          )}
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/80">
            <FaClock className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
            <span className="truncate">{formatAvailability(coach)}</span>
          </p>
          {loc && (
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/45">
              <FaMapMarkerAlt className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
              <span className="truncate">{loc}</span>
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onBook}
          className="rounded-xl bg-[var(--color-primary)] py-2.5 text-xs font-bold text-[var(--color-background)]"
        >
          Book Session
        </button>
        <button
          type="button"
          onClick={onView}
          className="rounded-xl border border-white/25 py-2.5 text-xs font-semibold text-white"
        >
          View Profile
        </button>
      </div>
    </li>
  );
}

function Chip({ icon: Icon, label, onClear, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-2.5 py-1 text-xs text-[var(--color-primary)]"
    >
      <Icon className="h-2.5 w-2.5" />
      <span className="max-w-[9rem] truncate">{label}</span>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.stopPropagation();
            onClear();
          }
        }}
        className="ml-0.5 rounded-full px-0.5 hover:bg-white/10"
      >
        ×
      </span>
    </button>
  );
}

function FilterList({
  title,
  allLabel,
  allHint,
  selected,
  onSelectAll,
  icon: Icon,
  empty,
  items,
  searchText,
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
        {title}
      </p>
      <button
        type="button"
        onClick={onSelectAll}
        className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/5 ${
          selected ? "bg-white/5" : ""
        }`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/60">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">{allLabel}</p>
          <p className="text-xs text-white/40">{allHint}</p>
        </div>
      </button>
      {items.length === 0 ? (
        <p className="px-3 py-6 text-sm text-white/40">{empty}</p>
      ) : (
        items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onSelect}
            className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/5 ${
              item.active ? "bg-[var(--color-primary)]/10" : ""
            }`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {highlightMatch(item.label, searchText)}
              </p>
              <p className="truncate text-xs text-white/40">
                {item.hint || "Tap to filter"}
              </p>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
