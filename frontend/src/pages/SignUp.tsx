import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { AnimatedBackground } from "../components/ui/AnimatedBackground";
import { Terminal, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function SignUp() {
  const { loginWithGitHub } = useAuth();

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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create an account</h1>
          <p className="text-slate-600 mt-1">Start using structur.aI today</p>
        </div>

        <Card className="shadow-xl shadow-indigo-100/50 border-slate-200/60 bg-white/80 backdrop-blur-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Sign Up</CardTitle>
            <CardDescription>Enter your details below to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="name">Full Name</label>
              <input 
                id="name" 
                type="text" 
                placeholder="John Doe" 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
              />
            </div>
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
              <label className="text-sm font-medium text-slate-700" htmlFor="password">Password</label>
              <input 
                id="password" 
                type="password" 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
              />
            </div>
            
            <Link to="/dashboard" className="block pt-2">
              <Button className="w-full h-10 text-sm">Create Account</Button>
            </Link>
            
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white/80 px-2 text-slate-500">Or</span>
              </div>
            </div>
            
            <div>
              <Button 
                variant="outline" 
                className="w-full h-10 text-sm bg-white cursor-pointer hover:bg-slate-50 border-slate-300 font-semibold text-slate-800 flex items-center justify-center"
                onClick={loginWithGitHub}
              >
                <Terminal className="mr-2 h-4 w-4 text-slate-700" />
                Continue with GitHub
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <p className="text-center text-sm text-slate-600 mt-8">
          Already have an account?{" "}
          <Link to="/signin" className="font-medium text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
