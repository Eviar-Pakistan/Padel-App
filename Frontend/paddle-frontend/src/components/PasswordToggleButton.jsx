import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function PasswordToggleButton({ show, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={show ? "Hide password" : "Show password"}
      className="absolute inset-y-0 right-1.5 flex items-center rounded-lg px-2 text-[var(--color-primary)] transition hover:bg-white/5"
    >
      {show ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
    </button>
  );
}
