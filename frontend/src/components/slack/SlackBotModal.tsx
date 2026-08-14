import { useState, useEffect } from "react";
import { MessageSquare, CheckCircle2, ExternalLink, X, AlertCircle, RefreshCw, Bot, Shield, Zap } from "lucide-react";
import { Button } from "../ui/Button";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

interface SlackStatus {
  isConfigured: boolean;
  channelId?: string | null;
  installUrl?: string;
  botName?: string;
}

interface SlackBotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SlackBotModal({ isOpen, onClose }: SlackBotModalProps) {
  const [status, setStatus] = useState<SlackStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSlackStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/slack/status`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      } else {
        setError("Failed to fetch Slack bot configuration");
      }
    } catch (err) {
      console.error("Error fetching Slack status:", err);
      setError("Network error connecting to Slack bot service");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSlackStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-purple-50 text-purple-700 border border-purple-100 shrink-0">
            <MessageSquare className="w-7 h-7 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              StructurAI Slack Bot
              {status?.isConfigured && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Connected ✓
                </span>
              )}
            </h2>
            <p className="text-slate-500 text-xs font-medium">
              Bring real-time architecture telemetry, incidents, and GitHub push alerts into your Slack workspace.
            </p>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-500">Checking Slack workspace integration status...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Features Banner */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-1">
                <Zap className="w-5 h-5 text-purple-600 mx-auto" />
                <div className="text-[11px] font-bold text-slate-800">Real-Time Alerts</div>
                <div className="text-[10px] text-slate-500">Instant incident posts</div>
              </div>
              <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-1">
                <Bot className="w-5 h-5 text-indigo-600 mx-auto" />
                <div className="text-[11px] font-bold text-slate-800">GitHub Activity</div>
                <div className="text-[10px] text-slate-500">Push & PR notifications</div>
              </div>
              <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-1">
                <Shield className="w-5 h-5 text-emerald-600 mx-auto" />
                <div className="text-[11px] font-bold text-slate-800">OTel Traces</div>
                <div className="text-[10px] text-slate-500">Anomaly detection</div>
              </div>
            </div>

            {/* Connection Status Box */}
            {status?.isConfigured ? (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-3">
                <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Slack Bot is Active in Your Workspace</span>
                </div>
                <p className="text-xs text-emerald-800/90 leading-relaxed">
                  StructurAI Bot is currently listening to MongoDB telemetry events and publishing alerts into Slack channel <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200">{status.channelId || "#incidents"}</span>.
                </p>
                <div className="pt-1 flex items-center space-x-3">
                  <a
                    href="https://slack.com/app_redirect"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                  >
                    <span>Open Slack App</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Slack Bot Onboarding Guide</span>
                  <span className="text-[10px] text-purple-700 bg-purple-100 font-semibold px-2 py-0.5 rounded-full">
                    Setup Required
                  </span>
                </div>

                <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>Create a Slack App at <strong className="text-slate-800">api.slack.com/apps</strong>.</li>
                  <li>Add <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-900">chat:write</code> under Bot Token Scopes.</li>
                  <li>Copy your Bot Token (<code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-900">xoxb-...</code>) & Target Channel ID into <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-900">slack/.env</code>.</li>
                  <li>Run <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-900">npm run start</code> in the <strong className="text-slate-800">slack/</strong> directory.</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs cursor-pointer">
            Close
          </Button>

          <a
            href="https://api.slack.com/apps"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-xl text-xs px-5 py-2.5 shadow-sm transition-all cursor-pointer"
          >
            <span>{status?.isConfigured ? "Manage Slack App" : "Add to Slack →"}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
