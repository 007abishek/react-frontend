import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { logout } from "../../features/auth/authSlice";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/config";
import AvatarMenu from "../AvatarMenu";
import ThemeToggle from "../ThemeToggle";

// ✅ NEW: safe selector
import { selectCartCount } from "../../features/products/cartSelectors";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const { user, loading } = useAppSelector((state) => state.auth);

  // ✅ FIX: use memoized, NaN-safe selector
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
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="
        sticky top-0 z-50
        flex items-center justify-between
        px-6 lg:px-8 py-4
        bg-white/80 dark:bg-slate-900/80
        backdrop-blur-xl
        border-b border-slate-200/50 dark:border-slate-800/50
        shadow-sm shadow-black/5 dark:shadow-black/20
        transition-colors duration-300
      "
    >
      {/* ===== Left - Navigation Links ===== */}
      <div className="flex items-center gap-1 lg:gap-2">
        <Link
          to="/"
          className={`
            relative px-4 py-2 rounded-xl
            font-medium text-sm
            transition-all duration-300
            ${
              isActive("/")
                ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }
          `}
        >
          Home
          {isActive("/") && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full" />
          )}
        </Link>

        <Link
          to="/products"
          className={`
            relative px-4 py-2 rounded-xl
            font-medium text-sm
            transition-all duration-300
            ${
              isActive("/products")
                ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }
          `}
        >
          Products
          {isActive("/products") && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full" />
          )}
        </Link>

        <Link
          to="/todos"
          className={`
            relative px-4 py-2 rounded-xl
            font-medium text-sm
            transition-all duration-300
            ${
              isActive("/todos")
                ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }
          `}
        >
          Todos
          {isActive("/todos") && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full" />
          )}
        </Link>

        <Link
          to="/github"
          className={`
            relative px-4 py-2 rounded-xl
            font-medium text-sm
            transition-all duration-300
            ${
              isActive("/github")
                ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }
          `}
        >
          GitHub
          {isActive("/github") && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full" />
          )}
        </Link>
      </div>

      {/* ===== Right - Actions ===== */}
      <div className="flex items-center gap-3">
        {/* Cart Icon */}
        {showCart && (
          <Link
            to="/cart"
            className="
              relative
              flex items-center justify-center
              h-10 w-10
              rounded-xl
              text-slate-700 dark:text-slate-300
              hover:bg-slate-100 dark:hover:bg-slate-800
              transition-all duration-300
              hover:scale-105
              active:scale-95
            "
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>

            {/* ✅ Cart Count Badge */}
            {cartCount > 0 && (
              <span
                className="
                  absolute -top-1 -right-1
                  flex items-center justify-center
                  h-5 w-5
                  bg-gradient-to-br from-red-500 to-pink-500
                  text-white text-xs font-bold
                  rounded-full
                  shadow-lg shadow-red-500/30
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

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="
            group
            relative
            px-5 py-2
            rounded-xl
            font-medium text-sm
            text-white
            bg-gradient-to-r from-red-500 to-pink-500
            hover:from-red-600 hover:to-pink-600
            shadow-lg shadow-red-500/20
            hover:shadow-xl hover:shadow-red-500/30
            transition-all duration-300
            hover:scale-105
            active:scale-95
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
  );
}
