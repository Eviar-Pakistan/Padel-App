import { FaCheck } from "react-icons/fa";

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

export default function CourtImagePicker({
  courts = [],
  selectedIds = [],
  onToggle,
  emptyText = "No courts listed yet.",
  layout = "grid",
}) {
  if (!courts.length) {
    return <p className="text-xs text-white/40">{emptyText}</p>;
  }

  const list = courts.map((court) => {
    const active = selectedIds.includes(court.id);
    const img = courtImage(court);
    const subtitle =
      envLabel(court.environmentType) ||
      court.paddleOwner?.organizationName ||
      court.address ||
      "";

    return (
      <button
        key={court.id}
        type="button"
        onClick={() => onToggle(court.id)}
        className={`relative shrink-0 overflow-hidden rounded-2xl border text-left transition ${
          layout === "scroll" ? "w-[9.5rem]" : "w-full"
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
        <div className="space-y-0.5 px-2.5 py-2">
          <p className="truncate text-sm font-semibold text-white">
            {court.name}
          </p>
          {subtitle ? (
            <p className="truncate text-[11px] text-white/45">{subtitle}</p>
          ) : null}
        </div>
      </button>
    );
  });

  if (layout === "scroll") {
    return (
      <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1 touch-pan-x">
        <div className="flex w-max gap-3">{list}</div>
      </div>
    );
  }

  return <div className="grid grid-cols-4 gap-3">{list}</div>;
}
