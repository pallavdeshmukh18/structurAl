import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Activity, ShieldAlert, GitPullRequest, Code2, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const mockData = [
  { name: "Mon", incidents: 4, PRs: 12 },
  { name: "Tue", incidents: 3, PRs: 18 },
  { name: "Wed", incidents: 7, PRs: 15 },
  { name: "Thu", incidents: 2, PRs: 22 },
  { name: "Fri", incidents: 1, PRs: 20 },
  { name: "Sat", incidents: 0, PRs: 5 },
  { name: "Sun", incidents: 1, PRs: 8 },
];

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your repository health and recent activity.</p>
      </div>

      {/* Stats row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Active Incidents", value: "3", icon: ShieldAlert, trend: "+2 from yesterday", trendType: "up", color: "text-rose-600" },
          { title: "Code Health Score", value: "92/100", icon: Activity, trend: "+1.2% this week", trendType: "up", color: "text-emerald-600" },
          { title: "Pending PR Reviews", value: "8", icon: GitPullRequest, trend: "-3 from yesterday", trendType: "down", color: "text-indigo-600" },
          { title: "AI Slop Detected", value: "14", icon: Code2, trend: "-2% this week", trendType: "down", color: "text-amber-500" },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                <stat.icon className={`w-4 h-4 text-slate-400`} />
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-slate-900">{stat.value}</span>
                <div className="flex items-center mt-2 text-xs text-slate-500">
                  {stat.trendType === "up" ? (
                    <ArrowUpRight className={`w-3 h-3 mr-1 ${stat.title === "Active Incidents" ? "text-rose-500" : "text-emerald-500"}`} />
                  ) : (
                    <ArrowDownRight className={`w-3 h-3 mr-1 ${stat.title === "AI Slop Detected" ? "text-emerald-500" : "text-slate-500"}`} />
                  )}
                  {stat.trend}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Chart */}
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
            <CardDescription>Incidents and PR activity over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPRs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="PRs" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorPRs)" />
                  <Area type="monotone" dataKey="incidents" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorIncidents)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
            <CardDescription>Latest runtime execution failures</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { id: "INC-1042", msg: "NullReferenceException in PaymentProcessor", time: "10 mins ago", severity: "error" },
                { id: "INC-1041", msg: "Database Timeout in UserAuth Service", time: "2 hours ago", severity: "error" },
                { id: "INC-1040", msg: "High Memory Usage Warning", time: "5 hours ago", severity: "warning" },
                { id: "INC-1039", msg: "API Rate Limit Exceeded", time: "1 day ago", severity: "warning" },
              ].map((inc, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${inc.severity === 'error' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                    <div>
                      <Link to="/incidents/1" className="text-sm font-medium text-slate-900 hover:text-indigo-600 hover:underline">
                        {inc.id}
                      </Link>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">{inc.msg}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-slate-400">
                    <Clock className="w-3 h-3 mr-1" />
                    {inc.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
