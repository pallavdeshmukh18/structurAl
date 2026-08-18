import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { AnimatedBackground } from "../components/ui/AnimatedBackground";
import { Terminal, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function SignIn() {
  const { loginWithGitHub, error, clearError } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center relative p-4">
      <AnimatedBackground />
      
      <Link to="/" className="absolute top-8 left-8 flex items-center space-x-2 z-10 text-slate-600 hover:text-slate-900 transition-colors">
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back to site</span>
      </Link>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="/logo.png" alt="StructurAI Logo" className="w-12 h-12 rounded-xl mb-3 object-contain shadow-md" />
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
          <p className="text-slate-600 mt-1">Sign in to your structur.aI account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={clearError} className="text-rose-500 hover:text-rose-700 font-bold ml-2">✕</button>
          </div>
        )}

        <Card className="shadow-xl shadow-indigo-100/50 border-slate-200/60 bg-white/80 backdrop-blur-xl">
          <CardHeader className="space-y-1 pb-4 text-center">
            <CardTitle className="text-xl">Sign in with GitHub</CardTitle>
            <CardDescription>
              StructurAI requires GitHub authentication to analyze your repositories.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button 
                variant="outline" 
                className="w-full h-12 text-sm bg-white cursor-pointer hover:bg-slate-50 border-slate-300 font-semibold text-slate-800 flex items-center justify-center" 
                onClick={loginWithGitHub}
              >
                <Terminal className="mr-2 h-5 w-5 text-slate-700" />
                Continue with GitHub
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
