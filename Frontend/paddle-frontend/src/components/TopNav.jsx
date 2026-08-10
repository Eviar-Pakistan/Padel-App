import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaBars,
  FaBell,
  FaCalendarAlt,
  FaComments,
  FaHome,
  FaInfoCircle,
  FaNewspaper,
  FaShoppingBag,
  FaShoppingCart,
  FaSignOutAlt,
  FaTimes,
  FaTrophy,
  FaUser,
  FaUserTie,
} from "react-icons/fa";
import paddleLogo from "../assets/images/padel_logo.png";
import { useCart } from "../context/CartContext";

const panelLinks = [
  { id: "home", label: "Home", icon: FaHome, path: "/" },
  { id: "news", label: "News Feed", icon: FaNewspaper, path: "/news" },
  { id: "courts", label: "Courts", icon: FaCalendarAlt, path: "/courts" },
  { id: "matches", label: "Matches", icon: FaTrophy, path: "/matches" },
  { id: "coaches", label: "Coaches", icon: FaUserTie, path: "/coaches" },
  { id: "shop", label: "Shop", icon: FaShoppingBag, path: "/shop" },
  { id: "cart", label: "Cart", icon: FaShoppingCart, path: "/cart" },
  { id: "chat", label: "Chat", icon: FaComments, path: "/chat" },
  { id: "profile", label: "Profile", icon: FaUser, path: "/profile" },
  { id: "info", label: "Padel Info", icon: FaInfoCircle, path: "/info" },
];

export default function TopNav({
  hasNotification = true,
  onNotificationClick,
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { count } = useCart();

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => setOpen(false);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    close();
    navigate("/login");
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 bg-[var(--color-background)]">
        <div className="mx-auto grid h-16 w-full max-w-md grid-cols-3 items-center px-1">
          <div className="flex items-center justify-start">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/5"
            >
              <FaBars className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center justify-center">
            <img
              src={paddleLogo}
              alt="Padel Pulse"
              className="h-10 w-auto object-contain"
            />
          </div>

          <div className="flex items-center justify-end gap-0.5">
            <button
              type="button"
              onClick={() => navigate("/cart")}
              aria-label="Cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/5"
            >
              <FaShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[9px] font-bold text-[var(--color-background)]">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
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

      <div
        className={`fixed inset-0 z-[60] transition ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={close}
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          className={`absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] max-w-md flex-col border-r border-white/10 bg-[#0b1219] shadow-2xl transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            <div className="flex items-center gap-3">
              <img
                src={paddleLogo}
                alt="Padel Pulse"
                className="h-9 w-auto object-contain"
              />
              {/* <div>
                <p className="text-sm font-bold text-white">Padel Pulse</p>
                <p className="text-xs text-white/45">Menu</p>
              </div> */}
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/5 hover:text-white"
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-1">
              {panelLinks.map(({ id, label, icon: Icon, path }) => (
                <li key={id}>
                  <Link
                    to={path}
                    onClick={close}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 hover:text-white"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-white/10 p-3">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-300 transition hover:bg-red-500/10"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                <FaSignOutAlt className="h-4 w-4" />
              </span>
              Logout
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
