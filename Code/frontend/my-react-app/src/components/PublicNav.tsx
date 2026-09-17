import { useState } from "react";
import { useApp } from "../context";
import { useNavigate } from "react-router-dom";

export default function PublicNav() {
  const { user, logout, savedIds, setShowLogin } = useApp();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Utility bar */}
      <div className="bg-cream-dark border-b border-[#ddd5c5] text-xs text-stone hidden md:block">
        <div className="max-w-7xl mx-auto px-6 flex justify-end gap-6 py-1.5">
          <button className="hover:text-navy transition-colors">Careers</button>
          <button className="hover:text-navy transition-colors">Corporate Site</button>
          <button className="hover:text-navy transition-colors">Land</button>
        </div>
      </div>

      {/* Main nav */}
      <nav className="bg-navy sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-white font-display font-bold text-xl tracking-tight hover:opacity-90 transition-opacity"
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <polygon
                points="14,2 26,24 2,24"
                fill="none"
                stroke="#E8761B"
                strokeWidth="2"
              />
              <polygon
                points="14,8 22,22 6,22"
                fill="#E8761B"
                opacity="0.3"
              />
            </svg>
            Harborstone
          </button>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: "Find Your Home", path: "/properties" },
              { label: "Mortgage Calculator", path: "/mortgage" },
              { label: "Compare", path: "/compare" },
              { label: "Analytics", path: "/analytics" },
              { label: "News", path: "/news" },
            ].map(({ label, path }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className="text-white/80 hover:text-white hover:bg-white/10 px-3 py-2 text-sm font-medium transition-all"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {savedIds.length > 0 && (
              <button
                onClick={() => navigate("/saved")}
                className="relative text-white/80 hover:text-white p-2 transition-colors"
                title="Saved properties"
              >
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>

                <span className="absolute -top-0.5 -right-0.5 bg-amber text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {savedIds.length}
                </span>
              </button>
            )}

            <button
              onClick={() => navigate("/chatbot")}
              className="text-white/80 hover:text-white p-2 transition-colors"
              title="AI Assistant"
            >
              <svg
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                {user.role === "admin" && (
                  <button
                    onClick={() => navigate("/admin")}
                    className="bg-amber text-white px-3 py-1.5 text-xs font-semibold hover:bg-amber-hover transition-colors"
                  >
                    Admin
                  </button>
                )}

                <span className="text-white/70 text-sm hidden lg:block">
                  {user.name}
                </span>

                <button
                  onClick={logout}
                  className="text-white/70 hover:text-white text-sm flex items-center gap-1 transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors px-2"
              >
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                </svg>
                Sign In
              </button>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden text-white p-1"
              onClick={() => setMobileOpen((v) => !v)}
            >
              <svg
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                {mobileOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <>
                    <path d="M3 6h18M3 12h18M3 18h18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-navy-light border-t border-white/10">
            {[
              { label: "Find Your Home", path: "/properties" },
              { label: "Mortgage Calculator", path: "/mortgage" },
              { label: "Compare Properties", path: "/compare" },
              { label: "Analytics", path: "/analytics" },
              { label: "News", path: "/news" },
              { label: "AI Chatbot", path: "/chatbot" },
              ...(savedIds.length > 0
                ? [{ label: `Saved (${savedIds.length})`, path: "/saved" }]
                : []),
            ].map(({ label, path }) => (
              <button
                key={label}
                onClick={() => {
                  navigate(path);
                  setMobileOpen(false);
                }}
                className="block w-full text-left text-white/80 hover:text-white hover:bg-white/10 px-6 py-3 text-sm font-medium border-b border-white/5 transition-all"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </nav>
    </>
  );
}