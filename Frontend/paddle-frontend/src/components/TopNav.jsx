import { FaBell } from "react-icons/fa";
import paddleLogo from "../assets/images/padel_logo.png";

export default function TopNav({
  hasNotification = true,
  onNotificationClick,
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-[var(--color-background)]">
      <div className="mx-auto grid h-16 w-full max-w-md grid-cols-3 items-center px-4">
        <div aria-hidden />

        <div className="flex items-center justify-center">
          <img
            src={paddleLogo}
            alt="Padel Pulse"
            className="h-10 w-auto object-contain"
          />
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onNotificationClick}
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-full"
          >
            <FaBell className="h-5 w-5 text-white" />
            {hasNotification && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
