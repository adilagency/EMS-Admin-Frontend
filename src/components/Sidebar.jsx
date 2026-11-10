import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarCheck,
  MapPinned,
  Bell,
  FileBarChart,
  Settings,
  LogOut,
  X,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSidebar } from "../context/SidebarContext";
import logo from "../assets/Logo.png";

const menuItems = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Employees", path: "/employees", icon: Users },
  { name: "Branches", path: "/branches", icon: Building2 },
  { name: "Attendance", path: "/attendance", icon: CalendarCheck },
  { name: "Payroll", path: "/payroll", icon: Wallet },
  { name: "Live Tracking", path: "/live-tracking", icon: MapPinned },
  { name: "Alerts & Notifications", path: "/alerts", icon: Bell },
  { name: "Reports", path: "/reports", icon: FileBarChart },
  { name: "Settings", path: "/settings", icon: Settings },
];

const Sidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { open, closeSidebar } = useSidebar();

  const handleLogout = () => {
    logout();
    closeSidebar();
    navigate("/login");
  };

  return (
    <>
      <div
        onClick={closeSidebar}
        className={`fixed inset-0 bg-black/40 z-40 lg:hidden transition ${
          open ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        }`}
      />

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#08143b] text-white flex flex-col shadow-xl transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-4 py-5 border-b border-white/10 flex items-center justify-between gap-2">
          <div className="bg-white rounded-xl px-3 py-3 min-w-0 flex-1 flex items-center justify-center">
            <img
              src={logo}
              alt="ADIL AGENCIES PVT LTD"
              className="h-16 w-auto max-w-full object-contain"
            />
          </div>

          <button
            type="button"
            onClick={closeSidebar}
            className="lg:hidden w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center shrink-0"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-4 py-2.5 rounded-2xl transition duration-200 ${
                    isActive
                      ? "bg-white/10 text-white shadow-inner"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <div className="w-9 h-9 rounded-2xl bg-slate-900/70 flex items-center justify-center shrink-0">
                  <Icon size={17} />
                </div>

                <span className="text-sm font-medium">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
