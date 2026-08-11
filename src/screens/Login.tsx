import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Chrome } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signIn, signInWithOAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || "/dashboard";

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await signInWithOAuth("google");
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Google sign-in failed",
        description: error.message,
      });
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error, redirectTo } = await signIn(email, password);

    if (error) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message,
      });
      setIsLoading(false);
    } else {
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      navigate(from === "/dashboard" ? redirectTo || from : from, { replace: true });
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Return to your talent workspace."
      description="Sign in to continue your applications, learning, mentoring and platform operations."
      footer={
        <p>
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="font-black text-[#0073e6] hover:underline">
            Create one free
          </Link>
        </p>
      }
    >
      <div className="space-y-6">
        {/* Google Login Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          className="h-11 w-full bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-3xs flex items-center justify-center gap-2.5 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
        >
          {isGoogleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
          ) : (
            <Chrome className="w-4.5 h-4.5 text-[#0073e6]" />
          )}
          Continue with Google
        </button>

        {/* Separator */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-black bg-white lg:bg-white px-3 text-slate-400 tracking-wider">
            Or continue with email
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-bold text-slate-700">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11 rounded-xl border-slate-200 focus-visible:border-[#0073e6] focus-visible:ring-[#0073e6]/10"
                required
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-bold text-slate-700">Password</Label>
              <Link to="/reset-password" className="text-xs font-bold text-[#0073e6] hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-11 rounded-xl border-slate-200 focus-visible:border-[#0073e6] focus-visible:ring-[#0073e6]/10"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="h-11 w-full bg-[#0073e6] hover:bg-[#0062c4] text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>

          {/* Quick Demo Test Credentials */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/75 p-3 text-xs space-y-2">
            <p className="font-bold text-slate-600">Quick Test Sign-In Credentials:</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail("admin@merotalent.com");
                  setPassword("admin123");
                }}
                className="rounded-lg bg-white px-2.5 py-1.5 font-medium border border-slate-200 text-slate-700 hover:border-[#0073e6] hover:text-[#0073e6] transition-colors"
              >
                Admin (admin@merotalent.com)
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("student@merotalent.com");
                  setPassword("student123");
                }}
                className="rounded-lg bg-white px-2.5 py-1.5 font-medium border border-slate-200 text-slate-700 hover:border-[#0073e6] hover:text-[#0073e6] transition-colors"
              >
                Student (student@merotalent.com)
              </button>
            </div>
          </div>
        </form>
      </div>
    </AuthShell>
  );
};

export default Login;
