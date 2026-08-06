export default function AuthInput({
  label,
  icon: Icon,
  rightIcon: RightIcon,
  hint,
  className = "",
  ...props
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="mb-2 block text-sm font-medium text-[var(--color-muted)]">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
            <Icon className="h-4 w-4 text-[var(--color-primary)]" />
          </span>
        )}
        <input
          className="w-full rounded-xl border border-white/10 bg-[var(--color-surface)] py-3.5 text-base tracking-wide  text-white outline-none placeholder:text-white/30 focus:border-[var(--color-primary)]/50"
          style={{
            paddingLeft: Icon ? "2.75rem" : "1rem",
            paddingRight: RightIcon ? "2.75rem" : "1rem",
          }}
          {...props}
        />
        {RightIcon && (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
            <RightIcon className="h-4 w-4 text-[var(--color-primary)]" />
          </span>
        )}
      </div>
      {hint && (
        <p className="mt-2 text-xs text-[var(--color-muted)]">{hint}</p>
      )}
    </div>
  );
}
