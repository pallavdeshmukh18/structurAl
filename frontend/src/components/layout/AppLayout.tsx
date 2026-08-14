import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  AlertTriangle, 
  GitPullRequest, 
  Activity, 
  FolderGit2, 
  LogOut, 
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Puzzle,
  Download,
  ArrowUpRight,
  Users,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export function AppLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Extract repo ID from location.pathname if currently inside /repository/:id or /repository/:id/visualizer
  const repoIdMatch = location.pathname.match(/\/repository\/([^/]+)/);
  const rawMatchedId = repoIdMatch ? repoIdMatch[1] : null;
  const currentRepoId =
    rawMatchedId &&
    rawMatchedId !== "visualizer" &&
    rawMatchedId !== "undefined" &&
    rawMatchedId !== "null"
      ? rawMatchedId
      : null;

  const repoPath = currentRepoId ? `/repository/${currentRepoId}` : "/dashboard";
  const visualizerPath = currentRepoId ? `/repository/${currentRepoId}/visualizer` : "/repository/visualizer";
  const prReviewPath = currentRepoId ? `/repository/${currentRepoId}/pr/1` : "/pr-review";

  const isVisualizerActive = location.pathname.includes("/visualizer");
  const isPrReviewActive =
    location.pathname === "/pr-review" ||
    location.pathname.startsWith("/pr-review/") ||
    location.pathname.startsWith("/pr/") ||
    /\/repository\/[^/]+\/(pr|pull)(\/|$)/.test(location.pathname);

  const isProjectsActive = location.pathname.startsWith("/projects");

  const isRepoOverviewActive =
    (location.pathname.startsWith("/repository") ||
      location.pathname.startsWith("/repositories") ||
      location.pathname.startsWith("/repo")) &&
    !isVisualizerActive &&
    !isPrReviewActive &&
    !isProjectsActive;

  const navItems = [
    { name: "Dashboard", path: "/dashboard", isActive: location.pathname.startsWith("/dashboard"), icon: LayoutDashboard },
    { name: "Incidents", path: "/incidents", isActive: location.pathname.startsWith("/incidents"), icon: AlertTriangle },
    { name: "Repository", path: repoPath, isActive: isRepoOverviewActive, icon: FolderGit2 },
    { name: "Visualizer", path: visualizerPath, isActive: isVisualizerActive, icon: Network },
    { name: "Collaborative Projects", path: "/projects", isActive: isProjectsActive, icon: Users },
    { name: "PR Reviews", path: prReviewPath, isActive: isPrReviewActive, icon: GitPullRequest },
    { name: "Code Health", path: "/health", isActive: location.pathname.startsWith("/health") || location.pathname.startsWith("/code-health"), icon: Activity },
  ];

  return (
    <div className="h-screen w-screen bg-slate-50 flex overflow-hidden">
      {/* Sidebar - Fixed 100vh height, stationary relative to viewport */}
      <aside 
        className={`${
          collapsed ? "w-16" : "w-64"
        } h-screen shrink-0 bg-white border-r border-slate-200 flex flex-col hidden md:flex transition-all duration-200 ease-in-out z-20 relative shadow-sm overflow-hidden`}
      >
        {/* Sidebar Header */}
        {collapsed ? (
          <div className="h-16 flex items-center justify-center border-b border-slate-200 shrink-0 px-2">
            <button
              onClick={() => setCollapsed(false)}
              title="Expand sidebar"
              className="group relative w-11 h-11 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {/* StructurAI Logo (Default Visible) */}
              <img
                src="/logo.png"
                alt="StructurAI Logo"
                className="w-10 h-10 rounded-xl object-contain transition-all duration-200 group-hover:opacity-0 group-hover:scale-90 group-focus:opacity-0 group-focus:scale-90"
              />

              {/* Expand Icon (Revealed on Hover / Keyboard Focus) */}
              <PanelLeftOpen
                className="w-6 h-6 text-slate-700 absolute opacity-0 scale-90 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 group-focus:opacity-100 group-focus:scale-100"
              />
            </button>
          </div>
        ) : (
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 shrink-0">
            <Link to="/dashboard" className="flex items-center space-x-3 overflow-hidden">
              <img src="/logo.png" alt="StructurAI Logo" className="w-10 h-10 rounded-xl object-contain shrink-0" />
              <span className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
                structur<span className="text-indigo-600 font-extrabold">.aI</span>
              </span>
            </Link>

            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ml-auto focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        )}
        
        <nav className="flex-1 px-2.5 py-4 flex flex-col justify-between overflow-y-auto min-h-0">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  title={collapsed ? item.name : undefined}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                    collapsed ? "justify-center px-0" : ""
                  } ${
                    item.isActive 
                      ? "bg-indigo-50 text-indigo-700 font-medium" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${item.isActive ? "text-indigo-600" : "text-slate-400"}`} />
                  {!collapsed && <span className="whitespace-nowrap text-sm">{item.name}</span>}
                </Link>
              );
            })}
          </div>

          {/* Chrome Extension Download CTA */}
          <div className="pt-3 mt-3 border-t border-slate-100 shrink-0">
            {collapsed ? (
              <a
                href="/extension.zip"
                download
                title="Get Chrome Extension"
                className="flex items-center justify-center p-2.5 rounded-lg text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/60 transition-colors cursor-pointer"
              >
                <Puzzle className="w-5 h-5 text-emerald-600 shrink-0" />
              </a>
            ) : (
              <a
                href="/extension.zip"
                download
                className="group block p-3 rounded-xl bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-200/70 hover:border-emerald-300 transition-all shadow-2xs cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-emerald-100/80 text-emerald-700 shrink-0">
                      <Puzzle className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-emerald-950 truncate flex items-center gap-1">
                        Get Extension
                        <Download className="w-3 h-3 text-emerald-600 opacity-75 group-hover:translate-y-0.5 transition-transform" />
                      </span>
                      <span className="text-[10px] text-emerald-700/80 truncate">
                        Install Chrome extension
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
              </a>
            )}
          </div>
        </nav>

        <div className="p-3 border-t border-slate-200 shrink-0 space-y-2">
          {user && (
            <div className={`flex items-center ${collapsed ? "justify-center" : "space-x-2.5 px-2 py-1"}`}>
              <img
                src={user.avatarUrl || "https://github.com/ghost.png"}
                alt={user.name}
                className="h-7 w-7 rounded-full border border-slate-300 object-cover shrink-0"
                title={collapsed ? `${user.name} (@${user.providers?.github?.username || "github"})` : undefined}
              />
              {!collapsed && (
                <div className="flex flex-col text-left truncate min-w-0">
                  <span className="text-xs font-semibold text-slate-800 truncate" title={user.name}>
                    {user.name}
                  </span>
                  {user.providers?.github?.username && (
                    <span className="text-[10px] text-indigo-600 truncate">
                      @{user.providers.github.username}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={logout}
            title={collapsed ? "Log Out" : undefined}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 font-medium transition-colors cursor-pointer ${
              collapsed ? "justify-center px-0" : ""
            }`}
          >
            <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap text-xs">Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area - Independent vertical scroll container */}
      <main className="flex-1 min-w-0 h-screen flex flex-col overflow-y-auto">
        <div className="flex-1 p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
