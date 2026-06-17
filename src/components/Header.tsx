import { useEffect, useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";
import { Link } from "react-router";
import { UserProfileSaveError, useAuth } from "../context/AuthContext";

export default function Header() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { currentUser, userProfile, loading, loginWithGoogle, logout } =
    useAuth();
  const [authError, setAuthError] = useState<string | null>(null);

  const toggleMenu = () => setIsOpen(!isOpen);
  const displayName = currentUser?.displayName ?? currentUser?.email ?? "User";
  const googleLoginError = "Google login failed. Please try again.";
  const shouldShowAuthError = Boolean(
    authError && (!currentUser || authError !== googleLoginError),
  );

  useEffect(() => {
    if (currentUser) {
      setAuthError((error) => (error === googleLoginError ? null : error));
    }
  }, [currentUser]);

  const handleLogin = async () => {
    setAuthError(null);

    try {
      await loginWithGoogle();
      setAuthError(null);
    } catch (error) {
      if (error instanceof UserProfileSaveError) {
        setAuthError(error.message);
        return;
      }

      if (error && typeof error === "object") {
        const firebaseError = error as { code?: string; message?: string };
        console.error("Google login failed:", {
          code: firebaseError.code,
          message: firebaseError.message,
        });
      } else {
        console.error("Google login failed:", error);
      }

      setAuthError(googleLoginError);
    }
  };

  const handleLogout = async () => {
    setAuthError(null);

    try {
      await logout();
    } catch {
      setAuthError("Logout failed. Please try again.");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-parchment shadow-sm border-b border-lavender-grey/30 bg-background-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3 cursor-pointer">
              <img
                src="https://westfield.webfx.com.my/wp-content/webp-express/webp-images/uploads/2026/03/top-logo.png.webp"
                alt="Company Logo"
                className="w-24 object-contain"
              />
          </div>

          <div className="hidden md:flex items-center gap-4">
            {shouldShowAuthError && (
              <p className="text-xs text-secondary-300" role="status">
                {authError}
              </p>
            )}

            <Link
              to="/properties"
              className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-300 transition-colors hover:text-white"
            >
              Properties
            </Link>

            {currentUser ? (
              <>
                {userProfile?.role === "admin" && (
                  <Link
                    to="/admin"
                    className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-300 transition-colors hover:text-white"
                  >
                    Admin
                  </Link>
                )}
                <div className="flex items-center gap-3 text-background-50">
                  {currentUser.photoURL && (
                    <img
                      src={currentUser.photoURL}
                      alt={displayName}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  )}
                  <span className="max-w-36 truncate text-sm">
                    {displayName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loading}
                  className="border border-secondary-400 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-secondary-300 transition-colors hover:bg-secondary-400 hover:text-background-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="bg-secondary-400 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-background-900 transition-colors hover:bg-secondary-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Loading..." : "Login with Google"}
              </button>
            )}
          </div>

          {/* mobile */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="text-background-100 hover:text-slate-indigo focus:outline-none p-2"
              aria-label="Toggle menu"
            >
              {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden border-t border-white/10 py-4">
            {shouldShowAuthError && (
              <p className="mb-3 text-xs text-secondary-300" role="status">
                {authError}
              </p>
            )}

            {currentUser ? (
              <div className="flex flex-col gap-4">
                <Link
                  to="/properties"
                  className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-300 transition-colors hover:text-white"
                  onClick={() => setIsOpen(false)}
                >
                  Properties
                </Link>
                {userProfile?.role === "admin" && (
                  <Link
                    to="/admin"
                    className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-300 transition-colors hover:text-white"
                    onClick={() => setIsOpen(false)}
                  >
                    Admin
                  </Link>
                )}
                <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3 text-background-50">
                  {currentUser.photoURL && (
                    <img
                      src={currentUser.photoURL}
                      alt={displayName}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  )}
                  <span className="truncate text-sm">{displayName}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loading}
                  className="border border-secondary-400 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-secondary-300 transition-colors hover:bg-secondary-400 hover:text-background-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Logout
                </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <Link
                  to="/properties"
                  className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-300 transition-colors hover:text-white"
                  onClick={() => setIsOpen(false)}
                >
                  Properties
                </Link>
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full bg-secondary-400 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-background-900 transition-colors hover:bg-secondary-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Loading..." : "Login with Google"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
