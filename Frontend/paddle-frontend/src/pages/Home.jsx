import { useNavigate } from "react-router-dom";
import {
  FaCalendarAlt,
  FaTrophy,
  FaBroadcastTower,
  FaChartBar,
  FaMedal,
  FaComments,
  FaStar,
  FaNewspaper,
  FaUserTie,
  FaShoppingBag,
  FaInfoCircle,
} from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import banner from "../assets/images/padle_banner.png";
import paddleLogo from "../assets/images/padel_logo.png";

const menuItems = [
  { id: "booking", label: "Booking Courts", icon: FaCalendarAlt },
  { id: "matches", label: "Matches", icon: FaTrophy },
  { id: "live", label: "Live", icon: FaBroadcastTower, badge: "LIVE" },
  { id: "results", label: "Results", icon: FaChartBar },
  { id: "leaderboard", label: "Leaderboard", icon: FaMedal },
  { id: "chat", label: "Chat", icon: FaComments, count: 3 },
  { id: "players", label: "Top Players", icon: FaStar },
  { id: "news", label: "News Feed", icon: FaNewspaper },
  { id: "coaches", label: "Coaches", icon: FaUserTie },
  { id: "shop", label: "Shop", icon: FaShoppingBag },
  { id: "info", label: "Padel Info", icon: FaInfoCircle },
];

const navRoutes = {
  home: "/",
  courts: "/courts",
  bookings: "/bookings",
  matches: "/matches",
  profile: "/profile",
};

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />

      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-20">
        <section className="overflow-hidden">
          <img
            src={banner}
            alt="Play. Team Up. Rise."
            className="h-auto w-full object-cover"
          />
        </section>

        <section className="mt-5 grid grid-cols-3 gap-3">
          {menuItems.map(({ id, label, icon: Icon, badge, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (id === "news") navigate("/news");
              }}
              className="relative flex aspect-square flex-col items-start justify-between rounded-[22px] bg-[#1c2430] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:bg-[#222b38]"
            >
              {badge && (
                <span className="absolute right-2.5 top-2.5 rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                  {badge}
                </span>
              )}
              {count != null && (
                <span className="absolute right-2.5 top-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
              <Icon className="h-7 w-7 text-[var(--color-primary)]" />
              <span className="text-left text-[14px] font-medium leading-normal text-white">
                {label}
              </span>
            </button>
          ))}

          <div className="relative flex aspect-square flex-col items-center justify-center gap-2 rounded-[22px] bg-[#1c2430] px-2 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <img
              src={paddleLogo}
              alt="Padel Pulse"
              className="h-8 w-auto object-contain"
            />
            <span className="text-center text-[10px] font-medium leading-tight text-white/80">
              Play More. Rise Together.
            </span>
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-[var(--color-muted)]">
          Stay Active. Stay Connected. Stay Ahead.
        </p>
        <div className="mx-auto mt-2 flex h-3 w-16 items-center justify-center text-[var(--color-primary)]">
          <svg viewBox="0 0 64 16" className="h-3 w-full" fill="none">
            <path
              d="M1 8h14l3-5 4 10 4-8 3 3h34"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </main>

      <BottomNav
        active="home"
        onChange={(id) => {
          const path = navRoutes[id];
          if (path) navigate(path);
        }}
      />
    </div>
  );
}
