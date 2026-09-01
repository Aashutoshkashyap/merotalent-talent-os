import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppRole, useAuth } from "@/contexts/AuthContext";
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
  Building2,
  BriefcaseBusiness,
  UserRoundSearch,
} from "lucide-react";

type SignupRole = Exclude<AppRole, "admin">;

const accountTypes: Array<{
  value: SignupRole;
  label: string;
  description: string;
  icon: typeof User;
}> = [
  {
    value: "talent",
    label: "Talent",
    description: "Learn, compete and get hired",
    icon: User,
  },
  {
    value: "mentor",
    label: "Mentor",
    description: "Guide the next generation",
    icon: UserRoundSearch,
  },
  {
    value: "company",
    label: "Company",
    description: "Discover proven talent",
    icon: BriefcaseBusiness,
  },
  {
    value: "institution",
    label: "Institution",
    description: "Enable student outcomes",
    icon: Building2,
  },
];

const Signup = () => {
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get("role") as SignupRole | null;
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState<SignupRole>(
    requestedRole && accountTypes.some((type) => type.value === requestedRole)
      ? requestedRole
      : "talent",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signUp, signInWithOAuth } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    const { error } = await signInWithOAuth("google", accountType);
    
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

    const { error } = await signUp(email, password, fullName, accountType);

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
        description: accountType === "talent"
          ? "Please check your email to verify your account."
          : "Please verify your email. Your module workspace request will be reviewed by Super Admin.",
      });
      navigate(accountType === "talent" ? "/onboarding" : "/pending-approval");
    }
  };

  return (
    <AuthShell
      eyebrow="Choose your path"
      title="Build a workspace around your ambition."
      description="Join as talent, a mentor, a company or an institution. Every account gets a focused workspace with the tools that matter."
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-slate-700">Start as</Label>
            <span className="text-[11px] font-semibold text-slate-400">Student access is immediate</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {accountTypes.map((type) => {
              const Icon = type.icon;
              const active = accountType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setAccountType(type.value)}
                  className={`group rounded-[15px] border p-2.5 text-left transition-all duration-200 cursor-pointer ${
                    active
                      ? "border-[#0073e6] bg-blue-50/50 shadow-xs"
                      : "border-slate-200 bg-white hover:border-[#0073e6]/50"
                  }`}
                >
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <span className={`grid h-6 w-6 place-items-center rounded-[8px] flex-shrink-0 ${active ? "bg-[#0073e6] text-white" : "bg-slate-100 text-slate-500"}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate">{type.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {accountType !== "talent" && (
            <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-amber-800">
              You will start with a student account. Super Admin must approve this workspace request before you can manage a module.
            </p>
          )}
        </div>

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
