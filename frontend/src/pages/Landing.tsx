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

      {/* Features Section ("Choose your Platform" - Interactive Live Code Mesh) */}
      <section id="features" className="w-full py-24 relative z-10 border-t border-slate-200/60 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-gradient-to-tr from-indigo-500/10 via-slate-900/5 to-rose-500/10 blur-[140px] rounded-full pointer-events-none"></div>

        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          {/* Header split */}
          <div className="flex flex-col md:flex-row justify-between items-end mb-10 border-b border-slate-200 pb-8">
            <div className="flex items-center gap-6">
              <div className="hidden md:block w-1.5 h-20 bg-slate-900 rounded-full"></div>
              <div>
                <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight font-serif">
                  Choose your<br/>Platform
                </h2>
                <p className="text-slate-500 font-sans text-sm mt-2 font-medium">Live executable reasoning mesh — zero static icons, pure code & telemetry stream</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-8 md:mt-0">
              <div className="w-12 h-[1px] bg-indigo-600"></div>
              <span className="text-indigo-600 font-mono font-bold tracking-widest text-xs uppercase">01 / Terminal Topology Mesh</span>
            </div>
          </div>

          {/* Slanted Diamond / Square Canvas Layout */}
          <div className="relative min-h-[740px] w-full bg-slate-950 border border-slate-800 rounded-3xl p-6 md:p-12 shadow-2xl shadow-slate-950/50 overflow-hidden flex flex-col justify-between text-slate-100">
            {/* Subtle Matrix/Terminal Background Grid */}
            <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none"></div>

            {/* Desktop Full K4 Live Code Mesh Graph (Slanted Diamond + 2 Diagonals) */}
            <div className="relative w-full min-h-[600px] hidden lg:flex items-center justify-center">
              
              {/* SVG Edges Layer for K4 Complete Graph */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 1200 600" fill="none">
                <defs>
                  <linearGradient id="code-edge-outer" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#fb7185" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#c084fc" stopOpacity="0.8" />
                  </linearGradient>
                  <linearGradient id="code-edge-diag1" x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.8" />
                  </linearGradient>
                  <linearGradient id="code-edge-diag2" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
                  </linearGradient>
                  <filter id="glow-code" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Outer Diamond Edges */}
                <line x1="600" y1="70" x2="210" y2="300" stroke="url(#code-edge-outer)" strokeWidth="2.5" strokeDasharray="5 5" className="animate-[dash_15s_linear_infinite]" filter="url(#glow-code)" />
                <line x1="600" y1="70" x2="990" y2="300" stroke="url(#code-edge-outer)" strokeWidth="2.5" strokeDasharray="5 5" className="animate-[dash_15s_linear_infinite]" filter="url(#glow-code)" />
                <line x1="210" y1="300" x2="600" y2="530" stroke="url(#code-edge-outer)" strokeWidth="2.5" strokeDasharray="5 5" className="animate-[dash_18s_linear_infinite]" filter="url(#glow-code)" />
                <line x1="990" y1="300" x2="600" y2="530" stroke="url(#code-edge-outer)" strokeWidth="2.5" strokeDasharray="5 5" className="animate-[dash_18s_linear_infinite]" filter="url(#glow-code)" />

                {/* Diagonals */}
                <line x1="210" y1="300" x2="990" y2="300" stroke="url(#code-edge-diag1)" strokeWidth="3" strokeDasharray="8 8" className="animate-[dash_12s_linear_infinite]" filter="url(#glow-code)" />
                <line x1="600" y1="70" x2="600" y2="530" stroke="url(#code-edge-diag2)" strokeWidth="3" strokeDasharray="8 8" className="animate-[dash_14s_linear_infinite]" filter="url(#glow-code)" />

                {/* Central AI Reasoning Core Intersection */}
                <circle cx="600" cy="300" r="10" fill="#0f172a" stroke="#38bdf8" strokeWidth="3" />
                <circle cx="600" cy="300" r="22" fill="none" stroke="#f43f5e" strokeWidth="1.5" className="animate-ping opacity-60" />
                <text x="600" y="304" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">AI</text>
              </svg>

              {/* VERTEX 01: TOP (Monitoring Terminal) */}
              <div className="absolute top-[10px] left-1/2 -translate-x-1/2 z-10 w-[340px] group bg-slate-900/90 border border-slate-700/80 hover:border-indigo-500 p-4 rounded-xl shadow-2xl backdrop-blur-xl transition-all duration-300 font-mono">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-[11px]">
                  <span className="text-indigo-400 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                    01 // MONITORING_TRACE
                  </span>
                  <span className="text-slate-500">200 OK</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-[11px] text-slate-300 font-mono space-y-1">
                  <div className="text-slate-500">// Real-time span execution</div>
                  <div><span className="text-emerald-400">GET</span> /api/v1/orders <span className="text-slate-400">14ms</span></div>
                  <div><span className="text-indigo-400">TRACE_ID</span> <span className="text-slate-400">0x8f3a92...</span></div>
                </div>
              </div>

              {/* VERTEX 02: LEFT (AI Root-Cause Terminal) */}
              <div className="absolute top-[210px] left-[30px] z-10 w-[340px] group bg-slate-900/90 border border-slate-700/80 hover:border-rose-500 p-4 rounded-xl shadow-2xl backdrop-blur-xl transition-all duration-300 font-mono">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-[11px]">
                  <span className="text-rose-400 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
                    02 // ROOT_CAUSE_AI
                  </span>
                  <span className="text-rose-500 font-bold">MUTATION BUG</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-[11px] text-slate-300 font-mono space-y-1">
                  <div className="text-slate-500">// Inference result</div>
                  <div className="text-rose-300">NullPointer at line 142</div>
                  <div className="text-slate-400">Confidence: <span className="text-emerald-400 font-bold">98.4%</span></div>
                </div>
              </div>

              {/* VERTEX 04: RIGHT (PR Review Code Auditor) */}
              <div className="absolute top-[210px] right-[30px] z-10 w-[340px] group bg-slate-900/90 border border-slate-700/80 hover:border-amber-500 p-4 rounded-xl shadow-2xl backdrop-blur-xl transition-all duration-300 font-mono">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-[11px]">
                  <span className="text-amber-400 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    04 // CODE_AUDITOR
                  </span>
                  <span className="text-amber-400">PR #142</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-[11px] text-slate-300 font-mono space-y-1">
                  <div className="text-slate-500">// Automated Diff Inspection</div>
                  <div className="text-rose-400">- await db.query(rawSQL);</div>
                  <div className="text-emerald-400">+ await db.safeQuery(schema);</div>
                </div>
              </div>

              {/* VERTEX 03: BOTTOM (Code Health Metrics) */}
              <div className="absolute bottom-[10px] left-1/2 -translate-x-1/2 z-10 w-[340px] group bg-slate-900/90 border border-slate-700/80 hover:border-violet-500 p-4 rounded-xl shadow-2xl backdrop-blur-xl transition-all duration-300 font-mono">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-[11px]">
                  <span className="text-violet-400 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
                    03 // CODE_HEALTH
                  </span>
                  <span className="text-emerald-400 font-bold">SCORE: 94/100</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-[11px] text-slate-300 font-mono space-y-1">
                  <div className="text-slate-500">// Continuous Metrics</div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tech Debt Ratio:</span>
                    <span className="text-indigo-400">1.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cyclomatic Complexity:</span>
                    <span className="text-emerald-400">Low</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Mobile Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden relative z-10 my-4 font-mono">
              {[
                { title: "01 // MONITORING", code: "GET /api/v1/orders - 14ms", border: "border-indigo-500/50" },
                { title: "02 // ROOT_CAUSE", code: "NullPointer at line 142 (98% Conf)", border: "border-rose-500/50" },
                { title: "04 // CODE_AUDITOR", code: "PR #142 Safe Query Validation", border: "border-amber-500/50" },
                { title: "03 // CODE_HEALTH", code: "Health Score: 94/100 (Debt 1.2%)", border: "border-violet-500/50" }
              ].map((item, idx) => (
                <div key={idx} className={`bg-slate-900 p-4 rounded-xl border ${item.border} text-xs space-y-2`}>
                  <div className="text-indigo-400 font-bold">{item.title}</div>
                  <div className="bg-slate-950 p-2 rounded text-slate-300">{item.code}</div>
                </div>
              ))}
            </div>

            {/* Live Terminal Console Footer */}
            <div className="relative z-10 border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>$ structurai engine --live-stream --graph=K4</span>
              </div>
              <div className="text-slate-500">
                [PARALLEL_EXECUTION: ACTIVE]
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Extension Installation Section (Gallery Style) */}
      <section className="w-full py-24 relative z-10 border-t border-slate-200/60">
        <div className="max-w-[1400px] mx-auto px-6">
          {/* Header split */}
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b border-slate-200 pb-10">
            <div className="flex items-center gap-6">
              <div className="hidden md:block w-1 h-20 bg-rose-500 rounded-full"></div>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 max-w-lg leading-tight font-serif">
                Browse our<br/>Workflow
              </h2>
            </div>
            <div className="flex items-center gap-4 mt-8 md:mt-0">
              <div className="w-12 h-[1px] bg-rose-500"></div>
              <span className="text-rose-600 font-mono font-bold tracking-widest text-xs uppercase">02 / Extension</span>
            </div>
          </div>

          {/* Big Gallery Card */}
          <div className="bg-white/40 backdrop-blur-md border border-white/70 rounded-3xl p-6 md:p-12 flex flex-col lg:flex-row gap-16 items-center shadow-xl shadow-slate-900/5 hover:bg-white/50 transition-all">
            {/* Left: Image (Browser Mockup) */}
            <div className="w-full lg:w-3/5">
              <div className="relative w-full aspect-[16/10] bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden flex flex-col group">
                <img 
                  src="/Changing_pic.jpeg" 
                  alt="StructurAI Workflow" 
                  className="w-full h-full object-cover object-top opacity-60 group-hover:opacity-80 transition-opacity duration-300"
                />
              </div>
            </div>
            
            {/* Right: Details */}
            <div className="w-full lg:w-2/5 flex flex-col justify-between py-4">
              <div>
                <h3 className="text-3xl font-bold mb-2 font-serif text-slate-900 tracking-wide">Developer<br/>Solitude</h3>
                <p className="text-indigo-600 text-xs font-mono font-bold mb-6 uppercase tracking-widest mt-6">Integration:</p>
                <p className="text-slate-600 text-sm leading-relaxed mb-8">
                  Take StructurAI with you across the web. Our browser extension seamlessly integrates into your existing GitHub repositories to provide on-the-fly architectural insights and AI code reviews without breaking your flow.
                </p>
                
                <p className="text-indigo-600 text-xs font-mono font-bold mb-3 uppercase tracking-widest mt-6">Steps:</p>
                <p className="text-slate-600 text-sm leading-relaxed mb-10">
                  Download the extension archive. Enable developer mode in your browser's extension settings, and load the unpacked directory.
                </p>
              </div>
              
              <div className="mt-4">
                <a href="/extension.zip" download>
                  <Button className="w-full lg:w-4/5 rounded-xl bg-rose-500/20 text-rose-700 border border-rose-400/40 backdrop-blur-md hover:bg-rose-600 hover:text-white px-8 py-4 flex items-center justify-center uppercase tracking-widest text-xs font-bold transition-all shadow-md hover:shadow-lg">
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
