import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Users, Shield, ArrowRight, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "../components/ui/Button";

const API_BASE_URL = import.meta.env.PROD ? "" : (import.meta.env.VITE_API_BASE_URL || "");

export function ProjectJoin() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [joining, setJoining] = useState(false);
  const [joinedSuccess, setJoinedSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 1. Check current session user and verify token validity
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setError("Invalid invitation link. No token provided.");
        setLoading(false);
        return;
      }

      try {
        // Fetch current user session
        const authRes = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: "include" });
        if (authRes.ok) {
          const authData = await authRes.json();
          if (authData.user) {
            setCurrentUser(authData.user);
          }
        }

        // Verify token with backend
        const res = await fetch(`${API_BASE_URL}/api/projects/invitations/verify?token=${token}`);
        if (res.ok) {
          const data = await res.json();
          setInvitationData(data);
        } else {
          const errData = await res.json().catch(() => ({}));
          setError(errData.error || "This invitation link is invalid or has expired.");
        }
      } catch (err: any) {
        setError("Failed to verify invitation link. Please check your network connection.");
      } finally {
        setLoading(false);
      }
    }

    verifyToken();
  }, [token]);

  // 2. Accept Invitation Handler
  const handleAcceptInvitation = async () => {
    if (!token) return;
    setJoining(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/invitations/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        const data = await res.json();
        setJoinedSuccess(true);
        setTimeout(() => {
          navigate(`/projects/${data.projectId}`);
        }, 1200);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to accept invitation.");
      }
    } catch {
      setError("An error occurred while accepting the invitation.");
    } finally {
      setJoining(false);
    }
  };

  const handleGitHubLogin = () => {
    // Store return URL to return to join page after login
    window.location.href = `${API_BASE_URL}/api/auth/github`;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="flex items-center justify-center space-x-2.5 border-b border-slate-800/80 pb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-indigo-500/20">
            S
          </div>
          <span className="text-xl font-bold text-white tracking-tight">StructurAI</span>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Verifying invitation link...</p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Invitation Unavailable</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
            </div>
            <Button
              onClick={() => navigate("/dashboard")}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold px-5 mt-2"
            >
              Go to Dashboard
            </Button>
          </div>
        ) : joinedSuccess ? (
          /* Success Joined State */
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-white">Welcome to the Team!</h3>
              <p className="text-xs text-slate-400">Redirecting to project workspace...</p>
            </div>
          </div>
        ) : (
          /* Valid Invitation State */
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Collaborative Project Invitation</span>
              </div>

              <h2 className="text-xl font-extrabold text-white pt-1">
                {invitationData?.project?.name}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                {invitationData?.project?.description || "Software architecture intelligence & live WebRTC collaboration space."}
              </p>
            </div>

            {/* Inviter Info Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3">
              <img
                src={invitationData?.inviter?.avatarUrl || "https://github.com/github.png"}
                alt="Inviter"
                className="w-10 h-10 rounded-xl border border-slate-700 object-cover"
              />
              <div className="text-xs">
                <p className="text-slate-400">Invited by</p>
                <p className="font-bold text-white text-sm">
                  {invitationData?.inviter?.name || invitationData?.inviter?.email || "Team Member"}
                </p>
              </div>
            </div>

            {/* Actions: Authenticated vs Unauthenticated */}
            {!currentUser ? (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-slate-400 text-center font-medium">
                  Sign in with GitHub to accept this invitation and join the project.
                </p>
                <Button
                  onClick={handleGitHubLogin}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2"
                >
                  <Shield className="w-4 h-4" />
                  <span>Sign In with GitHub to Accept</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="px-3.5 py-2 rounded-xl bg-slate-800/60 text-slate-300 text-xs flex items-center justify-between border border-slate-700/60">
                  <span className="text-slate-400">Signed in as:</span>
                  <span className="font-bold text-white">{currentUser.name || currentUser.email}</span>
                </div>

                <Button
                  onClick={handleAcceptInvitation}
                  disabled={joining}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {joining ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Joining Project...</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      <span>Accept & Join Project</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
