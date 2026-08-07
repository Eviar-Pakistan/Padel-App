const CATEGORY_META = {
  ANNOUNCEMENT: { label: "Announcement", hint: "Club updates" },
  TOURNAMENT: { label: "Tournament", hint: "Compete & win" },
  EVENT: { label: "Event", hint: "Special days" },
  COACHING: { label: "Coaching", hint: "Learn & grow" },
  MATCH: { label: "Match", hint: "Game time" },
  TRAINING: { label: "Training", hint: "Practice sessions" },
  PRODUCT: { label: "Product", hint: "Gear & kits" },
  OFFER: { label: "Offer", hint: "Deals & promos" },
  MEMBERSHIP: { label: "Membership", hint: "Plans & perks" },
  COURT: { label: "Court", hint: "Court news" },
  ACHIEVEMENT: { label: "Achievement", hint: "Wins & milestones" },
  COMMUNITY: { label: "Community", hint: "Players unite" },
  RECRUITMENT: { label: "Recruitment", hint: "Join the team" },
  NEWS: { label: "News", hint: "Latest updates" },
  MEDIA: { label: "Media", hint: "Photos & clips" },
};

export default function NewsCategoryPicker({
  categories = [],
  value,
  onChange,
}) {
  const list = categories.length ? categories : Object.keys(CATEGORY_META);

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/50">
            Category
          </p>
          <p className="mt-0.5 text-xs text-white/35">
            Choose how this post appears in the feed
          </p>
        </div>
        {value && (
          <span className="rounded-full border border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-[var(--color-primary)]">
            {CATEGORY_META[value]?.label || String(value).replace(/_/g, " ")}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {list.map((cat) => {
          const meta = CATEGORY_META[cat] || {
            label: cat.replace(/_/g, " "),
            hint: "Select",
          };
          const active = value === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onChange(cat)}
              className={`group relative overflow-hidden rounded-2xl border px-3 py-3 text-left transition ${
                active
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/12 shadow-[0_0_0_1px_rgba(224,242,0,0.25)]"
                  : "border-white/10 bg-[#0e1821]/80 hover:border-white/25 hover:bg-[#121c27]"
              }`}
            >
              {active && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold text-[var(--color-background)]">
                  ✓
                </span>
              )}
              <p
                className={`text-sm font-semibold leading-tight ${
                  active ? "text-[var(--color-primary)]" : "text-white"
                }`}
              >
                {meta.label}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-white/40">
                {meta.hint}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
