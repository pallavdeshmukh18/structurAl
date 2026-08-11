import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { AnimatedBackground } from "../components/ui/AnimatedBackground";
import { Mail, Terminal, ArrowLeft } from "lucide-react";
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
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Sign In</CardTitle>
            <CardDescription>Enter your email and password below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="email">Email</label>
              <input 
                id="email" 
                type="email" 
                placeholder="m@example.com" 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700" htmlFor="password">Password</label>
                <Link to="#" className="text-sm font-medium text-indigo-600 hover:underline">Forgot password?</Link>
              </div>
              <input 
                id="password" 
                type="password" 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
              />
            </div>
            
            <Link to="/dashboard" className="block pt-2">
              <Button className="w-full h-10 text-sm">Sign In</Button>
            </Link>
            
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white/80 px-2 text-slate-500">Or continue with</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-10 text-sm bg-white cursor-pointer" onClick={loginWithGitHub}>
                <Terminal className="mr-2 h-4 w-4" />
                Github
              </Button>
              <Button variant="outline" className="h-10 text-sm bg-white">
                <Mail className="mr-2 h-4 w-4" />
                Google
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <p className="text-center text-sm text-slate-600 mt-8">
          Don't have an account?{" "}
          <Link to="/signup" className="font-medium text-indigo-600 hover:underline">
            Sign up for free
          </Link>
        </p>
      </div>
    </div>
  );
}
