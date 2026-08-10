import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, MarkerType } from "@xyflow/react";
import '@xyflow/react/dist/style.css';
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { ArrowLeft, Play, AlertCircle, Code, Server, Cpu, Activity } from "lucide-react";

// Mock Data for the graph
const initialNodes = [
  { 
    id: "1", 
    position: { x: 50, y: 50 }, 
    data: { label: "API Gateway", icon: Server }, 
    type: "default",
    style: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }
  },
  { 
    id: "2", 
    position: { x: 50, y: 150 }, 
    data: { label: "Order Service", icon: Cpu },
    style: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }
  },
  { 
    id: "3", 
    position: { x: -100, y: 250 }, 
    data: { label: "Inventory Check", icon: Code },
    style: { background: '#ffffff', border: '1px solid #10b981', borderRadius: '8px', padding: '10px' } // Success
  },
  { 
    id: "4", 
    position: { x: 200, y: 250 }, 
    data: { label: "Payment Processor", icon: Code },
    style: { background: '#fef2f2', border: '2px solid #ef4444', borderRadius: '8px', padding: '10px', color: '#7f1d1d', fontWeight: 'bold' } // Failed
  },
];

const initialEdges = [
  { id: "e1-2", source: "1", target: "2", animated: true, style: { stroke: '#94a3b8' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' } },
  { id: "e2-3", source: "2", target: "3", animated: true, style: { stroke: '#10b981' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' } },
  { id: "e2-4", source: "2", target: "4", animated: true, style: { stroke: '#ef4444', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' } },
];

export function IncidentDetail() {
  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, _setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [_selectedNode, setSelectedNode] = useState<string | null>("4");

  const onNodeClick = useCallback((_event: any, node: any) => {
    setSelectedNode(node.id);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link to="/incidents" className="p-2 rounded-lg hover:bg-slate-200 transition-colors bg-white border border-slate-200">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-slate-900">INC-1042</h1>
              <Badge variant="error">High Severity</Badge>
            </div>
            <p className="text-slate-600">NullReferenceException in PaymentProcessor</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm flex items-center space-x-2 hover:bg-indigo-700">
            <Play className="w-4 h-4" />
            <span>Replay Trace</span>
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
        {/* Graph View */}
        <Card className="col-span-2 flex flex-col overflow-hidden">
          <CardHeader className="py-4 border-b border-slate-100">
            <CardTitle className="text-sm text-slate-700 flex items-center">
              <Activity className="w-4 h-4 mr-2" /> Execution Trace Graph
            </CardTitle>
          </CardHeader>
          <div className="flex-1 w-full bg-slate-50/50 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              fitView
            >
              <Background color="#cbd5e1" gap={16} />
              <Controls className="bg-white border-slate-200 fill-slate-600" />
            </ReactFlow>
          </div>
        </Card>

        {/* Details Panel */}
        <div className="col-span-1 flex flex-col space-y-6 overflow-y-auto pr-1">
          <Card>
            <CardHeader className="py-4 border-b border-slate-100 bg-rose-50/50">
              <CardTitle className="text-rose-700 flex items-center text-sm">
                <AlertCircle className="w-4 h-4 mr-2" /> Root Cause Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-slate-700 mb-4">
                The AI identified that <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-mono text-xs">paymentMethod.token</code> was null when passed to <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-xs">StripeClient.Charge()</code>.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800 font-medium">AI Suggested Fix:</p>
                <p className="text-xs text-amber-700 mt-1">Add a null check for paymentMethod before processing, or ensure the upstream checkout service correctly validates the token.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col">
            <CardHeader className="py-4 border-b border-slate-100">
              <CardTitle className="text-sm text-slate-700 flex items-center">
                <Code className="w-4 h-4 mr-2" /> Source Code (PaymentProcessor.ts)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 bg-slate-900 rounded-b-xl overflow-hidden font-mono text-xs">
              <div className="p-4 overflow-auto h-full text-slate-300">
<pre><code><span className="text-slate-500">24 |</span>   public async process(order: Order, paymentMethod: PaymentMethod) {'{'}
<span className="text-slate-500">25 |</span>     try {'{'}
<span className="text-slate-500">26 |</span>       <span className="text-emerald-400">console</span>.log(`Processing ${'{'}order.id{'}'}`);
<span className="text-slate-500 bg-rose-900/50 block w-full px-2 -mx-2">27 |       const charge = await StripeClient.Charge(paymentMethod.token); <span className="text-rose-400">{'//'} TypeError: Cannot read properties of null (reading 'token')</span></span>
<span className="text-slate-500">28 |</span>       
<span className="text-slate-500">29 |</span>       if (charge.status === 'succeeded') {'{'}
<span className="text-slate-500">30 |</span>         await this.orderService.updateStatus(order.id, 'PAID');
<span className="text-slate-500">31 |</span>       {'}'}
</code></pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
