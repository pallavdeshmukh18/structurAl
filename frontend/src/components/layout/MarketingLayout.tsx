import { useState, useRef, useEffect } from "react";
import { Link, Outlet } from "react-router-dom";
import { Button } from "../ui/Button";
import { AnimatedBackground } from "../ui/AnimatedBackground";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  LogOut,
  ChevronDown,
  ShieldAlert,
  GitPullRequest,
  Network,
  Activity,
} from "lucide-react";

export function MarketingLayout() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const username =
    user?.providers?.github?.username ||
    (user?.name ? user.name.toLowerCase().replace(/\s+/g, "") : "kawakiGG");
  const displayName = user?.name || `@${username}`;
  const avatarUrl =
    user?.avatarUrl || `https://avatars.githubusercontent.com/${username}`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900 relative">
      <AnimatedBackground />
      {/* Header */}
      <header className="bg-white/85 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
              <span className="text-white font-extrabold text-lg">S</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              structur<span className="text-indigo-600 font-extrabold">.aI</span>
            </span>
          </Link>

          <nav className="hidden md:flex space-x-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              How it Works
            </a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Pricing
            </a>
          </nav>

          <div className="flex items-center space-x-3.5">
            {user ? (
              <>
                {/* Direct link to Dashboard */}
                <Link
                  to="/dashboard"
                  className="hidden sm:inline-flex items-center space-x-1.5 text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100/70"
                >
                  <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                  <span>Dashboard</span>
                </Link>

                {/* User Profile Pill & Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    className="flex items-center space-x-2.5 bg-white border border-slate-200/90 hover:border-indigo-300 p-1.5 pr-3 rounded-full shadow-sm hover:shadow transition-all text-left cursor-pointer"
                  >
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-7 h-7 rounded-full object-cover border border-slate-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://avatars.githubusercontent.com/u/583231?v=4";
                      }}
                    />
                    <div className="hidden md:block text-xs">
                      <span className="font-bold text-slate-900 block leading-tight">
                        @{username}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                        dropdownOpen ? "rotate-180 text-indigo-600" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {user.name || `@${username}`}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono truncate">
                          {user.email || `@${username}`}
                        </p>
                      </div>

                      <div className="py-1">
                        <Link
                          to="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center space-x-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                          <span>Platform Dashboard</span>
                        </Link>
                        <Link
                          to="/repository/visualizer"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center space-x-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        >
                          <Network className="w-4 h-4 text-emerald-500" />
                          <span>AST Visualizer</span>
                        </Link>
                        <Link
                          to="/incidents"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center space-x-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        >
                          <ShieldAlert className="w-4 h-4 text-rose-500" />
                          <span>Live Incidents</span>
                        </Link>
                        <Link
                          to="/pr-review"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center space-x-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        >
                          <GitPullRequest className="w-4 h-4 text-amber-500" />
                          <span>PR Reviews</span>
                        </Link>
                        <Link
                          to="/code-health"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center space-x-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        >
                          <Activity className="w-4 h-4 text-cyan-500" />
                          <span>Code Health</span>
                        </Link>
                      </div>

                      <div className="border-t border-slate-100 pt-1 mt-1">
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center space-x-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/signin"
                  className="hidden md:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link to="/signin">
                  <Button variant="primary" className="shadow-md shadow-indigo-200">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow relative z-10">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-white border-t border-slate-200 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <span className="text-sm font-semibold text-slate-900">StructurAI</span>
          </div>
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} StructurAI Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
