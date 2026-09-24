import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import AuthShell from "@/components/auth/AuthShell";
import {
  Loader2,
  Mail,
  Lock,
  User,
  Chrome,
} from "lucide-react";

const Signup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signUp, signInWithOAuth } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGoogleSignUp = async () => {
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

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 6 characters.",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(email, password, fullName);

    if (error) {
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: error.message,
      });
      setIsLoading(false);
    } else {
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
      navigate("/onboarding");
    }
  };

  return (
    <AuthShell
      eyebrow="Create your account"
      title="Start your MeroTalent journey."
      description="Every new account starts with student access. You can request any additional workspace after signing in."
      footer={
        <p>
          Already have an account?{" "}
          <Link to="/login" className="font-black text-[#0073e6] hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <div className="space-y-6">
        <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-blue-800">
          Student access is ready after verification. Request College, Jobs, Mentor, or Events access later; Super Admin reviews every workspace request.
        </p>

        {/* Google Sign Up Button */}
        <button
          onClick={handleGoogleSignUp}
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
          <div className="relative flex justify-center text-[10px] uppercase font-black bg-white px-3 text-slate-400 tracking-wider">
            Or continue with email
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-xs font-bold text-slate-700">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10 h-11 rounded-xl border-slate-200 focus-visible:border-[#0073e6] focus-visible:ring-[#0073e6]/10"
                required
              />
            </div>
          </div>

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
            <Label htmlFor="password" className="text-xs font-bold text-slate-700">Password</Label>
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

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-bold text-slate-700">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>
      </div>
    </AuthShell>
  );
};

export default Signup;
