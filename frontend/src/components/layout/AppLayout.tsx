import { Link, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, AlertTriangle, GitPullRequest, Activity, FolderGit2, LogOut } from "lucide-react";
import { Badge } from "../ui/Badge";
import { useAuth } from "../../context/AuthContext";

export function AppLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Incidents", path: "/incidents", icon: AlertTriangle },
    { name: "Repository", path: "/repo", icon: FolderGit2 },
    { name: "PR Reviews", path: "/pr/1", icon: GitPullRequest },
    { name: "Code Health", path: "/health", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-lg font-bold text-slate-900">StructurAI</span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path.split('/')[1] ? `/${item.path.split('/')[1]}` : item.path);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive 
                    ? "bg-indigo-50 text-indigo-700 font-medium" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-rose-600 hover:bg-rose-50 font-medium transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-rose-500" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header - Mobile Only or Profile */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:px-8 shadow-sm z-10">
          <div className="md:hidden">
            <span className="text-lg font-bold text-slate-900">StructurAI</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-slate-700">structurai/core-backend</span>
              <Badge variant="outline">main</Badge>
            </div>
            {user && (
              <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
                <img
                  src={user.avatarUrl || "https://github.com/ghost.png"}
                  alt={user.name}
                  className="h-8 w-8 rounded-full border border-slate-300 object-cover"
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
