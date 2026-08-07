import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBars,
  FaTimes,
  FaChartPie,
  FaBuilding,
  FaCalendarAlt,
  FaUserTie,
  FaBoxOpen,
  FaShoppingCart,
  FaSignOutAlt,
  FaNewspaper,
} from "react-icons/fa";
import OwnerOverviewPanel from "./OwnerOverviewPanel";
import OwnerCourtsPanel from "./OwnerCourtsPanel";
import OwnerBookingsPanel from "./OwnerBookingsPanel";
import OwnerCoachesPanel from "./OwnerCoachesPanel";
import OwnerProductsPanel from "./OwnerProductsPanel";
import OwnerOrdersPanel from "./OwnerOrdersPanel";
import OwnerNewsPanel from "./OwnerNewsPanel";

const navItems = [
  { id: "overview", label: "Overview", icon: FaChartPie },
  { id: "courts", label: "Courts", icon: FaBuilding },
  { id: "bookings", label: "Bookings", icon: FaCalendarAlt },
  { id: "news", label: "News", icon: FaNewspaper },
  { id: "coaches", label: "Coaches", icon: FaUserTie },
  { id: "products", label: "Products", icon: FaBoxOpen },
  { id: "orders", label: "Orders", icon: FaShoppingCart },
];

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("ownerAccessToken");
    navigate("/owner/login");
  };

  const selectTab = (id) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-white/10 bg-[#0b1219]">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/15">
          <FaBuilding className="h-5 w-5 text-[var(--color-primary)]" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Owner Dashboard</p>
          <p className="text-xs text-[var(--color-muted)]">Club management</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectTab(id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                active
                  ? "bg-[var(--color-primary)] text-[var(--color-background)]"
                  : "text-white/80 hover:bg-white/5"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-300 transition hover:bg-red-500/10"
        >
          <FaSignOutAlt className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-dvh bg-[var(--color-background)] text-white">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#0b1219] px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-2 text-white hover:bg-white/5"
          aria-label="Open menu"
        >
          <FaBars className="h-5 w-5" />
        </button>
        <p className="text-sm font-semibold">Owner Dashboard</p>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg p-2 text-red-300 hover:bg-red-500/10"
          aria-label="Logout"
        >
          <FaSignOutAlt className="h-4 w-4" />
        </button>
      </header>

      <div className="flex min-h-[calc(100dvh-57px)] lg:min-h-dvh">
        <div className="hidden lg:block lg:sticky lg:top-0 lg:h-dvh">
          {sidebar}
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              aria-label="Close menu"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex">
              {sidebar}
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="m-3 h-10 w-10 rounded-full bg-black/40 text-white"
                aria-label="Close"
              >
                <FaTimes className="mx-auto h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {activeTab === "overview" && <OwnerOverviewPanel />}
          {activeTab === "courts" && <OwnerCourtsPanel />}
          {activeTab === "bookings" && <OwnerBookingsPanel />}
          {activeTab === "news" && <OwnerNewsPanel />}
          {activeTab === "coaches" && <OwnerCoachesPanel />}
          {activeTab === "products" && <OwnerProductsPanel />}
          {activeTab === "orders" && <OwnerOrdersPanel />}
        </main>
      </div>
    </div>
  );
}
