import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import AuthShell from "@/components/auth/AuthShell";

type ResetStep = "email" | "otp" | "password";

const ResetPassword = () => {
  const [step, setStep] = useState<ResetStep>("email");
  const [email, setEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStep("password");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setStep("password");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleRequestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Could not send OTP",
        description: error.message,
      });
      return;
    }

    toast({
      title: "OTP Code Sent!",
      description: `We've sent a 6-digit verification code to ${email}.`,
    });
    setStep("otp");
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otpToken.trim(),
      type: "recovery",
    });
    setIsLoading(false);

    if (error || !data.session) {
      toast({
        variant: "destructive",
        title: "Invalid OTP Code",
        description: error?.message || "Please double-check the 6-digit OTP code and try again.",
      });
      return;
    }

    toast({
      title: "Identity Verified!",
      description: "Please enter your new password below.",
    });
    setStep("password");
  };

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password.length < 8) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 8 characters.",
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
      title: "Password Updated Successfully",
      description: "Sign in with your new password.",
    });
    navigate("/login", { replace: true });
  };

  return (
    <AuthShell
      eyebrow={step === "password" ? "Secure your account" : "Account Recovery"}
      title={
        step === "email"
          ? "Reset Your Password"
          : step === "otp"
            ? "Enter 6-Digit OTP"
            : "Choose New Password"
      }
      description={
        step === "email"
          ? "Enter your account email to receive a 6-digit OTP verification code."
          : step === "otp"
            ? `Enter the 6-digit OTP code sent to ${email}.`
            : "Create a new strong password for your MeroTalent account."
      }
      footer={
        <Link to="/login" className="font-bold text-[#0073e6] hover:underline">
          Back to login
        </Link>
      }
    >
      <div className="space-y-5">
        {step === "email" && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recoveryEmail" className="text-xs font-bold text-slate-700">Account Email</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="recoveryEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-10 rounded-xl"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="h-11 w-full rounded-xl bg-[#0073e6] hover:bg-[#0062c4] font-extrabold text-xs sm:text-sm" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send Verification OTP
            </Button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otpToken" className="text-xs font-bold text-slate-700">6-Digit OTP Code</Label>
              <div className="relative">
                <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="otpToken"
                  type="text"
                  maxLength={6}
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value)}
                  className="h-11 pl-10 tracking-widest text-base font-mono font-bold rounded-xl"
                  placeholder="123456"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="h-11 w-full rounded-xl bg-[#0073e6] hover:bg-[#0062c4] font-extrabold text-xs sm:text-sm" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Verify OTP Code
            </Button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 w-full text-center py-1"
            >
              Resend code or change email
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-xs font-bold text-slate-700">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="newPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-10 rounded-xl"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword" className="text-xs font-bold text-slate-700">Confirm New Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 pl-10 rounded-xl"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="h-11 w-full rounded-xl bg-[#0073e6] hover:bg-[#0062c4] font-extrabold text-xs sm:text-sm" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save New Password
            </Button>
          </form>
        )}

        <div className="rounded-[15px] border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-500 font-medium">
          OTP codes expire in 10 minutes for your security. Enter the code sent to your email to verify your identity.
        </div>
      </div>
    </AuthShell>
  );
};

export default ResetPassword;
