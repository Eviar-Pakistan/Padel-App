import { useState } from "react";
import PasswordToggleButton from "./PasswordToggleButton";

export default function AuthInput({
  label,
  icon: Icon,
  rightIcon: RightIcon,
  onRightIconClick,
  rightIconAriaLabel,
  hint,
  className = "",
  type = "text",
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const autoPasswordToggle = type === "password" && !RightIcon;
  const inputType = autoPasswordToggle && showPassword ? "text" : type;
  const hasRight = Boolean(RightIcon) || autoPasswordToggle;

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
          className="w-full rounded-xl border border-white/10 bg-[var(--color-surface)] py-3.5 text-base tracking-wide text-white outline-none placeholder:text-white/30 focus:border-[var(--color-primary)]/50"
          style={{
            paddingLeft: Icon ? "2.75rem" : "1rem",
            paddingRight: hasRight ? "2.75rem" : "1rem",
          }}
          {...props}
          type={inputType}
        />
        {autoPasswordToggle ? (
          <PasswordToggleButton
            show={showPassword}
            onClick={() => setShowPassword((s) => !s)}
          />
        ) : RightIcon && onRightIconClick ? (
          <button
            type="button"
            onClick={onRightIconClick}
            aria-label={rightIconAriaLabel || "Toggle"}
            className="absolute inset-y-0 right-2 flex items-center rounded-lg px-2 text-[var(--color-primary)] transition hover:bg-white/5"
          >
            <RightIcon className="h-4 w-4" />
          </button>
        ) : RightIcon ? (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
            <RightIcon className="h-4 w-4 text-[var(--color-primary)]" />
          </span>
        ) : null}
      </div>
      {hint && (
        <p className="mt-2 text-xs text-[var(--color-muted)]">{hint}</p>
      )}
    </div>
  );
}
