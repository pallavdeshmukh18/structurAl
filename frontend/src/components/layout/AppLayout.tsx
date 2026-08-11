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
  PanelLeftOpen
} from "lucide-react";
import { Badge } from "../ui/Badge";
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
  const isPrReviewActive = location.pathname.includes("/pr") || location.pathname.includes("/review");
  const isRepoOverviewActive =
    (location.pathname.startsWith("/repository") || location.pathname.startsWith("/repo")) &&
    !isVisualizerActive &&
    !isPrReviewActive;

  const navItems = [
    { name: "Dashboard", path: "/dashboard", isActive: location.pathname.startsWith("/dashboard"), icon: LayoutDashboard },
    { name: "Incidents", path: "/incidents", isActive: location.pathname.startsWith("/incidents"), icon: AlertTriangle },
    { name: "Repository", path: repoPath, isActive: isRepoOverviewActive, icon: FolderGit2 },
    { name: "Visualizer", path: visualizerPath, isActive: isVisualizerActive, icon: Network },
    { name: "PR Reviews", path: prReviewPath, isActive: isPrReviewActive, icon: GitPullRequest },
    { name: "Code Health", path: "/health", isActive: location.pathname.startsWith("/health") || location.pathname.startsWith("/code-health"), icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex relative">
      {/* Sidebar - Solid Opaque bg-white with VS Code style collapse option */}
      <aside 
        className={`${
          collapsed ? "w-16" : "w-64"
        } bg-white border-r border-slate-200 flex flex-col hidden md:flex transition-all duration-300 z-20 relative shadow-sm`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
          <Link to="/" className="flex items-center space-x-2.5 overflow-hidden">
            <img src="/logo.png" alt="StructurAI Logo" className="w-8 h-8 rounded-lg object-contain shrink-0" />
            {!collapsed && (
              <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
                structur<span className="text-indigo-600 font-extrabold">.aI</span>
              </span>
            )}
          </Link>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ml-auto"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-slate-600" />
            ) : (
              <PanelLeftClose className="w-5 h-5 text-slate-600" />
            )}
          </button>
        </div>
        
        <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
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
        </nav>

        <div className="p-3 border-t border-slate-200">
          <button
            onClick={logout}
            title={collapsed ? "Log Out" : undefined}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-rose-600 hover:bg-rose-50 font-medium transition-colors cursor-pointer ${
              collapsed ? "justify-center px-0" : ""
            }`}
          >
            <LogOut className="w-5 h-5 text-rose-500 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap text-sm">Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header - Compact Centered Floating Pill */}
        <header className="pt-4 pb-2 px-6 flex justify-center z-10">
          <div className="w-full max-w-3xl bg-white/70 backdrop-blur-md border border-slate-200/70 rounded-2xl h-12 px-6 flex items-center justify-between shadow-sm">
            <div className="md:hidden">
              <span className="text-sm font-bold text-slate-900">StructurAI</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-2 text-xs font-medium text-slate-600">
              <span className="font-bold text-slate-900">structurai/core-backend</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">main</Badge>
            </div>

            {user && (
              <div className="flex items-center space-x-2.5">
                <img
                  src={user.avatarUrl || "https://github.com/ghost.png"}
                  alt={user.name}
                  className="h-7 w-7 rounded-full border border-slate-300 object-cover"
                />
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-800">{user.name}</span>
                  {user.providers?.github?.username && (
                    <span className="text-[10px] text-indigo-600">@{user.providers.github.username}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
