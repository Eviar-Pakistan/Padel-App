import { useState } from "react";
import { FaCheck, FaEye, FaMapMarkerAlt, FaTimes } from "react-icons/fa";
import { provinceForCity } from "../constants/pakistanCities";

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

function envLabel(type) {
  return String(type || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPrice(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return price ? `PKR ${price}` : "";
  return `PKR ${n.toLocaleString()}`;
}

function formatTime12(hhmm) {
  if (!hhmm) return "";
  const [hStr, mStr] = String(hhmm).split(":");
  const h = Number(hStr);
  const m = mStr || "00";
  if (Number.isNaN(h)) return hhmm;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${m} ${ampm}`;
}

function courtPlace(court) {
  const city = court?.paddleOwner?.location || court?.location || "";
  const province =
    court?.province ||
    court?.paddleOwner?.province ||
    provinceForCity(city);
  const address = court?.address || "";
  const cityProvince = [city, province].filter(Boolean).join(", ");
  return { city, province, address, cityProvince };
}

export default function CourtImagePicker({
  courts = [],
  selectedIds = [],
  onToggle,
  emptyText = "No courts listed yet.",
  layout = "grid",
}) {
  const [details, setDetails] = useState(null);

  if (!courts.length) {
    return <p className="text-xs text-white/40">{emptyText}</p>;
  }

  const list = courts.map((court) => {
    const active = selectedIds.includes(court.id);
    const img = courtImage(court);
    const { address, cityProvince } = courtPlace(court);

    return (
      <div
        key={court.id}
        role="button"
        tabIndex={0}
        onClick={() => onToggle(court.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle(court.id);
          }
        }}
        className={`relative shrink-0 cursor-pointer overflow-hidden rounded-2xl border text-left transition ${
          layout === "scroll" ? "w-[10.5rem]" : "w-full"
        } ${
          active
            ? "border-[var(--color-primary)]"
            : "border-white/10 hover:border-white/25"
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
        <div className="relative space-y-0.5 px-2.5 pb-8 pt-2">
          <p className="truncate text-sm font-semibold text-white">
            {court.name}
          </p>
          {cityProvince ? (
            <p className="truncate text-[11px] text-white/45">{cityProvince}</p>
          ) : null}
          {address && address !== cityProvince ? (
            <p className="truncate text-[10px] text-white/35">{address}</p>
          ) : null}
          <button
            type="button"
            title="View court details"
            aria-label={`View ${court.name} details`}
            onClick={(e) => {
              e.stopPropagation();
              setDetails(court);
            }}
            className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white/90 ring-1 ring-white/15 hover:bg-[var(--color-primary)] hover:text-[var(--color-background)]"
          >
            <FaEye className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  });

  const place = details ? courtPlace(details) : null;
  const slots = Array.isArray(details?.timeSlots) ? details.timeSlots : [];

  return (
    <>
      {layout === "scroll" ? (
        <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1 touch-pan-x">
          <div className="flex w-max gap-3">{list}</div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">{list}</div>
      )}

      {details && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 p-4 sm:items-center"
          onClick={() => setDetails(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-[var(--color-background)] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  {details.name}
                </h3>
                <p className="text-xs text-white/45">
                  {details.paddleOwner?.organizationName || "Court details"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetails(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10"
                aria-label="Close"
              >
                <FaTimes className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mb-3 overflow-hidden rounded-2xl bg-[#0e1821]">
              {courtImage(details) ? (
                <img
                  src={courtImage(details)}
                  alt=""
                  className="aspect-[16/10] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center text-sm text-white/30">
                  No image
                </div>
              )}
            </div>

            <dl className="space-y-2 text-sm">
              {place.city ? (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-white/40">
                    City
                  </dt>
                  <dd className="text-white">{place.city}</dd>
                </div>
              ) : null}
              {place.province ? (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-white/40">
                    Province
                  </dt>
                  <dd className="text-white">{place.province}</dd>
                </div>
              ) : null}
              {place.address ? (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-white/40">
                    Address
                  </dt>
                  <dd className="inline-flex items-start gap-1.5 text-white">
                    <FaMapMarkerAlt className="mt-1 h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                    {place.address}
                  </dd>
                </div>
              ) : null}
              {details.environmentType ? (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-white/40">
                    Environment
                  </dt>
                  <dd className="text-white">
                    {envLabel(details.environmentType)}
                  </dd>
                </div>
              ) : null}
              {details.pricePerHour != null && details.pricePerHour !== "" ? (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-white/40">
                    Price
                  </dt>
                  <dd className="font-semibold text-[var(--color-primary)]">
                    {formatPrice(details.pricePerHour)}/hr
                  </dd>
                </div>
              ) : null}
              {slots.length > 0 ? (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-white/40">
                    Time slots
                  </dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {slots.map((slot) => (
                      <span
                        key={slot.id || `${slot.startTime}-${slot.endTime}`}
                        className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/80"
                      >
                        {formatTime12(slot.startTime)} –{" "}
                        {formatTime12(slot.endTime)}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      )}
    </>
  );
}
