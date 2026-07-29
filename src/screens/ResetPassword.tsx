import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, Loader2, Lock, Mail, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setHasRecoverySession(Boolean(data.session));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasRecoverySession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const requestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Could not send reset email",
        description: error.message,
      });
      return;
    }

    toast({
      title: "Check your email",
      description: "Open the secure Merotalent link to choose a new password.",
    });
  };

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password.length < 10) {
      toast({
        variant: "destructive",
        title: "Use at least 10 characters",
        description: "Include a mix of letters, numbers and symbols.",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords do not match",
        description: "Re-enter the same password in both fields.",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Password update failed",
        description: error.message,
      });
      return;
    }

    await supabase.auth.signOut();
    toast({
      title: "Password updated",
      description: "Sign in with your new password.",
    });
    navigate("/login", { replace: true });
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[#fff7ed] p-4">
      <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#fed7aa]/70 blur-3xl" />
      <div className="absolute -right-24 bottom-16 h-80 w-80 rounded-full bg-[#ffedd5] blur-3xl" />
      <Card className="relative z-10 w-full max-w-md rounded-[26px] border-white/80 shadow-[0_28px_70px_rgba(154,52,18,0.14)]">
        <CardHeader className="space-y-4 text-center">
          <Link to="/" className="mx-auto grid h-12 w-12 place-items-center rounded-[15px] bg-[#f97316] text-white shadow-lg shadow-orange-500/20">
            <Sparkles className="h-5 w-5" />
          </Link>
          <div>
            <CardTitle className="font-display text-2xl">
              {hasRecoverySession ? "Choose a new password" : "Reset your password"}
            </CardTitle>
            <CardDescription className="mt-2">
              {hasRecoverySession
                ? "Create a strong password for your Merotalent account."
                : "We’ll send a secure recovery link to your account email."}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {hasRecoverySession ? (
            <form onSubmit={updatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 pl-10"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Confirm new password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-11 pl-10"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="h-11 w-full rounded-xl" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save new password
              </Button>
            </form>
          ) : (
            <form onSubmit={requestReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recoveryEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="recoveryEmail"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-11 pl-10"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="h-11 w-full rounded-xl" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Send recovery link
              </Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Back to login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
