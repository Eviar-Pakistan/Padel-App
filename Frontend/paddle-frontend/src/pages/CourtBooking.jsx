import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCheck,
  FaChevronDown,
  FaEye,
  FaMapMarkerAlt,
  FaSearch,
  FaStore,
  FaTag,
  FaTimes,
  FaMoneyBillWave,
} from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import {
  createCourtBooking,
  getCourtAvailability,
  getCourts,
  getJoinableBookings,
  requestJoinCourtBooking,
} from "../api/courts";
import { getMyProfile } from "../api/auth";

const ENV_OPTIONS = [
  { id: "INDOOR", label: "Indoor" },
  { id: "OUTDOOR", label: "Outdoor" },
  { id: "SEMI_INDOOR", label: "Semi indoor" },
  { id: "SEMI_OUTDOOR", label: "Semi outdoor" },
];

const PRICE_OPTIONS = [
  { id: "0-2000", label: "Under PKR 2,000", min: 0, max: 2000 },
  { id: "2000-4000", label: "PKR 2,000 – 4,000", min: 2000, max: 4000 },
  { id: "4000-6000", label: "PKR 4,000 – 6,000", min: 4000, max: 6000 },
  { id: "6000+", label: "PKR 6,000+", min: 6000, max: Infinity },
];

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

function courtImage(court) {
  const imgs = Array.isArray(court?.images) ? court.images : [];
  return mediaUrl(imgs[0] || court?.image);
}

function formatPrice(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return `PKR ${price}`;
  return `PKR ${n.toLocaleString()}`;
}

