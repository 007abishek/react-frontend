import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { logout } from "../../features/auth/authSlice";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/config";
import AvatarMenu from "../AvatarMenu";
import ThemeToggle from "../ThemeToggle";
import { useEffect, useState } from "react";
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
        className="sticky top-0 z-50 flex items-center justify-between border-b border-[color:var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-4 backdrop-blur-xl transition-colors duration-300 sm:px-6 lg:px-10"
        aria-label="Primary"
      >
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className={`md:hidden flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-primary)] transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
              mobileOpen ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link to="/" className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Portal
          </Link>

          <div className="ml-4 hidden items-center gap-1 md:flex">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`relative rounded-lg px-3 py-2 text-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                  isActive(to)
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {label}
                {isActive(to) && (
                  <span className="absolute -bottom-[15px] left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[var(--color-primary)]" />
                )}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {showCart && (
            <Link
              to="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-primary)] transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              aria-label="Cart"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent-purple)] text-xs font-bold text-white">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          )}

          <ThemeToggle />
          <AvatarMenu email={user.email} />

          <button
            type="button"
            onClick={handleLogout}
            className="hidden items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-base font-semibold text-white transition-colors duration-200 hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 sm:inline-flex"
          >
            Logout
          </button>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-[60] transition-all duration-300 md:hidden ${
          mobileOpen ? "visible" : "invisible"
        }`}
      >
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileOpen(false)}
        />

        <div
          className={`absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-[var(--bg-elevated)] shadow-2xl shadow-black/20 transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[color:var(--border-subtle)] px-5 py-4">
            <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">Menu</span>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors duration-200 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {user?.email && (
            <div className="border-b border-[color:var(--border-subtle)] px-5 py-3">
              <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                Signed in as
              </p>
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">{user.email}</p>
            </div>
          )}

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3" aria-label="Mobile">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                  isActive(to)
                    ? "bg-[var(--color-primary)]/10 text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[var(--text-primary)]"
                }`}
              >
                {isActive(to) && (
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--color-primary)]" />
                )}
                {label}
              </Link>
            ))}

            {showCart && (
              <Link
                to="/cart"
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  location.pathname === "/cart"
                    ? "bg-[var(--color-primary)]/10 text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[var(--text-primary)]"
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Cart
                {cartCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-accent-purple)] px-1 text-xs font-bold text-white">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>
            )}
          </nav>

          <div className="border-t border-[color:var(--border-subtle)] px-3 py-4">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                handleLogout();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-3 text-base font-semibold text-white transition-colors duration-200 hover:bg-red-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
