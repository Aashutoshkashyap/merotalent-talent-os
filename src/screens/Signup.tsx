import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppRole, useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
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
        description: "Please check your email to verify your account.",
      });
      navigate("/onboarding");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <Card className="w-full max-w-xl relative z-10 border-border/50 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <Link to="/" className="flex items-center justify-center gap-2 group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
          </Link>
          <div>
            <CardTitle className="text-2xl font-display">Create an account</CardTitle>
            <CardDescription className="text-muted-foreground">
              Join Merotalent and unlock your potential
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>I’m joining as</Label>
            <div className="grid grid-cols-2 gap-2">
              {accountTypes.map((type) => {
                const Icon = type.icon;
                const active = accountType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setAccountType(type.value)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      active
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-card hover:border-primary/40 hover:bg-muted/50"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Icon className="h-4 w-4 text-primary" />
                      {type.label}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {type.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Google Sign Up Button */}
          <Button 
            variant="outline" 
            className="w-full h-11 gap-2"
            onClick={handleGoogleSignUp}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Chrome className="w-5 h-5" />
            )}
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" variant="hero" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </CardContent>
          
        <CardFooter className="flex flex-col gap-4">
          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Signup;
