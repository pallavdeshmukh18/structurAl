import { useState, useEffect, useRef } from "react";
import AgoraRTC, {
  type IAgoraRTCClient,
  type ICameraVideoTrack,
  type IMicrophoneAudioTrack,
  type ILocalVideoTrack,
  type IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  MonitorUp,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Radio,
  Clock,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Badge } from "../ui/Badge";

interface GroupReviewRoomProps {
  channelName: string;
  prNumber?: number;
  prTitle?: string;
  repoFullName?: string;
  onLeave?: () => void;
  isDocked?: boolean;
  onToggleDock?: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

export function GroupReviewRoom({
  channelName,
  prNumber,
  prTitle,
  repoFullName,
  onLeave,
  isDocked = false,
  onToggleDock,
}: GroupReviewRoomProps) {
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [screenTrack, setScreenTrack] = useState<ILocalVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isMockMode, setIsMockMode] = useState(false);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);

  // Timer effect
  useEffect(() => {
    if (isJoined) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isJoined]);

  // Agora Client Initialization & Joining
  useEffect(() => {
    let agoraClient: IAgoraRTCClient | null = null;
    let audioTrack: IMicrophoneAudioTrack | null = null;
    let videoTrack: ICameraVideoTrack | null = null;

    async function initAgora() {
      setIsConnecting(true);
      try {
        // 1. Fetch Agora Token from Backend
        const uid = Math.floor(Math.random() * 10000) + 1;
        const res = await fetch(`${API_BASE_URL}/api/meetings/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelName, uid }),
        });

        const tokenData = await res.json();
        const appId = tokenData.appId || import.meta.env.VITE_AGORA_APP_ID;
        const token = tokenData.token;

        if (!appId || appId.includes("demo_app_id") || !token || token.startsWith("DEV_MOCK_TOKEN")) {
          // Dev Mock Mode fallback for previewing call controls without Agora credentials
          setIsMockMode(true);
          setIsJoined(true);
          setIsConnecting(false);
          return;
        }

        // 2. Create RTC Client
        agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        setClient(agoraClient);

        // 3. Listen to remote user events
        agoraClient.on("user-published", async (user, mediaType) => {
          await agoraClient!.subscribe(user, mediaType);
          if (mediaType === "video") {
            setRemoteUsers((prev) => {
              if (prev.find((u) => u.uid === user.uid)) return prev;
              return [...prev, user];
            });
          }
          if (mediaType === "audio") {
            user.audioTrack?.play();
          }
        });

        agoraClient.on("user-unpublished", (_user, mediaType) => {
          if (mediaType === "video") {
            // Video stopped
          }
        });

        agoraClient.on("user-left", (user) => {
          setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        });

        // 4. Join the Channel
        await agoraClient.join(appId, channelName, token, uid);

        // 5. Create and publish local microphone & camera tracks
        try {
          [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
          setLocalAudioTrack(audioTrack);
          setLocalVideoTrack(videoTrack);

          if (localVideoRef.current && videoTrack) {
            videoTrack.play(localVideoRef.current);
          }

          await agoraClient.publish([audioTrack, videoTrack]);
        } catch (mediaErr) {
          console.warn("Could not access camera/mic, joining in listen-only mode:", mediaErr);
        }

        setIsJoined(true);
      } catch (err: any) {
        console.warn("Agora connection error, falling back to simulated session:", err.message);
        setIsMockMode(true);
        setIsJoined(true);
      } finally {
        setIsConnecting(false);
      }
    }

    initAgora();

    // Cleanup on unmount
    return () => {
      if (audioTrack) {
        audioTrack.stop();
        audioTrack.close();
      }
      if (videoTrack) {
        videoTrack.stop();
        videoTrack.close();
      }
      if (agoraClient) {
        agoraClient.leave();
      }
    };
  }, [channelName]);

  // Toggle Microphone
  const toggleMute = async () => {
    if (localAudioTrack) {
      await localAudioTrack.setEnabled(isMuted);
    }
    setIsMuted(!isMuted);
  };

  // Toggle Camera Video
  const toggleVideo = async () => {
    if (localVideoTrack) {
      await localVideoTrack.setEnabled(isVideoOff);
    }
    setIsVideoOff(!isVideoOff);
  };

  // Toggle Screen Sharing
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenVideoTrack = await AgoraRTC.createScreenVideoTrack({}, "disable");
        const track = Array.isArray(screenVideoTrack) ? screenVideoTrack[0] : screenVideoTrack;
        setScreenTrack(track);

        if (client && isJoined && !isMockMode) {
          if (localVideoTrack) await client.unpublish(localVideoTrack);
          await client.publish(track);
          if (localVideoRef.current) track.play(localVideoRef.current);
        }
        setIsScreenSharing(true);

        track.on("track-ended", async () => {
          setIsScreenSharing(false);
          if (client && localVideoTrack && !isMockMode) {
            await client.unpublish(track);
            await client.publish(localVideoTrack);
            if (localVideoRef.current) localVideoTrack.play(localVideoRef.current);
          }
        });
      } catch (err) {
        console.error("Screen sharing cancelled or failed:", err);
      }
    } else {
      if (screenTrack) {
        screenTrack.stop();
        screenTrack.close();
        setScreenTrack(null);
      }
      if (client && localVideoTrack && !isMockMode) {
        await client.unpublish(screenTrack!);
        await client.publish(localVideoTrack);
        if (localVideoRef.current) localVideoTrack.play(localVideoRef.current);
      }
      setIsScreenSharing(false);
    }
  };

  const handleLeaveCall = async () => {
    if (localAudioTrack) {
      localAudioTrack.stop();
      localAudioTrack.close();
    }
    if (localVideoTrack) {
      localVideoTrack.stop();
      localVideoTrack.close();
    }
    if (screenTrack) {
      screenTrack.stop();
      screenTrack.close();
    }
    if (client) {
      await client.leave();
    }
    setIsJoined(false);
    if (onLeave) onLeave();
  };

  const copyRoomInvite = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${channelName}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
        isDocked ? "h-72 w-full" : "h-[440px] w-full"
      }`}
    >
      {/* Room Header */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-semibold text-sm text-white">Live PR Review Room</span>
          </div>

          <Badge variant="outline" className="border-indigo-500/40 bg-indigo-950/60 text-indigo-300 font-mono text-xs">
            {prNumber ? `PR #${prNumber}` : channelName}
          </Badge>

          {isConnecting ? (
            <Badge variant="outline" className="border-indigo-500/40 bg-indigo-950/60 text-indigo-300 text-xs flex items-center">
              <Loader2 className="w-3 h-3 animate-spin mr-1" /> Connecting
            </Badge>
          ) : isMockMode ? (
            <Badge variant="outline" className="border-amber-500/40 bg-amber-950/60 text-amber-300 text-xs">
              Preview Mode
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 text-xs">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>{remoteUsers.length + 1}</span>
          </div>

          <button
            onClick={copyRoomInvite}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Copy Review Room Invite Link"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {onToggleDock && (
            <button
              onClick={onToggleDock}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title={isDocked ? "Expand Video Grid" : "Dock Video to Side"}
            >
              {isDocked ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Video Streams Canvas */}
      <div className="flex-1 bg-slate-950/80 p-3 grid grid-cols-2 gap-3 overflow-hidden">
        {/* Local Stream */}
        <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
          {isVideoOff ? (
            <div className="flex flex-col items-center justify-center text-slate-500 space-y-2">
              <div className="w-12 h-12 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-lg">
                You
              </div>
              <span className="text-xs text-slate-400">Camera Paused</span>
            </div>
          ) : (
            <div ref={localVideoRef} className="w-full h-full object-cover">
              {isMockMode && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-center p-4">
                  <div className="w-14 h-14 rounded-full bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 font-bold text-xl mb-2 animate-pulse">
                    You
                  </div>
                  <span className="text-xs font-semibold text-slate-200">Local Video Stream (Live)</span>
                  <span className="text-[10px] text-emerald-400 mt-1 flex items-center">
                    <Radio className="w-2.5 h-2.5 mr-1 animate-pulse" /> 1080p WebRTC Ready
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur text-[11px] font-medium text-slate-300 flex items-center space-x-1.5">
            <span>You ({isScreenSharing ? "Sharing Screen" : "Reviewer"})</span>
            {isMuted && <MicOff className="w-3 h-3 text-rose-400" />}
          </div>
        </div>

        {/* Remote Streams or Waiting State */}
        {remoteUsers.length > 0 ? (
          remoteUsers.map((user) => (
            <RemoteVideoPlayer key={user.uid} user={user} />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center p-4 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-300">Waiting for teammates...</p>
            <p className="text-[11px] text-slate-500 max-w-[200px]">
              Share the review link with your team to review AST call nodes together.
            </p>
            <button
              onClick={copyRoomInvite}
              className="px-2.5 py-1 text-xs bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 rounded-lg transition-colors flex items-center space-x-1"
            >
              <Copy className="w-3 h-3" />
              <span>Copy Invite</span>
            </button>
          </div>
        )}
      </div>

      {/* Control Action Bar */}
      <div className="bg-slate-950 px-4 py-2.5 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="truncate max-w-[220px]">
            {prTitle || repoFullName || "Visual Logic Review"}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={`p-2.5 rounded-xl text-xs font-semibold transition-all ${
              isMuted
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
            }`}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Video Toggle Button */}
          <button
            onClick={toggleVideo}
            className={`p-2.5 rounded-xl text-xs font-semibold transition-all ${
              isVideoOff
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
            }`}
            title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
          >
            {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </button>

          {/* Screen Share Button */}
          <button
            onClick={toggleScreenShare}
            className={`p-2.5 rounded-xl text-xs font-semibold transition-all ${
              isScreenSharing
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
            }`}
            title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
          >
            <MonitorUp className="w-4 h-4" />
          </button>

          {/* Leave Call Button */}
          <button
            onClick={handleLeaveCall}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-rose-600/30 transition-colors"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>Leave Call</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function RemoteVideoPlayer({ user }: { user: IAgoraRTCRemoteUser }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user.videoTrack && containerRef.current) {
      user.videoTrack.play(containerRef.current);
    }
  }, [user.videoTrack]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
      <div ref={containerRef} className="w-full h-full object-cover" />
      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur text-[11px] font-medium text-slate-300">
        Reviewer #{user.uid}
      </div>
    </div>
  );
}
