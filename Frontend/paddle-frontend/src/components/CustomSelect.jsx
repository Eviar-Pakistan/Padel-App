import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FaCheck, FaChevronDown, FaSearch } from "react-icons/fa";

/**
 * @param {{
 *   label?: string;
 *   value: string;
 *   onChange: (value: string) => void;
 *   options: Array<string | { value: string; label: string }>;
 *   placeholder?: string;
 *   searchable?: boolean;
 *   searchPlaceholder?: string;
 *   className?: string;
 * }} props
 */
export default function CustomSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select",
  searchable = false,
  searchPlaceholder = "Search...",
  allowEmpty = true,
  required = false,
  icon: Icon,
  className = "",
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const normalized = useMemo(
    () =>
      options.map((opt) =>
        typeof opt === "string" ? { value: opt, label: opt } : opt
      ),
    [options]
  );

  const selected = normalized.find((o) => String(o.value) === String(value));
  const display = selected?.label || "";

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return normalized;
    const q = query.trim().toLowerCase();
    return normalized.filter((o) => o.label.toLowerCase().includes(q));
  }, [normalized, query, searchable]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open && searchable) {
      setQuery("");
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open, searchable]);

  const pick = (next) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative block ${className}`}>
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-[var(--color-muted)]">
          {label}
          {required && <span className="ml-0.5 text-red-400">*</span>}
        </span>
      )}

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-xl border bg-[#0e1821] py-3 pl-3 pr-3.5 text-left text-sm outline-none transition ${
          open
            ? "border-[var(--color-primary)]/50"
            : "border-white/10 hover:border-white/20"
        }`}
      >
        {Icon && (
          <Icon className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
        )}
        <span
          className={`min-w-0 flex-1 truncate ${
            display ? "text-white" : "text-white/35"
          }`}
        >
          {display || placeholder}
        </span>
        <FaChevronDown
          className={`h-3 w-3 shrink-0 text-white/45 transition ${
            open ? "rotate-180 text-[var(--color-primary)]" : ""
          }`}
        />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1.5 overflow-hidden rounded-xl border border-white/10 bg-[#152230] shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
        >
          {searchable && (
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
              <FaSearch className="h-3 w-3 shrink-0 text-white/35" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              />
            </div>
          )}

          <ul className="max-h-56 overflow-y-auto py-1">
            {allowEmpty && (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={!value}
                  onClick={() => pick("")}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition ${
                    !value
                      ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "text-white/50 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>{placeholder}</span>
                </button>
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-white/35">No matches</li>
            ) : (
              filtered.map((opt) => {
                const active = String(opt.value) === String(value);
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => pick(opt.value)}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition ${
                        active
                          ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                          : "text-white hover:bg-white/5"
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {active && (
                        <FaCheck className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
