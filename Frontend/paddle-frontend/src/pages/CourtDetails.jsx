import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaMapMarkerAlt, FaStore } from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import LocationMapView from "../components/LocationMapView";
import { getCourt } from "../api/courts";

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
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

function DetailRow({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 border-b border-white/5 py-3">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-white/40">
        {label}
      </dt>
      <dd className="text-sm text-white/90">{value}</dd>
    </div>
  );
}

export default function CourtDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [court, setCourt] = useState(null);
  const [slide, setSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await getCourt(id);
        if (!cancelled) {
          setCourt(data);
          setSlide(0);
        }
      } catch (err) {
        const msg = err.response?.data?.message;
        if (!cancelled) {
          setError(
            Array.isArray(msg)
              ? msg.join(", ")
              : msg || "Failed to load court."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const images = Array.isArray(court?.images)
    ? court.images.map((img) => (typeof img === "string" ? img : img?.url)).filter(Boolean)
    : [];
  const current = mediaUrl(images[slide]);

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />

      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-20">
        <button
          type="button"
          onClick={() => navigate("/courts")}
          className="mb-4 inline-flex items-center gap-2 rounded-lg px-1 py-1 text-sm text-white/70 hover:text-white"
        >
          <FaArrowLeft className="h-3.5 w-3.5" />
          Back to booking
        </button>

        {loading ? (
          <p className="text-sm text-white/40">Loading court...</p>
        ) : error && !court ? (
          <div className="space-y-3">
            <p className="text-sm text-red-400">{error}</p>
            <Link to="/courts" className="text-sm text-[var(--color-primary)]">
              Back to courts
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0e1821]">
              <div className="aspect-[16/10] bg-[#0a1219]">
                {current ? (
                  <img
                    src={current}
                    alt={court.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-white/30">
                    No image
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-3">
                  {images.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      onClick={() => setSlide(i)}
                      className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border ${
                        slide === i
                          ? "border-[var(--color-primary)]"
                          : "border-white/10"
                      }`}
                    >
                      <img
                        src={mediaUrl(src)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h1 className="text-xl font-bold text-white">{court.name}</h1>
              <p className="mt-1 text-lg font-bold text-[var(--color-primary)]">
                {formatPrice(court.pricePerHour)}
                <span className="text-sm font-medium text-white/40">/hr</span>
              </p>
            </div>

            <dl>
              <DetailRow
                label="Environment"
                value={envLabel(court.environmentType)}
              />
              <DetailRow
                label="Club"
                value={court.paddleOwner?.organizationName}
              />
              <DetailRow
                label="Club location"
                value={court.paddleOwner?.location}
              />
              <DetailRow label="Address" value={court.address} />
              <DetailRow
                label="Status"
                value={court.isActive ? "Available" : "Unavailable"}
              />
            </dl>

            {(court.paddleOwner?.organizationName ||
              court.paddleOwner?.location) && (
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[var(--color-surface)] px-3 py-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
                  <FaStore className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {court.paddleOwner?.organizationName || "Club"}
                  </p>
                  {court.paddleOwner?.location && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/45">
                      <FaMapMarkerAlt className="h-2.5 w-2.5 shrink-0" />
                      {court.paddleOwner.location}
                    </p>
                  )}
                </div>
              </div>
            )}

            <section>
              <h2 className="mb-3 text-sm font-semibold text-white">
                Court location
              </h2>
              {court.address && (
                <p className="mb-2 text-sm text-white/60">{court.address}</p>
              )}
              <LocationMapView
                latitude={court.latitude}
                longitude={court.longitude}
                className="h-64 w-full rounded-2xl"
              />
              {court.latitude != null && court.longitude != null && (
                <a
                  href={`https://www.google.com/maps?q=${court.latitude},${court.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:underline"
                >
                  <FaMapMarkerAlt className="h-3 w-3" />
                  Open in Google Maps
                </a>
              )}
            </section>

            <button
              type="button"
              onClick={() => navigate("/courts")}
              className="w-full rounded-2xl bg-[var(--color-primary)] py-3.5 text-sm font-bold text-[var(--color-background)]"
            >
              Book this court
            </button>
          </div>
        )}
      </main>

      <BottomNav
        active="courts"
        onChange={(navId) => {
          if (navId === "home") navigate("/");
          else if (navId === "profile") navigate("/profile");
          else if (navId === "courts") navigate("/courts");
          else if (navId === "bookings") navigate("/bookings");
          else navigate(`/${navId}`);
        }}
      />
    </div>
  );
}
