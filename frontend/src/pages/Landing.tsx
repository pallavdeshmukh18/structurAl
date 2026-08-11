import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { ArrowRight, Activity, GitPullRequest, Code2, ShieldAlert, Server, Cpu, Code, Download } from "lucide-react";
import { ReactFlow, Background, MarkerType } from "@xyflow/react";
import '@xyflow/react/dist/style.css';
import { useAuth } from "../context/AuthContext";

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
  const { user } = useAuth();
  const ctaLink = user ? "/dashboard" : "/signin";

  return (
    <div className="flex flex-col items-center w-full overflow-hidden">
      
      {/* Hero Section */}
      <section className="relative w-full max-w-[1400px] mx-auto px-6 pt-32 pb-12 flex flex-col lg:flex-row items-center min-h-[100vh]">
        {/* Left Content */}
        <div className="w-full lg:w-3/5 z-10 pr-10 lg:mt-0">
          <h1 className="text-6xl md:text-8xl lg:text-[8rem] font-extrabold tracking-tighter text-slate-900 leading-[0.85] mb-6 font-serif">
            LOGIC<span className="text-indigo-600">*</span><br />
            <span className="text-5xl md:text-7xl lg:text-[6.5rem] tracking-tight text-slate-800">DEBUG</span>
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-xl leading-relaxed">
            The premium developer platform that combines runtime execution monitoring, AI-powered root-cause analysis, and visual codebase intelligence. This month, early access only.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link to={ctaLink}>
              <Button size="lg" className="h-14 px-8 text-xs font-bold tracking-widest uppercase rounded-none shadow-md hover:shadow-lg transition-all flex items-center gap-4 bg-slate-900 text-white hover:bg-slate-800">
                {user ? "Dashboard" : "Start Debugging"} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="/extension.zip" download>
              <Button size="lg" variant="outline" className="h-14 px-8 text-xs font-bold tracking-widest uppercase rounded-none transition-all flex items-center gap-3 border-slate-300 text-slate-700 hover:bg-slate-200 hover:text-slate-900 shadow-sm hover:shadow-md">
                <Download className="w-4 h-4" /> Get Extension
              </Button>
            </a>
          </div>
        </div>

        {/* Right Content / Visual */}
        <div className="w-full lg:w-2/5 mt-12 lg:mt-0 relative">
          <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-2xl rounded-full"></div>
          <div className="relative rounded-2xl bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-2xl overflow-hidden aspect-[4/3] w-full transform lg:-rotate-2 transition-transform hover:rotate-0 duration-700">
             {/* Fake UI for the hero image */}
             <div className="w-full h-10 border-b border-slate-200/50 flex items-center space-x-2 px-4 bg-white/40">
               <div className="w-3 h-3 rounded-full bg-rose-400"></div>
               <div className="w-3 h-3 rounded-full bg-amber-400"></div>
               <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
             </div>
             <div className="flex-1 w-full h-[calc(100%-40px)] relative bg-slate-50/30">
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
      <section id="features" className="w-full bg-slate-900 text-white py-32 mt-12">
        <div className="max-w-[1400px] mx-auto px-6">
          {/* Header split */}
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 border-b border-slate-800 pb-10">
            <div className="flex items-center gap-6">
              <div className="hidden md:block w-1 h-24 bg-indigo-500"></div>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight max-w-lg leading-tight font-serif">
                Choose your<br/>Platform
              </h2>
            </div>
            <div className="flex items-center gap-4 mt-8 md:mt-0">
              <div className="w-12 h-[1px] bg-indigo-500"></div>
              <span className="text-indigo-400 font-mono font-semibold tracking-widest text-xs uppercase">01 / Capabilities</span>
            </div>
          </div>

          {/* Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { id: "01", title: "Monitoring", icon: Activity, desc: "Visualize execution traces and instantly pinpoint failing nodes in your microservices with real-time accuracy.", color: "bg-indigo-600" },
              { id: "02", title: "AI Root-Cause", icon: ShieldAlert, desc: "Automatically identify the underlying bug causing incidents before your users notice. Reduce MTTD significantly.", color: "bg-rose-500" },
              { id: "03", title: "PR Reviews", icon: GitPullRequest, desc: "Automated, contextual PR reviews that catch regressions, anti-patterns, and bad practices effortlessly.", color: "bg-amber-500" },
              { id: "04", title: "Code Health", icon: Code2, desc: "Keep technical debt in check with continuous scoring, deep analysis, and visual dependency graphs.", color: "bg-emerald-500" }
            ].map((feature, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700/50 p-8 flex flex-col h-[500px] hover:bg-slate-800 transition-colors group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-700 group-hover:bg-indigo-500 transition-colors duration-500"></div>
                <div className="text-slate-500 font-mono text-2xl font-bold mb-10 flex items-end">
                  <span className="text-white">{feature.id}</span>
                  <span className="text-xs ml-1 mb-1 opacity-50">/04</span>
                </div>
                
                <div className="flex-grow flex flex-col items-center justify-center text-center relative z-10">
                  <div className={`w-28 h-28 ${feature.color} rounded-full flex items-center justify-center mb-8 shadow-2xl transform group-hover:scale-110 transition-transform duration-500`}>
                    <feature.icon className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4 tracking-wide">{feature.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed max-w-[200px] mx-auto">{feature.desc}</p>
                </div>
                
                <div className="mt-8">
                  <Button variant="outline" className="w-full rounded-none border-slate-600 text-white bg-transparent hover:bg-indigo-600 hover:border-indigo-600 transition-all uppercase tracking-widest text-xs font-bold h-12">
                    Explore
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Extension Installation Section (Gallery Style) */}
      <section className="w-full bg-slate-900 text-white py-32 border-t border-slate-800/50">
        <div className="max-w-[1400px] mx-auto px-6">
          {/* Header split */}
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 border-b border-slate-800 pb-10">
            <div className="flex items-center gap-6">
              <div className="hidden md:block w-1 h-24 bg-rose-500"></div>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight max-w-lg leading-tight font-serif">
                Browse our<br/>Workflow
              </h2>
            </div>
            <div className="flex items-center gap-4 mt-8 md:mt-0">
              <div className="w-12 h-[1px] bg-rose-500"></div>
              <span className="text-rose-400 font-mono font-semibold tracking-widest text-xs uppercase">02 / Extension</span>
            </div>
          </div>

          {/* Big Gallery Card */}
          <div className="bg-slate-800/30 border border-slate-700/50 p-6 md:p-12 flex flex-col lg:flex-row gap-16 items-center">
            {/* Left: Image (Browser Mockup) */}
            <div className="w-full lg:w-3/5">
              <div className="relative w-full aspect-[16/10] bg-slate-950 rounded shadow-2xl border border-slate-700 overflow-hidden flex flex-col">
                {/* Browser Chrome */}
                <div className="h-10 bg-slate-900 border-b border-slate-800 flex items-center px-4 space-x-2">
                  <div className="flex space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                  </div>
                  <div className="ml-4 flex-1 bg-slate-950 h-6 rounded border border-slate-800 flex items-center px-3">
                    <span className="text-[10px] text-slate-500 font-mono">github.com/pulls</span>
                  </div>
                </div>
                
                {/* Browser Content */}
                <div className="flex-1 p-8 flex flex-col gap-6 relative">
                  {/* Mock Github PR UI */}
                  <div className="flex items-start gap-5">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex-shrink-0"></div>
                    <div className="flex-1 space-y-3 mt-1">
                      <div className="h-4 bg-slate-700 rounded w-1/3"></div>
                      <div className="h-2 bg-slate-800 rounded w-full"></div>
                      <div className="h-2 bg-slate-800 rounded w-5/6"></div>
                    </div>
                  </div>
                  <div className="flex items-start gap-5 opacity-40">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex-shrink-0"></div>
                    <div className="flex-1 space-y-3 mt-1">
                      <div className="h-4 bg-slate-700 rounded w-1/4"></div>
                      <div className="h-2 bg-slate-800 rounded w-full"></div>
                    </div>
                  </div>
                  
                  {/* Extension Popup Mockup */}
                  <div className="absolute right-8 top-8 w-64 bg-indigo-950 border border-indigo-500/30 rounded shadow-2xl overflow-hidden flex flex-col z-10 animate-fade-in-up">
                    <div className="bg-indigo-600 text-white text-[10px] font-bold tracking-widest uppercase px-4 py-3 flex justify-between items-center">
                      StructurAI
                      <Activity className="w-3 h-3" />
                    </div>
                    <div className="p-5 space-y-4 bg-indigo-950">
                      <div className="h-2 bg-indigo-500/40 rounded w-1/2"></div>
                      <div className="h-1.5 bg-indigo-900 rounded w-full"></div>
                      <div className="h-1.5 bg-indigo-900 rounded w-4/5"></div>
                      <div className="h-1.5 bg-indigo-900 rounded w-full"></div>
                      <div className="h-10 mt-6 bg-indigo-600 hover:bg-indigo-500 cursor-pointer rounded text-[11px] text-white flex items-center justify-center font-bold tracking-wider uppercase transition-colors">
                        Analyze PR
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right: Details */}
            <div className="w-full lg:w-2/5 flex flex-col justify-between py-4">
              <div>
                <h3 className="text-3xl font-bold mb-2 font-serif text-white tracking-wide">Developer<br/>Solitude</h3>
                <p className="text-indigo-400 text-xs font-mono mb-8 uppercase tracking-widest mt-6">Integration:</p>
                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                  Take StructurAI with you across the web. Our browser extension seamlessly integrates into your existing GitHub repositories to provide on-the-fly architectural insights and AI code reviews without breaking your flow.
                </p>
                
                <p className="text-indigo-400 text-xs font-mono mb-4 uppercase tracking-widest mt-8">Steps:</p>
                <p className="text-slate-400 text-sm leading-relaxed mb-12">
                  Download the extension archive. Enable developer mode in your browser's extension settings, and load the unpacked directory.
                </p>
              </div>
              
              <div className="mt-4">
                <a href="/extension.zip" download>
                  <Button className="w-full lg:w-4/5 rounded-none bg-rose-600 hover:bg-rose-500 text-white px-8 py-6 flex items-center justify-center uppercase tracking-widest text-xs font-bold transition-colors">
                    Download Extension
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
