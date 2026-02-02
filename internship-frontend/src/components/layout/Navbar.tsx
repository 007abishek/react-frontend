import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { logout } from "../../features/auth/authSlice";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/config";
import AvatarMenu from "../AvatarMenu";
import ThemeToggle from "../ThemeToggle";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const { user, loading } = useAppSelector((state) => state.auth);

  const cartCount = useAppSelector((state) =>
    state.cart.items.reduce(
      (total, item) => total + item.quantity,
      0
    )
  );

  if (loading || !user) return null;

  const showCart =
    location.pathname.startsWith("/products") ||
    location.pathname === "/cart";

  const handleLogout = async () => {
    await signOut(auth);
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-black text-white">
      {/* Left */}
      <div className="flex gap-6">
        <Link to="/" className="inline-block shrink-0">
          Home
        </Link>
        <Link to="/products" className="inline-block shrink-0">
          Products
        </Link>
        <Link to="/todos" className="inline-block shrink-0">
          Todos
        </Link>
        <Link to="/github" className="inline-block shrink-0">
          GitHub
        </Link>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {showCart && (
          <Link
            to="/cart"
            className="relative inline-block shrink-0"
          >
            🛒
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 rounded-full">
                {cartCount}
              </span>
            )}
          </Link>
        )}

        <ThemeToggle />
        <AvatarMenu email={user.email} />

        <button
          type="button"
          onClick={handleLogout}
          className="bg-red-600 px-4 py-1 rounded"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
