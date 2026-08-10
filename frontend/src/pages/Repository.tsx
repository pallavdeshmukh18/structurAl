import { Card, CardHeader, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Folder, FileCode, GitCommit, Search, GitBranch } from "lucide-react";

export function Repository() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            structurai / core-backend
            <Badge variant="outline" className="ml-2">Public</Badge>
          </h1>
          <p className="text-slate-500 mt-1">Main logic and APIs for StructurAI platform.</p>
        </div>
        <div className="flex space-x-3">
          <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 flex items-center space-x-2">
            <GitBranch className="w-4 h-4 text-slate-400" />
            <span>main</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* File Tree Sidebar */}
        <Card className="col-span-1 h-[600px] flex flex-col">
          <CardHeader className="py-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Find file..." 
                className="w-full pl-8 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </CardHeader>
          <CardContent className="p-2 flex-1 overflow-auto text-sm text-slate-600">
            <div className="space-y-1">
              <div className="flex items-center p-1.5 hover:bg-slate-100 rounded cursor-pointer">
                <Folder className="w-4 h-4 mr-2 text-indigo-400" fill="currentColor" />
                <span className="font-medium text-slate-700">src</span>
              </div>
              <div className="pl-4 space-y-1">
                <div className="flex items-center p-1.5 hover:bg-slate-100 rounded cursor-pointer bg-indigo-50 text-indigo-700">
                  <Folder className="w-4 h-4 mr-2 text-indigo-400" fill="currentColor" />
                  <span className="font-medium">services</span>
                </div>
                <div className="pl-4 space-y-1">
                  <div className="flex items-center p-1.5 hover:bg-slate-100 rounded cursor-pointer">
                    <FileCode className="w-4 h-4 mr-2 text-slate-400" />
                    <span>PaymentProcessor.ts</span>
                  </div>
                  <div className="flex items-center p-1.5 hover:bg-slate-100 rounded cursor-pointer">
                    <FileCode className="w-4 h-4 mr-2 text-slate-400" />
                    <span>AuthService.ts</span>
                  </div>
                </div>
                <div className="flex items-center p-1.5 hover:bg-slate-100 rounded cursor-pointer">
                  <Folder className="w-4 h-4 mr-2 text-slate-300" fill="currentColor" />
                  <span>controllers</span>
                </div>
                <div className="flex items-center p-1.5 hover:bg-slate-100 rounded cursor-pointer">
                  <Folder className="w-4 h-4 mr-2 text-slate-300" fill="currentColor" />
                  <span>models</span>
                </div>
              </div>
              <div className="flex items-center p-1.5 hover:bg-slate-100 rounded cursor-pointer">
                <FileCode className="w-4 h-4 mr-2 text-slate-400" />
                <span>package.json</span>
              </div>
              <div className="flex items-center p-1.5 hover:bg-slate-100 rounded cursor-pointer">
                <FileCode className="w-4 h-4 mr-2 text-slate-400" />
                <span>README.md</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Code Viewer / Main Content */}
        <div className="col-span-3 flex flex-col space-y-6">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <span className="font-medium text-slate-900">src / services / PaymentProcessor.ts</span>
              </div>
              <div className="flex items-center text-xs text-slate-500 space-x-4">
                <span className="flex items-center"><GitCommit className="w-3 h-3 mr-1" /> a1b2c3d</span>
                <span>Last updated 2 days ago</span>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 bg-slate-900 font-mono text-sm overflow-auto">
              <div className="p-6 text-slate-300">
<pre><code><span className="text-indigo-400">import</span> {'{'} Order {'}'} <span className="text-indigo-400">from</span> <span className="text-emerald-300">'../models/Order'</span>;
<span className="text-indigo-400">import</span> {'{'} StripeClient {'}'} <span className="text-indigo-400">from</span> <span className="text-emerald-300">'./StripeClient'</span>;

<span className="text-indigo-400">export class</span> <span className="text-amber-200">PaymentProcessor</span> {'{'}
  <span className="text-indigo-400">constructor</span>(private orderService: OrderService) {'{}'}

  <span className="text-indigo-400">public async</span> <span className="text-blue-300">process</span>(order: Order, paymentMethod: PaymentMethod) {'{'}
    <span className="text-rose-400">try</span> {'{'}
      <span className="text-emerald-400">console</span>.log(`Processing ${'{'}order.id{'}'}`);
      <span className="text-indigo-400">const</span> charge = <span className="text-indigo-400">await</span> StripeClient.<span className="text-blue-300">Charge</span>(paymentMethod.token);
      
      <span className="text-rose-400">if</span> (charge.status === <span className="text-emerald-300">'succeeded'</span>) {'{'}
        <span className="text-indigo-400">await</span> <span className="text-rose-400">this</span>.orderService.<span className="text-blue-300">updateStatus</span>(order.id, <span className="text-emerald-300">'PAID'</span>);
        <span className="text-rose-400">return</span> true;
      {'}'}
      <span className="text-rose-400">return</span> false;
    {'}'} <span className="text-rose-400">catch</span> (error) {'{'}
      <span className="text-emerald-400">console</span>.error(<span className="text-emerald-300">'Payment processing failed'</span>, error);
      <span className="text-rose-400">throw</span> error;
    {'}'}
  {'}'}
{'}'}
</code></pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
