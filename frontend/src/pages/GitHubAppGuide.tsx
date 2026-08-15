import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import {
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  GitBranch
} from "lucide-react";

export function GitHubAppGuide() {
  const [copiedAppUrl, setCopiedAppUrl] = useState(false);

  const appUrl = "https://github.com/apps/structural-engine";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAppUrl(true);
    setTimeout(() => setCopiedAppUrl(false), 2000);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12 space-y-12">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200 pb-8">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Link to="/incidents" className="text-xs font-mono text-indigo-600 hover:underline">
              &larr; Back to Incidents
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">GitHub App Setup</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight font-serif flex items-center gap-3">
            <GitBranch className="w-9 h-9 text-slate-900" /> StructurAI GitHub App Guide
          </h1>
          <p className="text-slate-600 text-sm mt-2 max-w-2xl">
            Track pushes, pull requests, and AST syntax bugs automatically across all your team's repositories with zero ngrok or local webhook configuration.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a href={appUrl} target="_blank" rel="noopener noreferrer">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white font-bold font-mono text-xs uppercase px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              <span>Install GitHub App &rarr;</span>
            </Button>
          </a>
        </div>
      </div>

      {/* Main Banner Hero */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl text-slate-100 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <div className="space-y-4 max-w-xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-mono font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Direct Cloud Webhook Integration
          </div>
          <h2 className="text-3xl font-serif font-bold text-white leading-tight">
            One-Click Setup for Automated Live Incident Tracking
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            By installing our official <strong>StructurAI Engine GitHub App</strong>, GitHub automatically forwards all `push` and `pull_request` webhooks directly to our cloud backend on Render.
          </p>

          <div className="pt-2 flex items-center gap-3">
            <a href={appUrl} target="_blank" rel="noopener noreferrer">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2">
                Open GitHub App Installation Page <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>

        {/* Visual Mockup Box */}
        <div className="w-full md:w-80 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 font-mono text-xs space-y-3 shadow-xl flex-shrink-0">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
            <span>GITHUB APP STATUS</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              PUBLIC
            </span>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="text-slate-300 font-bold">App Name: StructurAI Engine</div>
            <div className="text-slate-400">Target: Render Backend</div>
            <div className="text-slate-400">Events: Push, Pull Request</div>
            <div className="text-emerald-400 pt-1">✓ No ngrok needed</div>
          </div>
        </div>
      </div>

      {/* Guide Steps Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Step 1 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none"></div>
          <div>
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-mono font-bold text-xs flex items-center justify-center mb-4">
              01
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2 font-serif">Open App Page</h3>
            <p className="text-slate-600 text-xs leading-relaxed mb-4">
              Open the official StructurAI GitHub App page on GitHub.
            </p>

            <ul className="space-y-2 text-xs text-slate-700 font-medium">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Visit <a href={appUrl} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline inline-flex items-center gap-1">github.com/apps/structural-engine <ExternalLink className="w-3 h-3" /></a></span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Make sure you are logged in to your GitHub account.</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <span className="text-[11px] font-mono text-slate-400">Step 1 of 3</span>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none"></div>
          <div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-mono font-bold text-xs flex items-center justify-center mb-4">
              02
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2 font-serif">Select Repositories</h3>
            <p className="text-slate-600 text-xs leading-relaxed mb-4">
              Choose which repositories StructurAI should monitor.
            </p>

            <ul className="space-y-2 text-xs text-slate-700 font-medium">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Click the green <strong>Install</strong> or <strong>Configure</strong> button.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Select <strong>All repositories</strong> or pick specific target repos.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Click <strong>Install & Authorize</strong>.</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <span className="text-[11px] font-mono text-slate-400">Step 2 of 3</span>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-full pointer-events-none"></div>
          <div>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 font-mono font-bold text-xs flex items-center justify-center mb-4">
              03
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2 font-serif">Enjoy Live Tracking</h3>
            <p className="text-slate-600 text-xs leading-relaxed mb-4">
              You are all set! Every push or PR automatically creates live incidents.
            </p>

            <ul className="space-y-2 text-xs text-slate-700 font-medium">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Make a commit or push to your repository on GitHub.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Watch live incidents stream directly into <Link to="/incidents" className="text-indigo-600 font-bold underline">Live Incidents</Link>.</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <span className="text-[11px] font-mono text-slate-400">Step 3 of 3</span>
          </div>
        </div>

      </div>

      {/* Copy Direct Link Section */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-100 font-mono">
        <div className="flex items-center gap-3">
          <GitBranch className="w-6 h-6 text-indigo-400" />
          <span className="text-xs text-slate-300">Direct Shareable GitHub App Installation Link:</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            readOnly
            value={appUrl}
            className="bg-slate-900 border border-slate-700 text-xs text-indigo-300 px-3 py-2 rounded-lg font-mono w-full sm:w-80 outline-none"
          />
          <Button
            size="sm"
            onClick={() => copyToClipboard(appUrl)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono rounded-lg px-4 flex-shrink-0"
          >
            {copiedAppUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="ml-1.5">{copiedAppUrl ? "Copied!" : "Copy"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
