import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu, Moon, PenSquare, Sun, X } from "lucide-react";

import Button from "@/components/ui/8bit/Button";
import ButtonLink from "@/components/ui/8bit/ButtonLink";
import { useAuth } from "@/auth/auth-context";
import { useTheme } from "@/theme/theme-context";

const linkClass = ({ isActive }) =>
  `pixel-label px-2 py-2 border-2 ${
    isActive
      ? "bg-invert text-invert-ink border-ink"
      : "border-transparent text-ink-muted hover:text-ink"
  }`;

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    navigate("/");
  }

  return (
    <header className="border-b-2 border-ink bg-canvas sticky top-0 z-20">
      <div className="mx-auto w-full max-w-4xl px-4">
        <div className="flex items-center justify-between gap-4 py-3">
          <Link
            to="/"
            className="pixel-title text-base sm:text-lg shrink-0"
            onClick={() => setMenuOpen(false)}
          >
            BLOG
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
            <NavLink to="/" end className={linkClass}>
              Home
            </NavLink>
            <NavLink to="/categories" className={linkClass}>
              Categories
            </NavLink>
            {isAuthenticated && (
              <>
                <NavLink to="/me" className={linkClass}>
                  My Posts
                </NavLink>
                <ButtonLink to="/posts/new" variant="primary" size="sm">
                  <PenSquare size={12} aria-hidden="true" />
                  New Post
                </ButtonLink>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              title={isDark ? "Light theme" : "Dark theme"}
            >
              {isDark ? (
                <Sun size={14} aria-hidden="true" />
              ) : (
                <Moon size={14} aria-hidden="true" />
              )}
            </Button>

            <div className="hidden md:flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <span className="pixel-label text-ink-muted max-w-32 truncate">
                    {user?.user_name ?? "..."}
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleSignOut}>
                    <LogOut size={12} aria-hidden="true" />
                    Log Out
                  </Button>
                </>
              ) : (
                <>
                  <ButtonLink to="/login" variant="ghost" size="sm">
                    Log In
                  </ButtonLink>
                  <ButtonLink to="/register" variant="primary" size="sm">
                    Register
                  </ButtonLink>
                </>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? (
                <X size={16} aria-hidden="true" />
              ) : (
                <Menu size={16} aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        {menuOpen && (
          <nav
            id="mobile-nav"
            className="md:hidden border-t-2 border-ink py-3 flex flex-col gap-2"
            aria-label="Primary"
          >
            <NavLink to="/" end className={linkClass} onClick={() => setMenuOpen(false)}>
              Home
            </NavLink>
            <NavLink
              to="/categories"
              className={linkClass}
              onClick={() => setMenuOpen(false)}
            >
              Categories
            </NavLink>
            {isAuthenticated && (
              <>
                <NavLink
                  to="/me"
                  className={linkClass}
                  onClick={() => setMenuOpen(false)}
                >
                  My Posts
                </NavLink>
                <ButtonLink
                  to="/posts/new"
                  variant="primary"
                  className="w-full"
                  onClick={() => setMenuOpen(false)}
                >
                  <PenSquare size={12} aria-hidden="true" />
                  New Post
                </ButtonLink>
                <p className="pixel-label text-ink-muted px-2 pt-2">
                  Signed in as {user?.user_name ?? "..."}
                </p>
                <Button variant="ghost" onClick={handleSignOut} className="w-full">
                  <LogOut size={12} aria-hidden="true" />
                  Log Out
                </Button>
              </>
            )}
            {!isAuthenticated && (
              <div className="flex flex-col gap-2 pt-1">
                <ButtonLink
                  to="/login"
                  variant="ghost"
                  onClick={() => setMenuOpen(false)}
                  className="w-full"
                >
                  Log In
                </ButtonLink>
                <ButtonLink
                  to="/register"
                  variant="primary"
                  onClick={() => setMenuOpen(false)}
                  className="w-full"
                >
                  Register
                </ButtonLink>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}