import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Mail, Lock, GraduationCap, Chrome } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <Card className="w-full max-w-md relative z-10 border-border/50 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <Link to="/" className="flex items-center justify-center gap-2 group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
          </Link>
          <div>
            <CardTitle className="text-2xl font-display">Welcome back</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to your Merotalent account
            </CardDescription>
          </div>
        </CardHeader>

        {/* Student Login Badge */}
        <div className="px-6 pb-4">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-center flex items-center justify-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" />
            <span className="font-medium">Student Portal</span>
          </div>
        </div>
        
        <CardContent className="space-y-6">
          {/* Google Sign In Button */}
          <Button 
            variant="outline" 
            className="w-full h-11 gap-2"
            onClick={handleGoogleSignIn}
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/reset-password" className="text-xs font-semibold text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
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

            <Button type="submit" className="w-full" variant="hero" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
          
        <CardFooter className="flex flex-col gap-4">
          <p className="text-sm text-center text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