function envLabel(type) {
  return String(type || "OUTDOOR").replace(/_/g, " ").replace(/\b\w/g, (c) =>
    c.toUpperCase()
  );
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

function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** True when the slot start time is already in the past for the given date (local time). */
function isSlotPast(dateKey, startTime) {
  if (!dateKey || !startTime) return false;
  const todayKey = toDateKey(new Date());
  if (dateKey < todayKey) return true;
  if (dateKey > todayKey) return false;
  const [hStr, mStr = "0"] = String(startTime).split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  const now = new Date();
  const slotMinutes = h * 60 + m;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return slotMinutes <= nowMinutes;
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

function highlightMatch(text, term) {
  if (!term.trim()) return text;
  const lower = text.toLowerCase();
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

export default function CourtBooking() {
  const navigate = useNavigate();
  const dates = useMemo(() => buildDateOptions(14), []);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [booking, setBooking] = useState(false);

  const [orgId, setOrgId] = useState("");
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dates[0]?.key || "");
  const [selectedCourtId, setSelectedCourtId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [availability, setAvailability] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [allowJoin, setAllowJoin] = useState(false);
  const [openSpots, setOpenSpots] = useState("2");
  const [joinable, setJoinable] = useState([]);
  const [loadingJoinable, setLoadingJoinable] = useState(false);
  const [joiningId, setJoiningId] = useState("");

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTab, setSearchTab] = useState("location");
  const [searchText, setSearchText] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterEnv, setFilterEnv] = useState("");
  const [filterOrgId, setFilterOrgId] = useState("");
  const [filterPriceId, setFilterPriceId] = useState("");
  const [userLocation, setUserLocation] = useState("");
  const searchInputRef = useRef(null);
  const orgMenuRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [courtsRes, profileRes] = await Promise.all([
          getCourts(),
          getMyProfile().catch(() => ({ data: null })),
        ]);
        if (cancelled) return;
        setCourts(Array.isArray(courtsRes.data) ? courtsRes.data : []);
        const loc = profileRes.data?.location?.trim() || "";
        setUserLocation(loc);
        if (loc) setFilterLocation(loc);
      } catch (err) {
        const msg = err.response?.data?.message;
        if (!cancelled) {
          setError(
            Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load courts."
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
      if (!orgMenuRef.current?.contains(e.target)) setOrgMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const organizations = useMemo(() => {
    const map = new Map();
    for (const c of courts) {
      const id = c.paddleOwnerId ?? c.paddleOwner?.id;
      if (id == null) continue;
      map.set(String(id), {
        id: String(id),
        name: c.paddleOwner?.organizationName || `Club #${id}`,
        location: c.paddleOwner?.location || c.address || "",
      });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [courts]);

  const locations = useMemo(() => {
    const set = new Set();
    for (const c of courts) {
      const loc = c.paddleOwner?.location || c.address;
      if (loc) set.add(loc);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [courts]);

  // Apply search filters first
  const filteredCourts = useMemo(() => {
    const price = PRICE_OPTIONS.find((p) => p.id === filterPriceId);
    return courts.filter((c) => {
      if (filterOrgId) {
        const id = String(c.paddleOwnerId ?? c.paddleOwner?.id);
        if (id !== String(filterOrgId)) return false;
      }
      if (filterLocation) {
        const loc = c.paddleOwner?.location || c.address || "";
        if (loc !== filterLocation) return false;
      }
      if (filterEnv && c.environmentType !== filterEnv) return false;
      if (price) {
        const p = Number(c.pricePerHour);
        if (!(p >= price.min && p < price.max)) return false;
      }
      return true;
    });
  }, [courts, filterOrgId, filterLocation, filterEnv, filterPriceId]);

  // Orgs available after filters (for top selector)
  const orgsForSelector = useMemo(() => {
    const map = new Map();
    for (const c of filteredCourts) {
      const id = c.paddleOwnerId ?? c.paddleOwner?.id;
      if (id == null) continue;
      map.set(String(id), {
        id: String(id),
        name: c.paddleOwner?.organizationName || `Club #${id}`,
        location: c.paddleOwner?.location || c.address || "",
      });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredCourts]);

  // Clear invalid org selection only — do not auto-select a club
  useEffect(() => {
    if (orgId && !orgsForSelector.some((o) => o.id === orgId)) {
      setOrgId("");
    }
  }, [orgsForSelector, orgId]);

  const courtsForOrg = useMemo(() => {
    if (!orgId) return filteredCourts;
    return filteredCourts.filter(
      (c) => String(c.paddleOwnerId ?? c.paddleOwner?.id) === String(orgId)
    );
  }, [filteredCourts, orgId]);

  // Keep court selection valid
  useEffect(() => {
    if (!courtsForOrg.length) {
      setSelectedCourtId("");
      return;
    }
    if (!selectedCourtId || !courtsForOrg.some((c) => c.id === selectedCourtId)) {
      setSelectedCourtId(courtsForOrg[0].id);
    }
  }, [courtsForOrg, selectedCourtId]);

  const selectedCourt = courtsForOrg.find((c) => c.id === selectedCourtId);
  const selectedOrg = orgsForSelector.find((o) => o.id === orgId);
  const clubSelectorTitle = selectedOrg?.name || "All clubs";
  const clubSelectorLocation =
    selectedOrg?.location ||
    filterLocation ||
    userLocation ||
    "All locations";

  // Load availability when court/date changes
  useEffect(() => {
    if (!selectedCourtId || !selectedDate) {
      setAvailability(null);
      setSelectedSlotId("");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingSlots(true);
      setSelectedSlotId("");
      try {
        const { data } = await getCourtAvailability(
          selectedCourtId,
          selectedDate
        );
        if (!cancelled) setAvailability(data);
      } catch (err) {
        if (!cancelled) {
          setAvailability(null);
          const msg = err.response?.data?.message;
          setError(
            Array.isArray(msg)
              ? msg.join(", ")
              : msg || "Failed to load time slots."
          );
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCourtId, selectedDate]);

  const slots = availability?.slots || selectedCourt?.timeSlots || [];

  // Drop selection if the chosen slot is now past (e.g. today + late hour)
  useEffect(() => {
    if (!selectedSlotId || !selectedDate) return;
    const slot = slots.find((s) => s.id === selectedSlotId);
    if (slot && isSlotPast(selectedDate, slot.startTime)) {
      setSelectedSlotId("");
    }
  }, [selectedSlotId, selectedDate, slots]);

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
    setFilterEnv("");
    setFilterOrgId("");
    setFilterPriceId("");
  };

  const hasFilters =
    filterLocation || filterEnv || filterOrgId || filterPriceId;

  const filteredLocations = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return locations;
    return locations.filter((l) => l.toLowerCase().includes(term));
  }, [locations, searchText]);

  const filteredEnvs = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return ENV_OPTIONS;
    return ENV_OPTIONS.filter((e) => e.label.toLowerCase().includes(term));
  }, [searchText]);

  const filteredOrgs = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return organizations;
    return organizations.filter(
      (o) =>
        o.name.toLowerCase().includes(term) ||
        o.location.toLowerCase().includes(term)
    );
  }, [organizations, searchText]);

  const filteredPrices = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return PRICE_OPTIONS;
    return PRICE_OPTIONS.filter((p) => p.label.toLowerCase().includes(term));
  }, [searchText]);

  const bookCourt = async () => {
    if (!selectedCourtId || !selectedSlotId || !selectedDate) {
      setError("Select a court, date, and time slot.");
      return;
    }
    const chosen = slots.find((s) => s.id === selectedSlotId);
    if (chosen && isSlotPast(selectedDate, chosen.startTime)) {
      setError("That time slot has already passed. Pick a later slot.");
      setSelectedSlotId("");
      return;
    }
    if (allowJoin) {
      const spots = Number(openSpots);
      if (!Number.isInteger(spots) || spots < 1 || spots > 3) {
        setError("Open spots must be between 1 and 3 (out of 4).");
        return;
      }
    }
    setBooking(true);
    setError("");
    setMessage("");
    try {
      await createCourtBooking(selectedCourtId, {
        timeSlotId: selectedSlotId,
        bookingDate: selectedDate,
        isPublic: allowJoin,
        ...(allowJoin ? { availableSlots: Number(openSpots) } : {}),
      });
      setMessage(
        allowJoin
          ? "Court booked — other members can join open spots."
          : "Court booked successfully."
      );
      setSelectedSlotId("");
      setAllowJoin(false);
      setOpenSpots("2");
      const { data } = await getCourtAvailability(selectedCourtId, selectedDate);
      setAvailability(data);
      await refreshJoinable();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Booking failed."
      );
    } finally {
      setBooking(false);
    }
  };

  const refreshJoinable = async () => {
    if (!selectedDate) {
      setJoinable([]);
      return;
    }
    setLoadingJoinable(true);
    try {
      const { data } = await getJoinableBookings({
        date: selectedDate,
        ...(orgId ? { paddleOwnerId: orgId } : {}),
      });
      let list = Array.isArray(data) ? data : [];
      if (!orgId && filterLocation) {
        list = list.filter((b) => {
          const loc = b.court?.paddleOwner?.location || b.court?.address || "";
          return loc === filterLocation;
        });
      }
      setJoinable(list);
    } catch {
      setJoinable([]);
    } finally {
      setLoadingJoinable(false);
    }
  };

  useEffect(() => {
    refreshJoinable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, orgId, filterLocation]);

  const joinSlot = async (bookingId) => {
    setJoiningId(bookingId);
    setError("");
    setMessage("");
    try {
      await requestJoinCourtBooking(bookingId);
      setMessage("Join request sent. Waiting for the booking owner to accept.");
      await refreshJoinable();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Failed to request join."
      );
    } finally {
      setJoiningId("");
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />

      <main className="mx-auto w-full max-w-md min-w-0 space-y-5 overflow-x-hidden px-4 pb-28 pt-20">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-bold text-white">Booking Courts</h1>
          <button
            type="button"
            onClick={() => openSearch("location")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/70 hover:bg-white/5"
            aria-label="Search filters"
          >
            <FaSearch className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Organization selector */}
        <div ref={orgMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setOrgMenuOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3 text-left"
          >
            <FaMapMarkerAlt className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">
                {clubSelectorTitle}
              </span>
              <span className="mt-0.5 block truncate text-xs text-white/45">
                {clubSelectorLocation}
              </span>
            </span>
            <FaChevronDown
              className={`h-3 w-3 shrink-0 text-white/45 transition ${
                orgMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {orgMenuOpen && (
            <div className="absolute left-0 right-0 z-30 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-[#152230] shadow-xl">
              <button
                type="button"
                onClick={() => {
                  setOrgId("");
                  setOrgMenuOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm ${
                  !orgId
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "text-white hover:bg-white/5"
                }`}
              >
                <FaStore className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">All clubs</span>
                  <span className="block truncate text-xs opacity-70">
                    {filterLocation || userLocation || "Every location"}
                  </span>
                </span>
                {!orgId && <FaCheck className="h-3 w-3" />}
              </button>
              {orgsForSelector.length === 0 ? (
                <p className="px-3 py-3 text-sm text-white/40">No clubs found</p>
              ) : (
                orgsForSelector.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => {
                      setOrgId(org.id);
                      setOrgMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm ${
                      orgId === org.id
                        ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                        : "text-white hover:bg-white/5"
                    }`}
                  >
                    <FaStore className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{org.name}</span>
                      {org.location && (
                        <span className="block truncate text-xs opacity-70">
                          {org.location}
                        </span>
                      )}
                    </span>
                    {orgId === org.id && <FaCheck className="h-3 w-3" />}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {filterLocation && (
              <Chip
                icon={FaMapMarkerAlt}
                label={filterLocation}
                onClear={() => setFilterLocation("")}
                onClick={() => openSearch("location")}
              />
            )}
            {filterEnv && (
              <Chip
                icon={FaTag}
                label={envLabel(filterEnv)}
                onClear={() => setFilterEnv("")}
                onClick={() => openSearch("environment")}
              />
            )}
            {filterOrgId && (
              <Chip
                icon={FaStore}
                label={
                  organizations.find((o) => o.id === filterOrgId)?.name ||
                  "Club"
                }
                onClear={() => setFilterOrgId("")}
                onClick={() => openSearch("organization")}
              />
            )}
            {filterPriceId && (
              <Chip
                icon={FaMoneyBillWave}
                label={
                  PRICE_OPTIONS.find((p) => p.id === filterPriceId)?.label ||
                  "Price"
                }
                onClear={() => setFilterPriceId("")}
                onClick={() => openSearch("price")}
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

        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-emerald-400">{message}</p>}

        {/* Dates */}
        <section className="min-w-0">
          <h2 className="mb-3 text-sm font-semibold text-white">Select Date</h2>
          <div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 pb-1 touch-pan-x">
            <div className="flex w-max gap-2">
              {dates.map((d) => {
                const active = selectedDate === d.key;
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setSelectedDate(d.key)}
                    className={`flex w-[4.5rem] shrink-0 flex-col items-center rounded-2xl border px-3 py-2.5 transition ${
                      active
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                        : "border-white/10 bg-[#0e1821] hover:border-white/20"
                    }`}
                  >
                    <span
                      className={`text-[11px] ${
                        active ? "text-[var(--color-primary)]" : "text-white/45"
                      }`}
                    >
                      {d.weekday}
                    </span>
                    <span className="mt-0.5 text-lg font-bold text-white">
                      {d.day}
                    </span>
                    <span className="text-[11px] text-white/45">{d.month}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Courts */}
        <section className="min-w-0">
          <h2 className="mb-3 text-sm font-semibold text-white">
            Available Courts
          </h2>
          {loading ? (
            <p className="text-sm text-white/40">Loading courts...</p>
          ) : courtsForOrg.length === 0 ? (
            <p className="text-sm text-white/40">
              No courts match your filters.
            </p>
          ) : (
            <div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 pb-1 touch-pan-x">
              <div className="flex w-max gap-3">
                {courtsForOrg.map((court) => {
                  const active = selectedCourtId === court.id;
                  const img = courtImage(court);
                  return (
                    <div
                      key={court.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedCourtId(court.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedCourtId(court.id);
                        }
                      }}
                      className={`relative w-[9.5rem] shrink-0 cursor-pointer overflow-hidden rounded-2xl border text-left transition ${
                        active
                          ? "border-[var(--color-primary)]"
                          : "border-white/10 hover:border-white/25"
                      } bg-[var(--color-surface)]`}
                    >
                      <div className="relative aspect-[4/3] bg-[#0e1821]">
                        {img ? (
                          <img
                            src={img}
                            alt=""
                            className="h-full w-full object-cover"
                          />
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
                      <div className="relative space-y-0.5 px-2.5 pb-8 pt-2">
                        <p className="truncate text-sm font-semibold text-white">
                          {court.name}
                        </p>
                        <p className="text-[11px] text-white/45">
                          {envLabel(court.environmentType)}
                        </p>
                        <p className="text-[11px] font-bold text-[var(--color-primary)]">
                          {formatPrice(court.pricePerHour)}
                          <span className="font-medium text-white/40">/hr</span>
                        </p>
                        <button
                          type="button"
                          title="View court details"
                          aria-label={`View ${court.name} details`}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/courts/${court.id}`);
                          }}
                          className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white/90 ring-1 ring-white/15 hover:bg-[var(--color-primary)] hover:text-[var(--color-background)]"
                        >
                          <FaEye className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Time slots */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-white">
            Select Time Slots
          </h2>
          {!selectedCourtId ? (
            <p className="text-sm text-white/40">Select a court first.</p>
          ) : loadingSlots ? (
            <p className="text-sm text-white/40">Loading slots...</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-white/40">No slots for this court.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((slot) => {
                const booked = Boolean(slot.isBooked);
                const past = isSlotPast(selectedDate, slot.startTime);
                const disabled = booked || past;
                const active = selectedSlotId === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedSlotId(slot.id)}
                    title={
                      past
                        ? "This time has already passed"
                        : booked
                          ? "Already booked"
                          : undefined
                    }
                    className={`relative rounded-xl border px-1 py-2.5 text-center text-[11px] font-semibold transition ${
                      disabled
                        ? "cursor-not-allowed border-white/5 bg-white/5 text-white/25"
                        : active
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-background)]"
                          : "border-white/10 bg-[#0e1821] text-white hover:border-white/25"
                    }`}
                  >
                    {formatSlotLabel(slot.startTime)}
                    {active && !disabled && (
                      <span className="absolute right-1 top-1">
                        <FaCheck className="h-2 w-2" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Allow others to join */}
        <section className="space-y-3 rounded-2xl border border-white/10 bg-[#0e1821] px-3 py-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={allowJoin}
              onChange={(e) => setAllowJoin(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/20 accent-[var(--color-primary)]"
            />
            <span>
              <span className="block text-sm font-semibold text-white">
                Allow other members to join
              </span>
              <span className="mt-0.5 block text-xs text-white/45">
                Make this booking public so others can fill open spots
              </span>
            </span>
          </label>
          {allowJoin && (
            <div>
              <label
                htmlFor="open-spots"
                className="mb-1.5 block text-xs font-medium text-white/60"
              >
                Current slots available (out of 4)
              </label>
              <input
                id="open-spots"
                type="number"
                min={1}
                max={3}
                value={openSpots}
                onChange={(e) => setOpenSpots(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[var(--color-surface)] px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--color-primary)]"
              />
              <p className="mt-1 text-[11px] text-white/35">
                You occupy at least 1 spot. Enter how many seats are still open
                (1–3).
              </p>
            </div>
          )}
        </section>

        <button
          type="button"
          disabled={
            booking || !selectedCourtId || !selectedSlotId || !selectedDate
          }
          onClick={bookCourt}
          className="w-full rounded-2xl bg-[var(--color-primary)] py-3.5 text-sm font-bold text-[var(--color-background)] disabled:opacity-50"
        >
          {booking ? "Booking..." : "Book Full Court"}
        </button>

        {/* Join available public slots */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-white">
            Join Available Slots
          </h2>
          {loadingJoinable ? (
            <p className="text-sm text-white/40">Loading open slots...</p>
          ) : joinable.length === 0 ? (
            <p className="text-sm text-white/40">
              No public slots to join for this date.
            </p>
          ) : (
            <ul className="space-y-3">
              {joinable.map((b) => {
                const players = [
                  b.user,
                  ...(Array.isArray(b.participants)
                    ? b.participants.map((p) => p.user)
                    : []),
                ].filter(Boolean);
                const names = players
                  .map((p) => p.fullName)
                  .filter(Boolean)
                  .join(" & ");
                const open = Number(b.availableSlots) || 0;
                const needLabel =
                  open === 1
                    ? "1 Slot Available"
                    : `Need ${open} Players`;
                return (
                  <li
                    key={b.id}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[var(--color-surface)] px-3 py-3"
                  >
                    <div className="flex shrink-0 -space-x-2">
                      {players.slice(0, 3).map((p, i) => {
                        const src = mediaUrl(p.profileImage);
                        return src ? (
                          <img
                            key={p.id || i}
                            src={src}
                            alt=""
                            className="h-9 w-9 rounded-full border-2 border-[var(--color-surface)] object-cover"
                          />
                        ) : (
                          <span
                            key={p.id || i}
                            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--color-surface)] bg-white/10 text-[10px] font-bold text-white/70"
                          >
                            {(p.fullName || "?").slice(0, 1).toUpperCase()}
                          </span>
                        );
                      })}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {names || "Players"}
                      </p>
                      <p className="truncate text-xs text-white/45">
                        {needLabel}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-white">
                        {formatSlotLabel(b.timeSlot?.startTime)}
                      </p>
                      <p className="text-xs text-white/45">
                        {b.court?.name || "Court"}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={joiningId === b.id}
                      onClick={() => joinSlot(b.id)}
                      className="shrink-0 rounded-xl bg-[var(--color-primary)] px-3 py-2 text-xs font-bold text-[var(--color-background)] disabled:opacity-50"
                    >
                      {joiningId === b.id ? "..." : "Request"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      {/* Search / filter overlay */}
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
                      : searchTab === "environment"
                        ? "Search environment..."
                        : searchTab === "organization"
                          ? "Search clubs..."
                          : "Search price..."
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
                  { id: "environment", label: "Environment" },
                  { id: "organization", label: "Organization" },
                  { id: "price", label: "Price/hr" },
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
                      ? "No locations yet."
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

              {searchTab === "environment" && (
                <FilterList
                  title="Environment type"
                  allLabel="All environments"
                  allHint="Clear environment filter"
                  selected={!filterEnv}
                  onSelectAll={() => {
                    setFilterEnv("");
                    closeSearch();
                  }}
                  icon={FaTag}
                  empty="No matches."
                  items={filteredEnvs.map((env) => ({
                    id: env.id,
                    label: env.label,
                    active: filterEnv === env.id,
                    onSelect: () => {
                      setFilterEnv(env.id);
                      closeSearch();
                    },
                  }))}
                  searchText={searchText}
                />
              )}

              {searchTab === "organization" && (
                <FilterList
                  title="Padel organizations"
                  allLabel="All clubs"
                  allHint="Clear organization filter"
                  selected={!filterOrgId}
                  onSelectAll={() => {
                    setFilterOrgId("");
                    closeSearch();
                  }}
                  icon={FaStore}
                  empty={
                    organizations.length === 0
                      ? "No clubs yet."
                      : "No clubs match."
                  }
                  items={filteredOrgs.map((org) => ({
                    id: org.id,
                    label: org.name,
                    hint: org.location,
                    active: filterOrgId === org.id,
                    onSelect: () => {
                      setFilterOrgId(org.id);
                      setOrgId(org.id);
                      closeSearch();
                    },
                  }))}
                  searchText={searchText}
                />
              )}

              {searchTab === "price" && (
                <FilterList
                  title="Price per hour"
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
            </div>
          </div>
        </div>
      )}

      <BottomNav
        active="courts"
        onChange={(id) => {
          if (id === "home") navigate("/");
          else if (id === "profile") navigate("/profile");
          else if (id === "courts") navigate("/courts");
          else navigate(`/${id}`);
        }}
      />
    </div>
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
