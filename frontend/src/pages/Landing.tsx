import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { ArrowRight, Activity, GitPullRequest, Code2, ShieldAlert, Server, Cpu, Code } from "lucide-react";
import { ReactFlow, Background, MarkerType } from "@xyflow/react";
import '@xyflow/react/dist/style.css';

const previewNodes = [
  { 
    id: "1", 
    position: { x: 50, y: 50 }, 
    data: { label: "API Gateway", icon: Server }, 
    type: "default",
    style: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', fontSize: '12px' }
  },
  { 
    id: "2", 
    position: { x: 50, y: 150 }, 
    data: { label: "Order Service", icon: Cpu },
    style: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', fontSize: '12px' }
  },
  { 
    id: "3", 
    position: { x: -100, y: 250 }, 
    data: { label: "Inventory Check", icon: Code },
    style: { background: '#ffffff', border: '1px solid #10b981', borderRadius: '8px', padding: '10px', fontSize: '12px' }
  },
  { 
    id: "4", 
    position: { x: 200, y: 250 }, 
    data: { label: "Payment Processor", icon: Code },
    style: { background: '#fef2f2', border: '2px solid #ef4444', borderRadius: '8px', padding: '10px', color: '#7f1d1d', fontWeight: 'bold', fontSize: '12px' }
  },
];

const previewEdges = [
  { id: "e1-2", source: "1", target: "2", animated: true, style: { stroke: '#94a3b8' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' } },
  { id: "e2-3", source: "2", target: "3", animated: true, style: { stroke: '#10b981' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' } },
  { id: "e2-4", source: "2", target: "4", animated: true, style: { stroke: '#ef4444', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' } },
];

export function Landing() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full max-w-6xl mx-auto px-4 py-24 text-center">
        
        <h1 className="relative z-10 text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 max-w-4xl mx-auto leading-tight">
          Visual Logic Debugging <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
            Meets AI Governance
          </span>
        </h1>
        <p className="relative z-10 text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
          The premium developer platform that combines runtime execution monitoring, AI-powered root-cause analysis, and visual codebase intelligence.
        </p>
        <div className="relative z-10 flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <Link to="/signin">
            <Button size="lg" className="h-14 px-8 text-lg rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2">
              Start Debugging <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-xl bg-white">
            Book a Demo
          </Button>
        </div>
        
        {/* Preview Image mock */}
        <div className="mt-20 relative mx-auto w-full max-w-5xl">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 opacity-20 blur-lg"></div>
          <div className="relative rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col items-center justify-center aspect-video p-4">
             {/* Fake UI for the hero image */}
             <div className="w-full h-8 border-b border-slate-100 flex items-center space-x-2 mb-4 px-2">
               <div className="w-3 h-3 rounded-full bg-rose-400"></div>
               <div className="w-3 h-3 rounded-full bg-amber-400"></div>
               <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
             </div>
             <div className="flex-1 w-full bg-slate-50/50 rounded border border-slate-100 relative">
               <ReactFlow
                 nodes={previewNodes}
                 edges={previewEdges}
                 fitView
                 nodesDraggable={false}
                 panOnDrag={false}
                 zoomOnScroll={false}
                 zoomOnDoubleClick={false}
                 preventScrolling={false}
               >
                 <Background color="#cbd5e1" gap={16} />
               </ReactFlow>
             </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full max-w-7xl mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Platform Capabilities</h2>
          <p className="mt-4 text-lg text-slate-600">Everything you need to ship reliable code with confidence.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { title: "Runtime Monitoring", icon: Activity, desc: "Visualize execution traces and instantly pinpoint failing nodes in your microservices." },
            { title: "AI Root-Cause", icon: ShieldAlert, desc: "Automatically identify the underlying bug causing incidents before your users notice." },
            { title: "PR Reviews", icon: GitPullRequest, desc: "Automated, contextual PR reviews that catch 'slop', anti-patterns, and regressions." },
            { title: "Code Health", icon: Code2, desc: "Keep technical debt in check with continuous scoring and visual dependency graphs." }
          ].map((feature, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-6">
                <feature.icon className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
