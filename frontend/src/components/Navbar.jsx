import { HeartHandshake, MoonStar, Sun } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 border-b border-green-100 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <nav className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary">
          <HeartHandshake />
          FoodBridge
        </Link>

        <div className="flex items-center gap-2">
          <NavLink className="btn-secondary hidden sm:inline-flex" to="/map">Map</NavLink>
          {user && <NavLink className="btn-secondary hidden sm:inline-flex" to="/dashboard">Dashboard</NavLink>}
          {user?.role === "DONOR" && <NavLink className="btn-primary hidden sm:inline-flex" to="/donate/new">Donate</NavLink>}
          {!user && <NavLink className="btn-secondary" to="/auth">Login</NavLink>}
          {user && (
            <button
              className="btn-secondary"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              Logout
            </button>
          )}
          <button className="btn-secondary p-2" onClick={() => setDarkMode((v) => !v)}>
            {darkMode ? <Sun size={18} /> : <MoonStar size={18} />}
          </button>
        </div>
      </nav>
    </header>
  );
}

