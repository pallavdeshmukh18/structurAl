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
  Globe,
  MessageSquare,
  Send,
  ArrowRight
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
      <header className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-[92%] max-w-3xl">
        <div className="bg-white/70 backdrop-blur-md border border-slate-200/70 rounded-2xl px-6 h-14 flex items-center justify-between shadow-lg shadow-indigo-500/5">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <img src="/logo.png" alt="StructurAI Logo" className="w-8 h-8 rounded-lg object-contain group-hover:scale-105 transition-transform" />
            <span className="text-base font-bold tracking-tight text-slate-900">
              structur<span className="text-indigo-600 font-extrabold">.aI</span>
            </span>
          </Link>

          <nav className="hidden sm:flex space-x-8">
            <a href="#features" className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors uppercase tracking-wider">
              Capabilities
            </a>
            <a href="#slack-integration" className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors uppercase tracking-wider">
              Slack Bot
            </a>
            <a href="#extension" className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors uppercase tracking-wider">
              Extension
            </a>
          </nav>

          <div className="flex items-center space-x-3">
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
                <Link to="/signin">
                  <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-900 hover:text-white rounded-none px-6 uppercase tracking-widest text-xs font-bold shadow-none">
                    Login
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
      <footer className="relative z-10 bg-slate-900 text-white py-12">
        <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Left */}
          <div className="text-xs text-slate-500 font-mono tracking-widest uppercase">
            &copy; StructurAI {new Date().getFullYear()}
          </div>
          
          {/* Center */}
          <div className="flex items-center justify-center space-x-8">
             <Globe className="w-4 h-4 text-slate-500 hover:text-white transition-colors cursor-pointer" />
             <MessageSquare className="w-4 h-4 text-slate-500 hover:text-white transition-colors cursor-pointer" />
             <Send className="w-4 h-4 text-slate-500 hover:text-white transition-colors cursor-pointer" />
          </div>
          
          {/* Right */}
          <div className="flex justify-end">
            <div className="flex items-center border-b border-slate-600 pb-2 group w-64 justify-between">
              <input type="email" placeholder="Join our mailing list" className="bg-transparent outline-none text-xs placeholder-slate-500 text-white flex-1" />
              <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-white transition-colors cursor-pointer" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
