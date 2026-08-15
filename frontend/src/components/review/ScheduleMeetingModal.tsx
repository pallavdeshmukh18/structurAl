import { useState } from "react";
import { Video, Calendar, Clock, Sparkles, X, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  repositoryId?: string;
  repoFullName?: string;
  prNumber?: number;
  prTitle?: string;
  onStartInstantMeeting: (channelName: string) => void;
}

const API_BASE_URL = import.meta.env.PROD ? "" : (import.meta.env.VITE_API_BASE_URL || "");

export function ScheduleMeetingModal({
  isOpen,
  onClose,
  repositoryId,
  repoFullName,
  prNumber,
  prTitle,
  onStartInstantMeeting,
}: ScheduleMeetingModalProps) {
  const [meetingTitle, setMeetingTitle] = useState(
    prTitle ? `Review: ${prTitle}` : `PR #${prNumber || "Live"} Visual Logic Review`
  );
  const [channelName, setChannelName] = useState(
    `pr-${prNumber || "review"}-${Date.now().toString(36).slice(-4)}`
  );
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  const [isInstantMode, setIsInstantMode] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsScheduling(true);
    setError(null);

    try {
      let scheduledAt = new Date();
      if (!isInstantMode && scheduledDate && scheduledTime) {
        scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
      }

      const res = await fetch(`${API_BASE_URL}/api/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: meetingTitle,
          channelName,
          repositoryId,
          prNumber,
          scheduledAt,
          status: isInstantMode ? "LIVE" : "SCHEDULED",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create meeting session");
      }

      const data = await res.json();
      const confirmedChannel = data.channelName || channelName;

      onStartInstantMeeting(confirmedChannel);
      onClose();
    } catch (err: any) {
      console.error("Meeting creation error:", err);
      setError(err.message || "Failed to start review room.");
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Live Group PR Review</h3>
              <p className="text-xs text-slate-400">Agora RTC Audio/Video Sync with AST Canvas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle: Instant vs Schedule */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setIsInstantMode(true)}
            className={`py-2 rounded-lg transition-all flex items-center justify-center space-x-2 ${
              isInstantMode
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant Review Call</span>
          </button>

          <button
            type="button"
            onClick={() => setIsInstantMode(false)}
            className={`py-2 rounded-lg transition-all flex items-center justify-center space-x-2 ${
              !isInstantMode
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Schedule for Later</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Meeting Title */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Meeting Topic</label>
            <input
              type="text"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Memory leak fix & AST call hierarchy review"
            />
          </div>

          {/* Channel Name */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Agora RTC Channel Name</label>
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-"))}
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-indigo-300 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Schedule Date & Time Picker */}
          {!isInstantMode && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5 flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" /> Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required={!isInstantMode}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5 flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" /> Time
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required={!isInstantMode}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Context Info */}
          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Repository:</span>
              <span className="text-slate-200 font-medium">{repoFullName || "Selected Project"}</span>
            </div>
            {prNumber && (
              <div className="flex justify-between">
                <span>Pull Request:</span>
                <span className="text-indigo-400 font-mono">#{prNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Audio/Video Quality:</span>
              <span className="text-emerald-400 font-medium">1080p HD (Agora RTC)</span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isScheduling}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30"
            >
              {isScheduling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  <span>Connecting...</span>
                </>
              ) : isInstantMode ? (
                <>
                  <Video className="w-4 h-4 mr-1.5" />
                  <span>Join Live Review Call</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-1.5" />
                  <span>Schedule Call</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
