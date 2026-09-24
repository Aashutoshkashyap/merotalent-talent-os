import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getStoredGuestCollegeApplicationToken } from "@/lib/forms/guest-college-application";
import { invalidateStudentActivityCache } from "@/lib/student/activity-cache";
import { resolveWorkspacePath } from "@/lib/auth/workspace-path";

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
  ) => Promise<{ error: Error | null; redirectTo?: string }>;
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
    if (user) {
      await Promise.all([fetchProfile(user.id), fetchAccessContext(user.id)]);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          setTimeout(async () => {
            await Promise.all([
              fetchProfile(currentSession.user.id),
              fetchAccessContext(currentSession.user.id),
              claimGuestCollegeApplications(currentSession.user.id),
            ]);
            setIsLoading(false);
          }, 0);
        } else {
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

    // THEN get the initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (initialSession?.user) {
        setSession(initialSession);
        setUser(initialSession.user);
        Promise.all([
          fetchProfile(initialSession.user.id),
          fetchAccessContext(initialSession.user.id),
          claimGuestCollegeApplications(initialSession.user.id),
        ])
          .then(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
    // The Supabase listener must be registered once; its helpers do not depend
    // on mutable inputs and only update provider state from the active session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
  ) => {
    const normalizedEmail = email.trim().toLowerCase();

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
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
          // Every new account begins as Student/User. Privileged module access
          // can only be requested after signup and granted by Super Admin.
          account_type: "talent",
        },
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
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
    clearPendingModuleAccessRole();

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      clearPendingModuleAccessRole();
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setPermissions([]);
    setCapabilities([]);
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
