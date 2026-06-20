import { useEffect, useState } from "react";
import { FiHeart, FiMessageCircle } from "react-icons/fi";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import { getDashboardPath } from "./ProtectedRoute";
import { useAuth } from "../context/AuthContext";

const publicLinks = [
  { label: "Home", to: "/#home" },
  { label: "About Us", to: "/#about-us" },
  { label: "Help", to: "/#help" },
  { label: "Properties", to: "/properties.php" },
];

const logoSrc = "/rentspace-logo.png";

type NavItem = {
  label: string;
  to: string;
  variant?: "host";
};

function getInitials(name?: string, email?: string) {
  const source = name?.trim() || email?.trim() || "User";
  const parts = source.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2)).toUpperCase();
}

export default function Navbar() {
  const { currentUser, userProfile, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const savedTheme = window.localStorage.getItem("rentspace-theme");
    if (savedTheme) return savedTheme === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const isLoggedIn = Boolean(currentUser && userProfile);
  const googlePhotoUrl = currentUser?.photoURL;
  const userRoles = userProfile?.roles ?? (userProfile ? [userProfile.role] : []);
  const hasOwnerDashboard = userRoles.includes("owner");
  const hasTenantDashboard = userRoles.includes("tenant");
  const links: NavItem[] = isLoggedIn
    ? [
        ...publicLinks,
        ...(hasTenantDashboard ? [{ label: "Request", to: getDashboardPath("tenant") }] : []),
        ...(hasTenantDashboard ? [{ label: "My Rentals", to: "/my-rentals" }] : []),
        ...(hasOwnerDashboard ? [{ label: "Host Dashboard", to: getDashboardPath("owner"), variant: "host" as const }] : []),
      ]
    : publicLinks;

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const getHashLinkClass = (to: string) => {
    const targetHash = to.includes("#") ? to.slice(to.indexOf("#")) : "";
    const isHomeRoute = location.pathname === "/";
    const isActive =
      isHomeRoute &&
      (targetHash === "#home" ? !location.hash || location.hash === "#home" : location.hash === targetHash);

    return `rounded-full px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
      isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
    }`;
  };

  const getRouteLinkClass = (isActive: boolean, variant?: NavItem["variant"]) => {
    if (variant === "host") {
      return `rounded-full border px-3 py-2 text-sm font-bold transition-colors sm:px-4 ${
        isActive
          ? "border-emerald-300 bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
          : "border-emerald-300/50 bg-emerald-400/10 text-emerald-200 hover:border-emerald-300 hover:bg-emerald-400 hover:text-slate-950"
      }`;
    }

    return `rounded-full px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
      isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
    }`;
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    window.localStorage.setItem("rentspace-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  return (
    <header className="site-header sticky top-0 z-50 px-4 py-5 sm:px-6">
      <nav className="site-navbar mx-auto flex max-w-7xl flex-wrap items-center gap-3 rounded-[2rem] border border-white/10 bg-slate-900/80 p-2 shadow-2xl shadow-black/30 backdrop-blur-xl sm:rounded-full">
        <NavLink
          to="/"
          aria-label="RentSpace home"
          className="flex min-h-12 shrink-0 items-center rounded-full bg-emerald-400 px-5 shadow-lg shadow-emerald-500/20 transition-transform hover:scale-[1.02] sm:px-6"
        >
          <img src={logoSrc} alt="RentSpace" className="h-6 w-auto object-contain sm:h-7" />
        </NavLink>

        <div className="order-3 flex w-full flex-wrap items-center justify-center gap-1 px-1 sm:order-2 sm:min-w-0 sm:flex-1 sm:gap-2 sm:px-3">
          {loading ? (
            <span className="px-3 py-2 text-sm text-slate-400">Checking account...</span>
          ) : (
            links.map((link) =>
              link.to.includes("#") ? (
                <Link key={link.to} to={link.to} className={getHashLinkClass(link.to)}>
                  {link.label}
                </Link>
              ) : (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => getRouteLinkClass(isActive, link.variant)}
                >
                  {link.label}
                </NavLink>
              ),
            )
          )}
        </div>

        <div className="order-2 ml-auto flex shrink-0 items-center gap-2 sm:order-3 sm:ml-0">
          <NavLink
            to="/favorites"
            aria-label="Open favorites"
            title="Favorites"
            className={({ isActive }) =>
              `grid h-11 w-11 place-items-center rounded-full border text-lg transition-colors ${
                isActive
                  ? "border-emerald-300 bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
                  : "border-white/15 bg-white/5 text-slate-300 hover:border-white/30 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <FiHeart aria-hidden="true" />
          </NavLink>

          <NavLink
            to="/chat"
            aria-label="Open chat"
            title="Chat"
            className={({ isActive }) =>
              `grid h-11 w-11 place-items-center rounded-full border text-lg transition-colors ${
                isActive
                  ? "border-emerald-300 bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
                  : "border-white/15 bg-white/5 text-slate-300 hover:border-white/30 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <FiMessageCircle aria-hidden="true" />
          </NavLink>

          <button
            type="button"
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={isDarkMode}
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setIsDarkMode((enabled) => !enabled)}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/5 text-lg text-slate-300 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden="true">{isDarkMode ? "☾" : "☼"}</span>
          </button>

          {!loading && !isLoggedIn && (
            <NavLink
              to="/login.html"
              className="rounded-full bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition-colors hover:bg-indigo-500 sm:px-6"
            >
              Login
            </NavLink>
          )}

          {isLoggedIn && userProfile && (
            <div
              className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-emerald-300/40 bg-gradient-to-br from-emerald-300 to-cyan-500 text-xs font-black text-slate-950 shadow-lg shadow-cyan-500/10"
              title={`${userProfile.name || userProfile.email} · ${userProfile.role}`}
              aria-label={`${userProfile.name || userProfile.email}, ${userProfile.role}`}
            >
              {googlePhotoUrl ? (
                <img
                  src={googlePhotoUrl}
                  alt={userProfile.name || userProfile.email || "Google profile"}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                getInitials(userProfile.name, userProfile.email)
              )}
            </div>
          )}

          {isLoggedIn && (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-white/10 px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white sm:px-4"
            >
              Logout
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
