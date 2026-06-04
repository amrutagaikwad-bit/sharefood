import { Bell, HeartHandshake, MoonStar, Sun } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNotifications } from "../context/NotificationContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-green-100/80 bg-white/80 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/80">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary">
          <HeartHandshake />
          FoodBridge
        </Link>

        <div className="flex items-center gap-2">
          <NavLink className="btn-secondary hidden text-sm sm:inline-flex" to="/map">Find Food</NavLink>
          {user?.role === "RECEIVER" && (
            <NavLink className="btn-secondary hidden text-sm sm:inline-flex" to="/bookings">My Bookings</NavLink>
          )}
          {user && (
            <NavLink className="btn-secondary relative hidden text-sm sm:inline-flex" to={["ADMIN", "SUPER_ADMIN"].includes(user.role) ? "/admin" : "/dashboard"}>
              {["ADMIN", "SUPER_ADMIN"].includes(user.role) ? "Admin Panel" : "Dashboard"}
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] text-white">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          )}
          {user?.role === "DONOR" && (
            <NavLink className="btn-primary hidden text-sm sm:inline-flex" to="/donate/new">Create Donation</NavLink>
          )}
          {!user && <NavLink className="btn-secondary text-sm" to="/auth">Login</NavLink>}
          {user && (
            <button className="btn-secondary text-sm" onClick={() => { logout(); navigate("/"); }}>
              Logout
            </button>
          )}
          <button className="btn-secondary p-2" aria-label="Toggle theme" onClick={() => setDarkMode((v) => !v)}>
            {darkMode ? <Sun size={18} /> : <MoonStar size={18} />}
          </button>
          {user && <Bell size={18} className="hidden text-primary sm:block" />}
        </div>
      </nav>
    </header>
  );
}
