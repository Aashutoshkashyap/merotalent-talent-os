import { lazy, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  clearPendingModuleAccessRole,
  getPendingModuleAccessRole,
  useAuth,
} from "@/contexts/AuthContext";
import { resolveWorkspacePath } from "@/lib/auth/workspace-path";
import { supabase } from "@/integrations/supabase/client";
import { isNeonClientRuntime } from "@/lib/backend-selection";
import { isSourceRecoveryCallback } from "@/lib/auth/source-recovery-context";
const LegacyAccountRecovery = lazy(() => import("./LegacyAccountRecovery"));

type AccessContext = {
  account_status?: unknown;
  roles?: unknown;
  permissions?: unknown;
  capabilities?: unknown;
};

const stringList = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

/**
 * OAuth returns through one route so we can complete the *request* for a
 * workspace without ever letting the browser grant itself a module role.
 */
export default function OAuthCallback() {
  return isNeonClientRuntime() ? <NeonOAuthCallback /> : <LegacyOAuthCallback />;
}

function NeonOAuthCallback() {
  const [sourceRecovery] = useState(isSourceRecoveryCallback);
  return sourceRecovery ? <LegacyAccountRecovery sourceCallback /> : <NeonPostSignIn />;
}

function NeonPostSignIn() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/v1/neon-staging/profile", { credentials: "same-origin", cache: "no-store" });
        const result = await response.json().catch(() => null);
        if (!active) return;
        if (response.status === 403 && result?.error === "IDENTITY_NOT_LINKED") {
          navigate("/account-recovery", { replace: true }); return;
        }
        if (!response.ok) { navigate("/login", { replace: true }); return; }
        await refreshProfile();
        if (!active) return;
        if (getPendingModuleAccessRole()) {
          clearPendingModuleAccessRole(); navigate("/request-access", { replace: true }); return;
        }
        navigate(resolveWorkspacePath(stringList(result?.access?.roles), stringList(result?.access?.permissions),
          stringList(result?.access?.capabilities)), { replace: true });
      } catch { if (active) navigate("/login", { replace: true }); }
    })();
    return () => { active = false; };
  }, [navigate, refreshProfile]);
  return <p role="status" className="p-6">Finishing secure sign-in…</p>;
}

function LegacyOAuthCallback() {
  const { user, isLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finishing secure sign-in…");
  const completedRef = useRef(false);

  useEffect(() => {
    if (isLoading || completedRef.current) return;
    if (!user) {
      completedRef.current = true;
      navigate("/login", { replace: true });
      return;
    }
    completedRef.current = true;

    let active = true;
    const complete = async () => {
      const requestedRole = getPendingModuleAccessRole();
      const rpcClient = supabase as unknown as {
        rpc: (name: string, args?: Record<string, unknown>) => Promise<{
          data: unknown;
          error: { message?: string } | null;
        }>;
      };

      if (requestedRole) {
        setMessage("Submitting your workspace access request…");
        const { error } = await rpcClient.rpc("request_initial_module_access", {
          p_role: requestedRole,
        });
        clearPendingModuleAccessRole();
        if (!active) return;

        if (error) {
          // This may be an existing approved request. Resolve the access
          // context below instead of exposing server details to the user.
          console.error("[auth] Module access request was not created", { code: error.message });
        } else {
          await refreshProfile();
          if (active) navigate("/pending-approval", { replace: true });
          return;
        }
      }

      setMessage("Loading your workspace…");
      const { data, error } = await rpcClient.rpc("get_my_access_context");
      if (!active) return;
      if (error || !data || typeof data !== "object" || Array.isArray(data)) {
        navigate("/dashboard", { replace: true });
        return;
      }
      const access = data as AccessContext;
      if (access.account_status !== "active") {
        navigate("/pending-approval", { replace: true });
        return;
      }
      navigate(resolveWorkspacePath(stringList(access.roles), stringList(access.permissions), stringList(access.capabilities)), { replace: true });
    };

    void complete();
    return () => {
      active = false;
    };
  }, [isLoading, navigate, refreshProfile, user]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-[#0073e6]" />
        {message}
      </div>
    </div>
  );
}
