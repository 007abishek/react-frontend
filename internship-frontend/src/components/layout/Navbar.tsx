import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { logout } from "../../features/auth/authSlice";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/config";
import AvatarMenu from "../AvatarMenu";
import ThemeToggle from "../ThemeToggle";
import { useState, useEffect } from "react";
import { selectCartCount } from "../../features/products/cartSelectors";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const { user, loading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const cartCount = useAppSelector(selectCartCount);

  if (loading || !user) return null;

  const showCart =
    location.pathname.startsWith("/products") ||
    location.pathname === "/cart";

  const handleLogout = async () => {
    await signOut(auth);
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/products", label: "Products" },
    { to: "/todos", label: "Todos" },
    { to: "/github", label: "GitHub" },
  ];

  return (
    <>
      <nav
        className="
          sticky top-0 z-50
          flex items-center justify-between
          px-4 sm:px-6 lg:px-8 py-3 sm:py-4
          bg-white/80 dark:bg-slate-900/80
          backdrop-blur-xl
          border-b border-slate-200/50 dark:border-slate-800/50
          shadow-sm shadow-black/5 dark:shadow-black/20
          transition-colors duration-300
        "
      >
        {/* ===== LEFT: Hamburger (mobile) + Nav Links (desktop) ===== */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile Hamburger */}
          <button
            type="button"
            aria-label="Open Menu"
            onClick={() => setMobileOpen(true)}
            className={`
              md:hidden flex items-center justify-center h-10 w-10
              rounded-xl text-slate-700 dark:text-slate-300
              hover:bg-slate-100 dark:hover:bg-slate-800
              transition-all duration-200
              ${mobileOpen ? "opacity-0 pointer-events-none" : "opacity-100"}
            `}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`
                  relative px-3 lg:px-4 py-2 rounded-xl
                  font-medium text-sm
                  transition-all duration-300
                  ${
                    isActive(to)
                      ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }
                `}
              >
                {label}
                {isActive(to) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full" />
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* ===== RIGHT: Actions ===== */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
          {/* Cart Icon */}
          {showCart && (
            <Link
              to="/cart"
              className="
                relative flex items-center justify-center
                h-10 w-10 rounded-xl
                text-slate-700 dark:text-slate-300
                hover:bg-slate-100 dark:hover:bg-slate-800
                transition-all duration-300 hover:scale-105 active:scale-95
              "
              aria-label="Cart"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {cartCount > 0 && (
                <span
                  className="
                    absolute -top-1 -right-1
                    flex items-center justify-center
                    h-5 w-5
                    bg-gradient-to-br from-red-500 to-pink-500
                    text-white text-xs font-bold
                    rounded-full shadow-lg shadow-red-500/30
                    animate-pulse
                  "
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          )}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Avatar Menu */}
          <AvatarMenu email={user.email} />

          {/* Logout Button — hidden on very small screens, shown sm+ */}
          <button
            type="button"
            onClick={handleLogout}
            className="
              group relative
              hidden sm:inline-flex items-center
              px-4 lg:px-5 py-2 rounded-xl
              font-medium text-sm text-white
              bg-gradient-to-r from-red-500 to-pink-500
              hover:from-red-600 hover:to-pink-600
              shadow-lg shadow-red-500/20
              hover:shadow-xl hover:shadow-red-500/30
              transition-all duration-300
              hover:scale-105 active:scale-95
              overflow-hidden
            "
          >
            <span className="relative z-10">Logout</span>
            <div
              className="
                absolute inset-0
                bg-gradient-to-r from-transparent via-white/20 to-transparent
                transform -translate-x-full
                group-hover:translate-x-full
                transition-transform duration-700
              "
            />
          </button>
        </div>
      </nav>

      {/* ===== Mobile Sidebar ===== */}
      <div
        className={`fixed inset-0 z-[60] md:hidden transition-all duration-300 ${
          mobileOpen ? "visible" : "invisible"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileOpen(false)}
        />

        {/* Drawer */}
        <div
          className={`
            absolute left-0 top-0 h-full w-72 max-w-[85vw]
            bg-white dark:bg-slate-900
            shadow-2xl shadow-black/20
            transform transition-transform duration-300 ease-out
            flex flex-col
            ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          {/* Drawer Header */}
          <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
              Menu
            </span>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close Menu"
              className="
                flex items-center justify-center h-9 w-9 rounded-xl
                text-slate-500 dark:text-slate-400
                hover:bg-slate-100 dark:hover:bg-slate-800
                transition-colors duration-200
              "
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User info */}
          {user?.email && (
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-0.5">
                Signed in as
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium truncate">
                {user.email}
              </p>
            </div>
          )}

          {/* Nav Links */}
          <nav className="flex flex-col px-3 py-3 gap-1 flex-1 overflow-y-auto">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl
                  font-medium text-sm transition-all duration-200
                  ${
                    isActive(to)
                      ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 text-blue-600 dark:text-blue-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }
                `}
              >
                {isActive(to) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0" />
                )}
                {label}
              </Link>
            ))}

            {showCart && (
              <Link
                to="/cart"
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl
                  font-medium text-sm transition-all duration-200
                  ${
                    location.pathname === "/cart"
                      ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 text-blue-600 dark:text-blue-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }
                `}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Cart
                {cartCount > 0 && (
                  <span className="ml-auto flex items-center justify-center h-5 min-w-[20px] px-1 bg-gradient-to-br from-red-500 to-pink-500 text-white text-xs font-bold rounded-full">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>
            )}
          </nav>

          {/* Drawer Footer */}
          <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                handleLogout();
              }}
              className="
                w-full flex items-center justify-center gap-2
                px-4 py-3 rounded-xl
                font-medium text-sm text-white
                bg-gradient-to-r from-red-500 to-pink-500
                hover:from-red-600 hover:to-pink-600
                shadow-lg shadow-red-500/20
                transition-all duration-300
                active:scale-95
              "
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
}