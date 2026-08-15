import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import {
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Radio,
  Terminal
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export function SlackGuide() {
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const sampleEnv = `SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL_ID=C0BQFCH7UQ4
MONGODB_URI=mongodb://pallav_db:oUR8eUk85rjJEzTC@ac-iyu1usg-shard-00-00.lpzeogh.mongodb.net:27017...
POLL_INTERVAL_MS=5000`;

  const copyToClipboard = (text: string, type: "env" | "cmd") => {
    navigator.clipboard.writeText(text);
    if (type === "env") {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    }
  };

  const handleTestPing = async () => {
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/webhooks/github`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-github-event": "ping",
        },
        body: JSON.stringify({
          zen: "Interactive Slack Guide test ping from web console.",
          repository: {
            id: Date.now(),
            name: "structurAl-demo",
            full_name: "structurAI/demo",
            owner: { login: "structurAI" },
          },
        }),
      });

      if (res.ok) {
        setTestResult("✅ Telemetry test ping sent! The Slack bot will broadcast this incident within 5 seconds.");
      } else {
        setTestResult("⚠️ Sent ping to backend. Ensure Slack Bot service is running (cd slack && npm start).");
      }
    } catch {
      setTestResult("❌ Could not connect to backend. Verify backend server is running on port 5001.");
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12 space-y-12">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200 pb-8">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Link to="/" className="text-xs font-mono text-indigo-600 hover:underline">
              &larr; Return to Home
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Slack Integration Guide</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight font-serif flex items-center gap-3">
            Slack Bot Setup & Configuration
          </h1>
          <p className="text-slate-600 text-sm mt-2 max-w-2xl">
            Complete step-by-step instructions to connect StructurAI with your organization's Slack workspace for real-time incident alerting.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            onClick={handleTestPing}
            disabled={testSending}
            className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold font-mono text-xs uppercase px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Radio className={`w-4 h-4 ${testSending ? "animate-spin" : "animate-pulse"}`} />
            <span>{testSending ? "Dispatching..." : "Test Trigger Alert"}</span>
          </Button>
        </div>
      </div>

      {testResult && (
        <div className="p-4 rounded-xl bg-slate-900 text-slate-200 border border-slate-700 text-xs font-mono flex items-center justify-between">
          <span>{testResult}</span>
          <button onClick={() => setTestResult(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Guide Steps Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Step 1 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none"></div>
          <div>
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-mono font-bold text-xs flex items-center justify-center mb-4">
              01
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2 font-serif">Create Slack App</h3>
            <p className="text-slate-600 text-xs leading-relaxed mb-4">
              Go to the Slack API developer portal and create a workspace bot application.
            </p>

            <ul className="space-y-2 text-xs text-slate-700 font-medium">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Visit <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline inline-flex items-center gap-1">api.slack.com/apps <ExternalLink className="w-3 h-3" /></a></span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Click <strong>Create an App &rarr; From scratch</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Select your team workspace (e.g. <code>adobe(ghee-khatam)</code>)</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <span className="text-[11px] font-mono text-slate-400">Time required: ~1 min</span>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none"></div>
          <div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-mono font-bold text-xs flex items-center justify-center mb-4">
              02
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2 font-serif">Add OAuth Scopes</h3>
            <p className="text-slate-600 text-xs leading-relaxed mb-4">
              Grant the bot permission to write messages to your workspace channels.
            </p>

            <ul className="space-y-2 text-xs text-slate-700 font-medium">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Navigate to <strong>OAuth & Permissions</strong> in sidebar</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Under <strong>Bot Token Scopes</strong>, add <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-bold">chat:write</code></span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Click <strong>Install to Workspace</strong> & copy token (starts with <code>xoxb-</code>)</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <span className="text-[11px] font-mono text-slate-400">Token Format: xoxb-XXXX</span>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-full pointer-events-none"></div>
          <div>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 font-mono font-bold text-xs flex items-center justify-center mb-4">
              03
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2 font-serif">Channel ID & Bot Invite</h3>
            <p className="text-slate-600 text-xs leading-relaxed mb-4">
              Obtain the Channel ID and invite the bot to your target channel.
            </p>

            <ul className="space-y-2 text-xs text-slate-700 font-medium">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>In Slack desktop, click your channel name at top & scroll to bottom for <strong>Channel ID</strong> (e.g. <code>C0BQFCH7UQ4</code>)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Type <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-bold">/invite @StructurAI</code> in the channel</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <span className="text-[11px] font-mono text-slate-400">Channel ID Format: C0XXXXXX</span>
          </div>
        </div>

      </div>

      {/* Interactive Environment Configuration & Run Section */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl text-slate-100 font-mono space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Configuration File</span>
            <h2 className="text-2xl font-bold text-white mt-1 font-serif">slack/.env Template</h2>
          </div>
          <Button
            onClick={() => copyToClipboard(sampleEnv, "env")}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-mono flex items-center gap-2"
          >
            {copiedToken ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedToken ? "Copied .env Template!" : "Copy .env Template"}</span>
          </Button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-x-auto">
          <pre className="text-xs text-slate-300 leading-relaxed font-mono">
            {sampleEnv}
          </pre>
        </div>

        {/* Start Command */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white font-serif flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" /> Service Execution Commands
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <code className="text-xs text-emerald-400 font-mono">
              cd slack && npm install && npm start
            </code>
            <Button
              size="sm"
              onClick={() => copyToClipboard("cd slack && npm install && npm start", "cmd")}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-lg"
            >
              {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
