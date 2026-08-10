import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Search, Filter, ShieldAlert, Clock, ArrowRight } from "lucide-react";

export function IncidentList() {
  const incidents = [
    { id: "INC-1042", title: "NullReferenceException in PaymentProcessor", service: "payment-service", time: "10 mins ago", status: "Open", severity: "high" },
    { id: "INC-1041", title: "Database Timeout in UserAuth Service", service: "auth-service", time: "2 hours ago", status: "Open", severity: "high" },
    { id: "INC-1040", title: "High Memory Usage Warning", service: "worker-node-1", time: "5 hours ago", status: "Investigating", severity: "medium" },
    { id: "INC-1039", title: "API Rate Limit Exceeded", service: "api-gateway", time: "1 day ago", status: "Resolved", severity: "low" },
    { id: "INC-1038", title: "Redis Connection Refused", service: "cache-layer", time: "1 day ago", status: "Resolved", severity: "medium" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Incidents</h1>
          <p className="text-slate-500 mt-1">Monitor and debug runtime execution failures.</p>
        </div>
      </div>

      <div className="flex space-x-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search incidents, services, or errors..." 
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Filter className="w-4 h-4" />
          <span>Filter</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Incident</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Service</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {incidents.map((incident) => (
              <tr key={incident.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <ShieldAlert className={`w-5 h-5 mr-3 ${incident.severity === 'high' ? 'text-rose-500' : incident.severity === 'medium' ? 'text-amber-500' : 'text-slate-400'}`} />
                    <div>
                      <Link to={`/incidents/1`} className="text-sm font-medium text-indigo-600 hover:underline">
                        {incident.id}
                      </Link>
                      <div className="text-sm text-slate-900 mt-0.5">{incident.title}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-600">{incident.service}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge 
                    variant={incident.status === 'Resolved' ? 'success' : incident.status === 'Open' ? 'error' : 'warning'}
                  >
                    {incident.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1 text-slate-400" />
                    {incident.time}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link to={`/incidents/1`} className="text-indigo-600 hover:text-indigo-900 flex items-center justify-end">
                    View trace <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
