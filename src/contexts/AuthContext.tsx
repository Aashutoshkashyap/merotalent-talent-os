import { isNeonClientRuntime } from "@/lib/backend-selection";
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getStoredGuestCollegeApplicationToken } from "@/lib/forms/guest-college-application";
import { invalidateStudentActivityCache } from "@/lib/student/activity-cache";
import { resolveWorkspacePath } from "@/lib/auth/workspace-path";
import { signOutToPublicHome } from "@/lib/auth/sign-out";
import { getAuthCallbackUrl, getPublicOrigin } from "@/lib/auth/public-origin";
import { toast } from "sonner";

export type AppRole = "admin" | "super_admin" | "talent" | "institution" | "company" | "mentor";
export type AppPermission = string;

export { resolveWorkspacePath } from "@/lib/auth/workspace-path";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  location: string | null;
  linkedin_url: string | null;
  education: string | null;
  experience_level: string | null;
  education_history?: Record<string, string>[] | null;
  experience_history?: Record<string, string>[] | null;
  certifications?: Record<string, string>[] | null;
  skills: string[] | null;
  resume_url: string | null;
  onboarding_completed: boolean | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  permissions: AppPermission[];
  capabilities: string[];
  isLoading: boolean;
  isAdmin: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: Error | null }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: Error | null; redirectTo?: string; needsAccountRecovery?: boolean }>;
  signInWithOAuth: (
    provider: "google" | "apple",
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const pendingModuleAccessKey = "merotalent.pending-module-access";
const pendingModuleAccessLifetimeMs = 30 * 60 * 1000;

export const getPendingModuleAccessRole = (): Exclude<AppRole, "admin" | "talent" | "super_admin"> | null => {
  try {
    const raw = window.sessionStorage.getItem(pendingModuleAccessKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { role?: string; createdAt?: number };
    if (
      !["institution", "company", "mentor"].includes(parsed.role ?? "") ||
      typeof parsed.createdAt !== "number" ||
      Date.now() - parsed.createdAt > pendingModuleAccessLifetimeMs
    ) return null;
    return parsed.role as Exclude<AppRole, "admin" | "talent" | "super_admin">;
  } catch {
    return null;
  }
};

export const clearPendingModuleAccessRole = () => {
  try {
    window.sessionStorage.removeItem(pendingModuleAccessKey);
  } catch {}
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<AppPermission[]>([]);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hydratedUserIdRef = useRef<string | null>(null);
  const stagingHydrationErrorRef = useRef<string | null>(null);
  const isStaging = isNeonClientRuntime();

  const hydrateStaging = async (): Promise<boolean> => {
    const res = await fetch("/api/v1/neon-staging/profile", {
      headers: { accept: "application/json" }, credentials: "same-origin", cache: "no-store",
    });
    if (!res.ok) {
      const failure = await res.json().catch(() => null);
      // A service/network outage is not evidence of logout or lost ownership.
      // Preserve existing UI state; every protected server operation still
      // verifies the current session/account/entitlement independently.
      if (![401, 403, 404].includes(res.status)) {
        throw new Error("Account information is temporarily unavailable. Please retry.");
      }
      stagingHydrationErrorRef.current = typeof failure?.error === "string" ? failure.error : null;
      setUser(null); setSession(null); setProfile(null); setRoles([]); setPermissions([]); setCapabilities([]);
      return false;
    }
    stagingHydrationErrorRef.current = null;
    const json = await res.json();
    const data = json.data as Profile | undefined;
    if (!data?.user_id) throw new Error("Account information is temporarily unavailable. Please retry.");
    setUser({
      id: data.user_id, email: data.email, app_metadata: {}, user_metadata: { full_name: data.full_name },
      aud: "authenticated", created_at: new Date().toISOString(),
    } as User);
    setProfile(data);
    setSession(null); // Neon uses an HttpOnly cookie, never a fabricated bearer token.
    const access = json.access as { roles?: AppRole[]; permissions?: string[]; capabilities?: string[] } | undefined;
    setRoles(Array.isArray(access?.roles) ? access.roles : ["talent"]);
    setPermissions(Array.isArray(access?.permissions) ? access.permissions : []);
    setCapabilities(Array.isArray(access?.capabilities) ? access.capabilities : []);
    await claimGuestCollegeApplications(data.user_id).catch(() => undefined);
    return true;
  };

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (profileData) {
      setProfile(profileData);
    }
  };

  const fetchRoles = async (userId: string) => {
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    if (rolesData) {
      setRoles(rolesData.map((r) => r.role as AppRole));
    }
  };

  const fetchAccessContext = async (userId: string) => {
    const rpcClient = supabase as unknown as {
      rpc: (name: string) => Promise<{ data: unknown; error: { message?: string } | null }>;
    };
    const { data, error } = await rpcClient.rpc("get_my_access_context");
    if (error || !data || typeof data !== "object" || Array.isArray(data)) {
      await fetchRoles(userId);
      return;
    }
    const access = data as { roles?: unknown; permissions?: unknown; capabilities?: unknown };
    if (Array.isArray(access.roles)) {
      setRoles(access.roles.filter((role): role is AppRole =>
        typeof role === "string" && ["admin", "super_admin", "talent", "institution", "company", "mentor"].includes(role),
      ));
    }
    if (Array.isArray(access.permissions)) {
      setPermissions(access.permissions.filter((permission): permission is string => typeof permission === "string"));
    }
    if (Array.isArray(access.capabilities)) {
      setCapabilities(access.capabilities.filter((capability): capability is string => typeof capability === "string"));
    }
  };

  const claimGuestCollegeApplications = async (userId: string) => {
    const guestToken = getStoredGuestCollegeApplicationToken();
    if (!guestToken) return;
    if (isStaging) {
      const response = await fetch("/api/v1/neon-staging/guest-college-applications/claim", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestToken }),
      });
      const result = await response.json().catch(() => null);
      if (response.ok && Number(result?.data?.claimed_count ?? 0) > 0) invalidateStudentActivityCache(userId);
      return;
    }
    const rpcClient = supabase as unknown as {
      rpc: (name: string, args: Record<string, unknown>) => Promise<{
        data: { claimed_count?: unknown } | null;
        error: { code?: string } | null;
      }>;
    };
    const { data, error } = await rpcClient.rpc("claim_guest_college_applications", {
      p_guest_token: guestToken,
    });
    if (!error && Number(data?.claimed_count || 0) > 0) {
      invalidateStudentActivityCache(userId);
    }
  };

  const refreshProfile = async () => {
    if (isStaging) {
      try {
        await hydrateStaging();
      } catch (err) {
        console.error("Failed to refresh staging profile", err);
      }
      return;
    }
    if (user) {
      await Promise.all([fetchProfile(user.id), fetchAccessContext(user.id)]);
    }
  };

  useEffect(() => {
    if (isStaging) {
      void (async () => {
        try {
          await hydrateStaging();
        } catch (err) {
          console.error("Staging session hydration failed", err);
        } finally {
          setIsLoading(false);
        }
      })();
      return;
    }

    // Supabase emits INITIAL_SESSION immediately after subscription. Relying on
    // that single source prevents the same profile/access requests from being
    // fired once by the listener and again by getSession on every page load.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          // Token refreshes should update the session without reloading the
          // same profile, roles, permissions and capabilities from the API.
          if (event === "TOKEN_REFRESHED" && hydratedUserIdRef.current === currentSession.user.id) {
            setIsLoading(false);
            return;
          }
          hydratedUserIdRef.current = currentSession.user.id;
          setTimeout(async () => {
            await Promise.all([
              fetchProfile(currentSession.user.id),
              fetchAccessContext(currentSession.user.id),
              claimGuestCollegeApplications(currentSession.user.id),
            ]);
            setIsLoading(false);
          }, 0);
        } else {
          hydratedUserIdRef.current = null;
          setUser(null);
          setSession(null);
          setProfile(null);
          setRoles([]);
          setPermissions([]);
          setCapabilities([]);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
    // The Supabase listener must be registered once; its helpers do not depend
    // on mutable inputs and only update provider state from the active session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaging]);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
  ) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (isStaging) {
      return { error: new Error("New staging identities require a separately verified application-account link.") };
    }

    // Check if an account already exists for this email
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      return {
        error: new Error(
          `An account with email "${normalizedEmail}" is already registered. Please sign in instead.`,
        ),
      };
    }

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
        data: {
          full_name: fullName,
          account_type: "talent",
        },
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (isStaging) {
      try {
        const response = await fetch("/api/v1/neon-staging/auth/sign-in/email", {
          method: "POST", credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password }),
        });
        if (!response.ok) return { error: new Error("Sign in failed. Please check your credentials.") };
        if (!await hydrateStaging()) {
          if (stagingHydrationErrorRef.current === "IDENTITY_NOT_LINKED") {
            return { error: null, redirectTo: "/account-recovery", needsAccountRecovery: true };
          }
          await fetch("/api/v1/neon-staging/auth/sign-out", {
            method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: "{}",
          });
          return { error: new Error("This staging identity is not linked to an application account.") };
        }
        return { error: null, redirectTo: "/dashboard/jobs" };
      } catch {
        return { error: new Error("Staging authentication is unavailable. Please try again.") };
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      return { error };
    }
    if (!data.user) {
      return { error: new Error("Sign in failed. Please check your email and password.") };
    }

    // Roles and account status come from get_my_access_context, which resolves
    // them server-side. The client never decides its own role.
    const rpcClient = supabase as unknown as {
      rpc: (
        name: string,
      ) => Promise<{ data: unknown; error: { message?: string } | null }>;
    };
    const { data: accessData, error: accessError } =
      await rpcClient.rpc("get_my_access_context");
    if (accessError) {
      await supabase.auth.signOut();
      return {
        error: new Error("Your account access could not be verified. Please try again."),
      };
    }
    const accessRecord =
      accessData && typeof accessData === "object" && !Array.isArray(accessData)
        ? accessData as { account_status?: unknown; roles?: unknown; permissions?: unknown; capabilities?: unknown }
        : null;
    if (accessRecord?.account_status !== "active" || !Array.isArray(accessRecord.roles)) {
      await supabase.auth.signOut();
      return { error: new Error("This account is not active.") };
    }
    const accountRoles = accessRecord.roles.filter(
      (role): role is AppRole =>
        typeof role === "string" &&
        ["admin", "super_admin", "talent", "institution", "company", "mentor"].includes(role),
    );
    const accountPermissions = Array.isArray(accessRecord.permissions)
      ? accessRecord.permissions.filter((permission): permission is string => typeof permission === "string")
      : [];
    const accountCapabilities = Array.isArray(accessRecord.capabilities)
      ? accessRecord.capabilities.filter((capability): capability is string => typeof capability === "string")
      : [];
    const redirectTo = resolveWorkspacePath(accountRoles, accountPermissions, accountCapabilities);

    return { error: null, redirectTo };
  };

  const signInWithOAuth = async (
    provider: "google" | "apple",
  ) => {
    if (isStaging) {
      if (provider !== "google") return { error: new Error("This sign-in provider is unavailable.") };
      try {
        const response = await fetch("/api/v1/neon-staging/auth/sign-in/social", { method: "POST",
          credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider }) });
        const data = await response.json().catch(() => null);
        // The server validates the destination against the pinned Managed Auth
        // branch or Google. Neon may wrap the provider URL for its PKCE exchange.
        const destination = typeof data?.url === "string" ? new URL(data.url) : null;
        if (!response.ok || !destination || destination.protocol !== "https:" || destination.username || destination.password) {
          return { error: new Error("Google sign-in is unavailable. Please try again later.") };
        }
        clearPendingModuleAccessRole();
        window.location.assign(data.url);
        return { error: null };
      } catch { return { error: new Error("Google sign-in is unavailable. Please try again later.") }; }
    }
    clearPendingModuleAccessRole();

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getAuthCallbackUrl(),
      },
    });

    if (error) {
      clearPendingModuleAccessRole();
    }

    return { error };
  };

  const signOut = async () => {
    try {
      if (isStaging) {
        const response = await fetch("/api/v1/neon-staging/auth/sign-out", {
          method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: "{}",
        });
        if (!response.ok) throw new Error("Staging sign out failed.");
        setUser(null);
        setSession(null);
        setProfile(null);
        setRoles([]);
        setPermissions([]);
        setCapabilities([]);
        window.location.replace("/");
        return;
      }

      const error = await signOutToPublicHome(
        () => supabase.auth.signOut(),
        () => {
          if (user?.id) invalidateStudentActivityCache(user.id);
          clearPendingModuleAccessRole();
          setUser(null);
          setSession(null);
          setProfile(null);
          setRoles([]);
          setPermissions([]);
          setCapabilities([]);
        },
        (path) => window.location.replace(path),
      );
      if (error) toast.error("Sign out failed. Please try again.");
    } catch {
      toast.error("Sign out failed. Please try again.");
    }
  };

  const isSuperAdmin = roles.includes("super_admin");
  const isAdmin = roles.includes("admin") || isSuperAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        permissions,
        capabilities,
        isLoading,
        isAdmin,
        signUp,
        signIn,
        signInWithOAuth,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
