import { FaHome, FaMapMarkerAlt, FaCalendarAlt, FaTrophy, FaUser } from "react-icons/fa";

const items = [
  { id: "home", label: "Home", icon: FaHome },
  { id: "courts", label: "Courts", icon: FaMapMarkerAlt },
  { id: "bookings", label: "Bookings", icon: FaCalendarAlt },
  { id: "matches", label: "Matches", icon: FaTrophy },
  { id: "profile", label: "Profile", icon: FaUser },
];

export default function BottomNav({ active = "home", onChange }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[var(--color-background)]"
      aria-label="Bottom navigation"
    >
      <div className="mx-auto flex w-full max-w-md items-end justify-between px-2 pb-3 pt-2">
        {items.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange?.(id)}
              aria-current={isActive ? "page" : undefined}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <span
                className={`flex h-10 w-12 items-center justify-center rounded-xl transition-colors ${
                  isActive ? "bg-[var(--color-primary)]" : "bg-transparent"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    isActive
                      ? "text-[var(--color-background)]"
                      : "text-[var(--color-primary)]"
                  }`}
                />
              </span>
              <span
                className={`truncate text-[11px] font-medium ${
                  isActive
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-muted)]"
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
