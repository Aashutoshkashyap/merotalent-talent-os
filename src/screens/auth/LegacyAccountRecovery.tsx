import { isNeonClientRuntime } from "@/lib/backend-selection";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Chrome, Loader2 } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { createLegacyRecoveryClient, submitLegacyRecoveryProof, supportsSourceRecoveryPopup, sourceRecoveryMarker } from "@/lib/auth/legacy-recovery";

interface ManagedUser { id: string; email?: string; emailVerified: boolean }
class RecoveryAuthError extends Error {
  constructor(readonly code: string) {
    super("This account action could not be completed. Check your details and try again.");
  }
}
async function authAction(action: string, body: Record<string, string>) {
  const response = await fetch(`/api/v1/neon-staging/auth/${action}`, { method: "POST",
    credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new RecoveryAuthError(typeof data?.code === "string" ? data.code : "AUTH_ACTION_FAILED");
  return data;
}

export default function LegacyAccountRecovery({ sourceCallback = false }: { sourceCallback?: boolean }) {
  const [managed, setManaged] = useState<ManagedUser | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [sourceEmail, setSourceEmail] = useState("");
  const [sourcePassword, setSourcePassword] = useState("");
  const [code, setCode] = useState("");
  const [createAccount, setCreateAccount] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [needsVerification, setNeedsVerification] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const staging = isNeonClientRuntime();

  const loadManagedSession = async () => {
    const response = await fetch("/api/v1/neon-staging/auth/get-session", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error("Account verification is unavailable. Please try again later.");
    const session = await response.json();
    const current = session?.user as ManagedUser | undefined;
    setManaged(current?.id ? current : null);
    setNeedsVerification(!!current?.id && current.emailVerified !== true);
    if (current?.email) setEmail(current.email);
    return current;
  };

  const finishProof = async (token: string) => {
    setBusy(true); setError("");
    try {
      await submitLegacyRecoveryProof(token);
      await refreshProfile();
      setMessage("Your existing profile and access have been restored.");
      navigate("/dashboard", { replace: true });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Restoration failed. Please try again.");
    } finally { setBusy(false); }
  };

  useEffect(() => {
    if (!staging) { setBusy(false); return; }
    if (sourceCallback) {
      void (async () => {
        try {
          const client = createLegacyRecoveryClient(true);
          const { data, error: sourceError } = await client.auth.getSession();
          window.history.replaceState({}, "", window.location.pathname);
          window.sessionStorage.removeItem(sourceRecoveryMarker);
          if (sourceError || !data.session) throw new Error("Return to account restoration and try again.");
          if (window.opener) {
            window.opener.postMessage({ type: "merotalent-source-ownership-proof", token: data.session.access_token }, window.location.origin);
            window.close();
          } else {
            // Managed Auth remains in its independent HttpOnly cookie. The
            // server verifies both live sessions before preserving the old ID.
            await finishProof(data.session.access_token);
          }
        } catch (failure) { setError(failure instanceof Error ? failure.message : "Google sign-in failed."); }
        finally { setBusy(false); }
      })();
      return;
    }
    void loadManagedSession().catch(failure => setError(failure instanceof Error ? failure.message : "Session unavailable."))
      .finally(() => setBusy(false));
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== popupRef.current ||
          event.data?.type !== "merotalent-source-ownership-proof" || typeof event.data?.token !== "string") return;
      popupRef.current?.close(); popupRef.current = null;
      void finishProof(event.data.token);
    };
    window.addEventListener("message", receive);
    return () => { window.removeEventListener("message", receive); popupRef.current?.close(); };
    // Only the fixed staging recovery screen may register the source callback listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staging, sourceCallback]);

  const submitManagedAccount = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await authAction(createAccount ? "sign-up/email" : "sign-in/email",
        { email: email.trim(), password, ...(createAccount ? { name: name.trim() } : {}) });
      setPassword("");
      const current = await loadManagedSession();
      if (current?.emailVerified !== true && (result?.user || current)) {
        setNeedsVerification(true);
        setMessage("Verify your new account email using the code sent to your inbox.");
      }
    } catch (failure) {
      if (failure instanceof RecoveryAuthError && failure.code === "EMAIL_NOT_VERIFIED") {
        setPassword(""); setNeedsVerification(true);
        setMessage("Verify your new account email before restoring your profile. Request a new code if needed.");
      } else setError(failure instanceof Error ? failure.message : "Sign-in failed.");
    }
    finally { setBusy(false); }
  };

  const verifyManagedEmail = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await authAction("email-otp/verify-email", { email, otp: code });
      setCode(""); setNeedsVerification(false);
      const current = await loadManagedSession();
      if (!current) setCreateAccount(false);
      setMessage(current ? "Email verified. Now verify your existing MeroTalent account." : "Email verified. Sign in with your new account password.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The verification code is invalid or expired."); }
    finally { setBusy(false); }
  };

  const submitSourcePassword = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const client = createLegacyRecoveryClient();
      const { data, error: sourceError } = await client.auth.signInWithPassword({ email: sourceEmail.trim(), password: sourcePassword });
      setSourcePassword("");
      if (sourceError || !data.session) throw new Error("Your existing MeroTalent sign-in could not be verified. Check your details.");
      await finishProof(data.session.access_token);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Existing-account sign-in failed."); }
    finally { setSourcePassword(""); setBusy(false); }
  };

  const sourceGoogle = async () => {
    setError("");
    if (!supportsSourceRecoveryPopup(window.location.origin)) {
      setError("Google account restoration is unavailable on this address. Use the official MeroTalent website.");
      return;
    }
    setBusy(true);
    try {
      window.sessionStorage.setItem(sourceRecoveryMarker, String(Date.now()));
      const client = createLegacyRecoveryClient();
      const { data, error: sourceError } = await client.auth.signInWithOAuth({ provider: "google", options: {
        redirectTo: `${window.location.origin}/auth/callback`, skipBrowserRedirect: true } });
      if (sourceError || !data.url || new URL(data.url).origin !== "https://dtirpilgzlsfryucanlg.supabase.co") {
        throw new Error("Google account verification is unavailable.");
      }
      window.location.assign(data.url);
    } catch (failure) {
      window.sessionStorage.removeItem(sourceRecoveryMarker);
      setBusy(false); setError(failure instanceof Error ? failure.message : "Google sign-in failed.");
    }
  };

  return <AuthShell eyebrow="Account restoration" title="Restore your MeroTalent profile"
    description="Verify your new sign-in and your existing account to keep your applications, bookings and assigned access."
    footer={<Link to="/login" className="font-bold text-blue-600 hover:underline">Back to sign in</Link>}>
    <div className="space-y-5">
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
      {!staging ? <p>This account-restoration flow is available in the migration test environment.</p>
        : sourceCallback ? <p role="status">{busy ? "Verifying your existing sign-in…" : "Return to the restoration window."}</p>
        : busy && !managed && !needsVerification ? <p role="status" className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Checking account…</p>
        : <>
          {!managed && !needsVerification && <form onSubmit={submitManagedAccount} className="space-y-4">
            <p className="text-sm text-slate-600">{createAccount ? "Create your new sign-in. Your existing profile will be restored after ownership verification." : "First sign into your new MeroTalent account."}</p>
            {createAccount && <div><Label htmlFor="recovery-name">Full name</Label><Input id="recovery-name" value={name} onChange={event => setName(event.target.value)} required minLength={2} maxLength={120} /></div>}
            <div><Label htmlFor="recovery-email">New account email</Label><Input id="recovery-email" type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" /></div>
            <div><Label htmlFor="recovery-password">New account password</Label><Input id="recovery-password" type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={8} autoComplete={createAccount ? "new-password" : "current-password"} /></div>
            <Button className="w-full" disabled={busy}>{createAccount ? "Create new sign-in" : "Sign into new account"}</Button>
            <Button type="button" variant="ghost" onClick={() => setCreateAccount(value => !value)}>{createAccount ? "Already created a new sign-in?" : "Create a new sign-in"}</Button>
          </form>}
          {needsVerification && <form onSubmit={verifyManagedEmail} className="space-y-4">
            <p className="text-sm">Verify {email} before restoring your existing profile.</p>
            <div><Label htmlFor="recovery-code">Email verification code</Label><Input id="recovery-code" inputMode="numeric" value={code} onChange={event => setCode(event.target.value)} required pattern="[0-9]{6,10}" autoComplete="one-time-code" /></div>
            <Button disabled={busy}>Verify email</Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => {
              setBusy(true); setError("");
              void authAction("send-verification-email", { email }).then(() => setMessage("Verification requested. Check your inbox."))
                .catch(failure => setError(failure instanceof Error ? failure.message : "Verification unavailable."))
                .finally(() => setBusy(false));
            }}>Request a new code</Button>
          </form>}
          {managed?.emailVerified === true && <div className="space-y-4">
            <p className="text-sm text-slate-600">New account verified. Sign into your existing MeroTalent account to restore its profile.</p>
            <Button variant="outline" type="button" className="w-full" onClick={sourceGoogle} disabled={busy}><Chrome className="mr-2 size-4" /> Verify existing account with Google</Button>
            <form onSubmit={submitSourcePassword} className="space-y-4">
              <div><Label htmlFor="legacy-email">Existing MeroTalent email</Label><Input id="legacy-email" type="email" value={sourceEmail} onChange={event => setSourceEmail(event.target.value)} required autoComplete="username" /></div>
              <div><Label htmlFor="legacy-password">Existing MeroTalent password</Label><Input id="legacy-password" type="password" value={sourcePassword} onChange={event => setSourcePassword(event.target.value)} required autoComplete="current-password" /></div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Restoring…" : "Verify ownership and restore profile"}</Button>
            </form>
          </div>}
        </>}
    </div>
  </AuthShell>;
}
