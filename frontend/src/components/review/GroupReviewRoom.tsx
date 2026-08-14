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
  Play,
  AlertCircle,
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
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [screenTrack, setScreenTrack] = useState<ILocalVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isMockMode, setIsMockMode] = useState(false);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);

  // Refs for tracking local state without memory leaks or double initializations
  const localUidRef = useRef<number>(Math.floor(Math.random() * 100000) + 1);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const audioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const videoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const screenTrackRef = useRef<ILocalVideoTrack | null>(null);

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

  // Callback ref to play local video track immediately when the video element mounts into DOM
  const setLocalVideoRef = (node: HTMLDivElement | null) => {
    localVideoRef.current = node;
    if (node && videoTrackRef.current && !isVideoOff && !isScreenSharing) {
      console.log("[AGORA] Local video container ref mounted, playing video track immediately on first join");
      videoTrackRef.current.play(node);
    }
  };

  // Play local video track inside local video container ref when state or track changes
  useEffect(() => {
    if (isJoined && localVideoTrack && localVideoRef.current && !isVideoOff && !isScreenSharing) {
      localVideoTrack.play(localVideoRef.current);
    }
  }, [isJoined, localVideoTrack, isVideoOff, isScreenSharing]);

  // Cleanup WebRTC session on component unmount
  useEffect(() => {
    return () => {
      console.log("[AGORA] Unmounting room component: cleaning up active WebRTC sessions & hardware tracks");
      if (audioTrackRef.current) {
        audioTrackRef.current.stop();
        audioTrackRef.current.close();
        audioTrackRef.current = null;
      }
      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
        videoTrackRef.current.close();
        videoTrackRef.current = null;
      }
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current.close();
        screenTrackRef.current = null;
      }
      if (clientRef.current) {
        clientRef.current.removeAllListeners();
        clientRef.current.leave().catch(() => {});
        clientRef.current = null;
      }
    };
  }, []);

  // Explicit Join Call Action Triggered by User
  const handleJoinCall = async () => {
    setIsConnecting(true);
    setJoinError(null);
    const uid = localUidRef.current;
    console.log(`[AGORA] Explicit Join Call triggered for local UID: ${uid}`);

    try {
      // 1. Fetch Agora Token from Backend
      const res = await fetch(`${API_BASE_URL}/api/meetings/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelName, uid }),
      });

      const tokenData = await res.json().catch(() => ({}));
      const appId = tokenData.appId || import.meta.env.VITE_AGORA_APP_ID;
      const token = tokenData.token;

      if (!appId || appId.includes("demo_app_id") || !token || token.startsWith("DEV_MOCK_TOKEN")) {
        console.log("[AGORA] No production Agora credentials detected, entering Dev Preview Mode");
        setIsMockMode(true);
        setIsJoined(true);
        setIsConnecting(false);
        return;
      }

      // 2. Create RTC Client
      const agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = agoraClient;

      // 3. Listen to remote user events
      agoraClient.on("user-published", async (user, mediaType) => {
        // NEVER process local user as a remote participant!
        if (user.uid === uid || user.uid === agoraClient.uid) {
          console.log(`[AGORA] Ignoring local user-published for UID: ${user.uid}`);
          return;
        }

        console.log(`[AGORA] remote user published ${mediaType} - UID: ${user.uid}`);
        await agoraClient.subscribe(user, mediaType);

        if (mediaType === "video") {
          console.log(`[AGORA] remote user published video - UID: ${user.uid}`);
          setRemoteUsers((prev) => {
            if (prev.some((u) => u.uid === user.uid)) {
              return prev.map((u) => (u.uid === user.uid ? user : u));
            }
            return [...prev, user];
          });
        }

        if (mediaType === "audio") {
          console.log(`[AGORA] remote user published audio - UID: ${user.uid}`);
          if (user.audioTrack) {
            user.audioTrack.play();
          }
        }
      });

      agoraClient.on("user-unpublished", (user, mediaType) => {
        console.log(`[AGORA] remote user unpublished ${mediaType} - UID: ${user.uid}`);
        if (mediaType === "video") {
          setRemoteUsers((prev) => prev.map((u) => (u.uid === user.uid ? user : u)));
        }
      });

      agoraClient.on("user-left", (user, reason) => {
        console.log(`[AGORA] remote user left - UID: ${user.uid}, reason: ${reason}`);
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      });

      // 4. Join the Channel
      await agoraClient.join(appId, channelName, token, uid);
      console.log(`[AGORA] Joined channel "${channelName}" successfully with UID: ${uid}`);

      // 5. Create and publish local microphone & camera tracks (requests hardware permissions)
      try {
        console.log("[AGORA] Requesting hardware camera & mic permissions...");
        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        
        audioTrackRef.current = audioTrack;
        videoTrackRef.current = videoTrack;
        setLocalVideoTrack(videoTrack);

        if (localVideoRef.current && videoTrack) {
          videoTrack.play(localVideoRef.current);
        }

        // ONLY publish local tracks to channel. NEVER play local audio locally!
        await agoraClient.publish([audioTrack, videoTrack]);
        console.log("[AGORA] local tracks published successfully");
      } catch (mediaErr: any) {
        console.warn("[AGORA] Camera/microphone permission denied or device error:", mediaErr?.message);
        setJoinError("Camera or microphone permission was denied. Please allow device permissions to join call.");
        if (clientRef.current) {
          await clientRef.current.leave().catch(() => {});
          clientRef.current = null;
        }
        setIsConnecting(false);
        return;
      }

      setIsJoined(true);
    } finally {
      setIsConnecting(false);
    }
  };

  // Toggle Microphone Mute
  const toggleMute = async () => {
    if (audioTrackRef.current) {
      await audioTrackRef.current.setEnabled(isMuted);
    }
    setIsMuted(!isMuted);
  };

  // Toggle Camera Video
  const toggleVideo = async () => {
    if (videoTrackRef.current) {
      await videoTrackRef.current.setEnabled(isVideoOff);
    }
    setIsVideoOff(!isVideoOff);
  };

  // Toggle Screen Sharing
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenVideoTrack = await AgoraRTC.createScreenVideoTrack({}, "disable");
        const track = Array.isArray(screenVideoTrack) ? screenVideoTrack[0] : screenVideoTrack;
        screenTrackRef.current = track;
        setScreenTrack(track);

        if (clientRef.current && isJoined && !isMockMode) {
          if (videoTrackRef.current) await clientRef.current.unpublish(videoTrackRef.current);
          await clientRef.current.publish(track);
          if (localVideoRef.current) track.play(localVideoRef.current);
        }
        setIsScreenSharing(true);

        track.on("track-ended", async () => {
          setIsScreenSharing(false);
          if (clientRef.current && videoTrackRef.current && !isMockMode) {
            await clientRef.current.unpublish(track);
            await clientRef.current.publish(videoTrackRef.current);
            if (localVideoRef.current) videoTrackRef.current.play(localVideoRef.current);
          }
        });
      } catch (err) {
        console.error("[AGORA] Screen sharing cancelled or failed:", err);
      }
    } else {
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current.close();
        screenTrackRef.current = null;
        setScreenTrack(null);
      }
      if (clientRef.current && videoTrackRef.current && !isMockMode) {
        await clientRef.current.unpublish(screenTrack!);
        await clientRef.current.publish(videoTrackRef.current);
        if (localVideoRef.current) videoTrackRef.current.play(localVideoRef.current);
      }
      setIsScreenSharing(false);
    }
  };

  // Explicit Leave Call Action (Cleans up WebRTC session & returns to Join Call pre-join state)
  const handleLeaveCall = async () => {
    console.log("[AGORA] Leaving call: stopping local tracks & releasing WebRTC client");
    if (audioTrackRef.current) {
      audioTrackRef.current.stop();
      audioTrackRef.current.close();
      audioTrackRef.current = null;
    }
    if (videoTrackRef.current) {
      videoTrackRef.current.stop();
      videoTrackRef.current.close();
      videoTrackRef.current = null;
    }
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current.close();
      screenTrackRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.removeAllListeners();
      await clientRef.current.leave().catch(() => {});
      clientRef.current = null;
    }

    setLocalVideoTrack(null);
    setScreenTrack(null);
    setRemoteUsers([]);
    setIsJoined(false);
    setIsConnecting(false);
    setElapsedSeconds(0);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);

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

  // Actual participant count reflecting connected Agora members
  const actualParticipantCount = isJoined ? 1 + remoteUsers.length : 0;

  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 w-full ${
        isDocked ? "max-h-[380px]" : "min-h-[360px]"
      }`}
    >
      {/* Room Header */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Radio className={`w-4 h-4 ${isJoined ? "text-emerald-400 animate-pulse" : "text-slate-500"}`} />
            <span className="font-semibold text-sm text-white">Project Communication Space</span>
          </div>

          <Badge variant="outline" className="border-indigo-500/40 bg-indigo-950/60 text-indigo-300 font-mono text-xs">
            {prNumber ? `PR #${prNumber}` : `#${channelName}`}
          </Badge>

          {isConnecting ? (
            <Badge variant="outline" className="border-indigo-500/40 bg-indigo-950/60 text-indigo-300 text-xs flex items-center">
              <Loader2 className="w-3 h-3 animate-spin mr-1" /> Requesting Hardware Permissions...
            </Badge>
          ) : isJoined ? (
            isMockMode ? (
              <Badge variant="outline" className="border-amber-500/40 bg-amber-950/60 text-amber-300 text-xs">
                Dev Mode
              </Badge>
            ) : (
              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-950/60 text-emerald-300 text-xs font-semibold">
                LIVE
              </Badge>
            )
          ) : (
            <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-300 text-xs">
              Not Connected
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {isJoined && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>
          )}

          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 text-xs font-mono font-bold">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>{actualParticipantCount}</span>
          </div>

          <button
            onClick={copyRoomInvite}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Copy Review Room Invite Link"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {onToggleDock && (
            <button
              onClick={onToggleDock}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title={isDocked ? "Expand Video Grid" : "Dock Video to Side"}
            >
              {isDocked ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Container: Pre-join State vs Live WebRTC 16:9 Canvas */}
      {!isJoined ? (
        /* PRE-JOIN STATE CARD (Clean state before explicit user Join Call click) */
        <div className="flex-1 bg-slate-950/80 p-8 flex flex-col items-center justify-center text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/10">
            <Radio className="w-8 h-8 animate-pulse" />
          </div>

          <div className="max-w-md space-y-1.5">
            <h3 className="text-lg font-bold text-white tracking-tight">
              Ready to join #{channelName}?
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              {prTitle || repoFullName || "Collaborate live with your team using Agora WebRTC voice, video, and screen sharing."}
            </p>
          </div>

          {joinError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center space-x-2 max-w-md">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{joinError}</span>
            </div>
          )}

          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={handleJoinCall}
              disabled={isConnecting}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to Agora RTC...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Join Call</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* LIVE WEBRTC VIDEO CANVAS (Active call state) */
        <div className="flex-1 bg-slate-950/80 p-3 overflow-y-auto">
          <div
            className={`grid gap-3 w-full ${
              remoteUsers.length === 0
                ? "grid-cols-1 max-w-2xl mx-auto"
                : remoteUsers.length === 1
                ? "grid-cols-1 sm:grid-cols-2"
                : remoteUsers.length <= 3
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {/* Local Stream Tile - 16:9 Aspect Ratio Container */}
            <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center w-full aspect-video shadow-md">
              {isVideoOff ? (
                <div className="flex flex-col items-center justify-center text-slate-500 space-y-2 p-4 w-full h-full">
                  <div className="w-12 h-12 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-lg">
                    You
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Camera Off</span>
                </div>
              ) : (
                <div
                  ref={setLocalVideoRef}
                  className="w-full h-full aspect-video [&>div]:w-full [&>div]:h-full [&_video]:w-full [&_video]:h-full [&_video]:!object-cover [&_video]:!object-center"
                >
                  {isMockMode && (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-center p-4">
                      <div className="w-14 h-14 rounded-full bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 font-bold text-xl mb-2 animate-pulse">
                        You
                      </div>
                      <span className="text-xs font-semibold text-slate-200">Local Video Stream (16:9 HD)</span>
                      <span className="text-[10px] text-emerald-400 mt-1 flex items-center">
                        <Radio className="w-2.5 h-2.5 mr-1 animate-pulse" /> WebRTC 16:9 Audio/Video Active
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur text-[11px] font-medium text-slate-300 flex items-center space-x-1.5 z-10">
                <span>You ({isScreenSharing ? "Sharing Screen" : "Local User"})</span>
                {isMuted && <MicOff className="w-3 h-3 text-rose-400" />}
              </div>
            </div>

            {/* Remote Participant Tiles */}
            {remoteUsers.length > 0 ? (
              remoteUsers.map((remoteUser) => (
                <RemoteVideoPlayer key={remoteUser.uid} user={remoteUser} />
              ))
            ) : (
              /* Waiting State Tile with 16:9 Aspect Ratio */
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center p-4 text-center space-y-2 w-full aspect-video">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                  <Users className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-slate-300">Waiting for collaborators...</p>
                <p className="text-[11px] text-slate-500 max-w-[220px]">
                  Share the workspace link with your team to communicate live over Agora WebRTC.
                </p>
                <button
                  onClick={copyRoomInvite}
                  className="px-2.5 py-1 text-xs bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Channel Link</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Control Action Bar (Active Call Mode Controls) */}
      {isJoined && (
        <div className="bg-slate-950 px-4 py-2.5 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="truncate max-w-[220px]">
              {prTitle || repoFullName || `#${channelName}`}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Mute Button */}
            <button
              onClick={toggleMute}
              className={`p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isMuted
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
              }`}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Video Toggle Button */}
            <button
              onClick={toggleVideo}
              className={`p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isVideoOff
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
              }`}
              title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
            >
              {isVideoOff ? <VideoOff className="w-4 h-4 text-rose-400" /> : <Video className="w-4 h-4" />}
            </button>

            {/* Screen Share Button */}
            <button
              onClick={toggleScreenShare}
              className={`p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isScreenSharing
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
              }`}
              title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
            >
              <MonitorUp className="w-4 h-4" />
            </button>

            {/* Red Prominent Leave Call Button */}
            <button
              onClick={handleLeaveCall}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>Leave Call</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RemoteVideoPlayer({ user }: { user: IAgoraRTCRemoteUser }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user.videoTrack && containerRef.current) {
      console.log(`[AGORA] Playing remote video track for UID: ${user.uid}`);
      user.videoTrack.play(containerRef.current);
    }
  }, [user.videoTrack, user.uid]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center w-full aspect-video shadow-md">
      {user.hasVideo && user.videoTrack ? (
        <div
          ref={containerRef}
          className="w-full h-full aspect-video [&>div]:w-full [&>div]:h-full [&_video]:w-full [&_video]:h-full [&_video]:!object-cover [&_video]:!object-center"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-500 space-y-2 p-4 w-full h-full">
          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm font-mono">
            #{user.uid}
          </div>
          <span className="text-xs text-slate-400 font-medium">Camera Off</span>
        </div>
      )}

      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur text-[11px] font-medium text-slate-300 flex items-center space-x-1.5 z-10">
        <span>Participant #{user.uid}</span>
        {!user.hasAudio && <MicOff className="w-3 h-3 text-rose-400" />}
      </div>
    </div>
  );
}
