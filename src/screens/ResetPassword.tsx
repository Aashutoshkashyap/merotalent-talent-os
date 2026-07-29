import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, Loader2, Lock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import AuthShell from "@/components/auth/AuthShell";

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
    <AuthShell
      eyebrow={hasRecoverySession ? "Secure your account" : "Account recovery"}
      title={hasRecoverySession ? "Choose a new password." : "Let’s get you back in."}
      description={
        hasRecoverySession
          ? "Create a strong password for your Merotalent account."
          : "Enter your account email and we’ll send a secure recovery link."
      }
      footer={
        <Link to="/login" className="font-bold text-primary hover:underline">
          Back to login
        </Link>
      }
    >
      <div className="space-y-5">
          {hasRecoverySession ? (
            <form onSubmit={updatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-xs font-bold">New password</Label>
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
                <Label htmlFor="confirmNewPassword" className="text-xs font-bold">Confirm new password</Label>
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
                <Label htmlFor="recoveryEmail" className="text-xs font-bold">Email</Label>
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
          <div className="rounded-[15px] border border-[#eee5df] bg-[#fbf9f7] p-4 text-xs leading-5 text-muted-foreground">
            Recovery links expire for your safety. Use the newest email if you requested more than one.
          </div>
      </div>
    </AuthShell>
  );
};

export default ResetPassword;
