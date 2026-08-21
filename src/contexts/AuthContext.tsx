import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "super_admin" | "talent" | "institution" | "company" | "mentor";

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
  isLoading: boolean;
  isAdmin: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    accountType: Exclude<AppRole, "admin">,
  ) => Promise<{ error: Error | null }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: Error | null; redirectTo?: string }>;
  signInWithOAuth: (
    provider: "google" | "apple",
    accountType?: Exclude<AppRole, "admin">,
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const pendingOAuthRoleKey = "merotalent.pending-oauth-role";
const oauthRoleClaimLifetimeMs = 30 * 60 * 1000;

const consumePendingOAuthRole = async () => {
  const raw = window.sessionStorage.getItem(pendingOAuthRoleKey);
  if (!raw) return;

  window.sessionStorage.removeItem(pendingOAuthRoleKey);
  try {
    const parsed = JSON.parse(raw) as { role?: string; createdAt?: number };
    if (
      !["institution", "company", "mentor"].includes(parsed.role ?? "") ||
      typeof parsed.createdAt !== "number" ||
      Date.now() - parsed.createdAt > oauthRoleClaimLifetimeMs
    ) {
      return;
    }

    const rpcClient = supabase as unknown as {
      rpc: (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ error: { code?: string; message?: string } | null }>;
    };
    const { error } = await rpcClient.rpc("claim_initial_oauth_role", {
      p_role: parsed.role,
    });
    if (error) {
      console.error("[auth] OAuth role onboarding was rejected", { code: error.code });
    }
  } catch {
    // Invalid or stale browser state is discarded without changing access.
  }
};

const LOCAL_SESSION_KEY = "merotalent.persistent_auth";

const savePersistentState = (
  user: User | null,
  session: Session | null,
  profile: Profile | null,
  roles: AppRole[],
) => {
  if (user && session) {
    try {
      localStorage.setItem(
        LOCAL_SESSION_KEY,
        JSON.stringify({ user, session, profile, roles }),
      );
    } catch {}
  }
};

const clearPersistentState = () => {
  try {
    localStorage.removeItem(LOCAL_SESSION_KEY);
  } catch {}
};

const getPersistentState = (): {
  user: User;
  session: Session;
  profile: Profile | null;
  roles: AppRole[];
} | null => {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.user && parsed?.session) {
        return parsed;
      }
    }
  } catch {}
  return null;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => getPersistentState()?.user ?? null);
  const [session, setSession] = useState<Session | null>(() => getPersistentState()?.session ?? null);
  const [profile, setProfile] = useState<Profile | null>(() => getPersistentState()?.profile ?? null);
  const [roles, setRoles] = useState<AppRole[]>(() => getPersistentState()?.roles ?? []);
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

  const refreshProfile = async () => {
    if (user) {
      await Promise.all([fetchProfile(user.id), fetchRoles(user.id)]);
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
            await consumePendingOAuthRole();
            await Promise.all([
              fetchProfile(currentSession.user.id),
              fetchRoles(currentSession.user.id)
            ]);
            setIsLoading(false);
          }, 0);
        } else {
          const restored = getPersistentState();
          if (restored) {
            setUser(restored.user);
            setSession(restored.session);
            setProfile(restored.profile);
            setRoles(restored.roles);
          } else {
            setUser(null);
            setSession(null);
            setProfile(null);
            setRoles([]);
          }
          setIsLoading(false);
        }
      }
    );

    // THEN get the initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (initialSession?.user) {
        setSession(initialSession);
        setUser(initialSession.user);
        consumePendingOAuthRole()
          .then(() => Promise.all([
            fetchProfile(initialSession.user.id),
            fetchRoles(initialSession.user.id)
          ]))
          .then(() => setIsLoading(false));
      } else {
        const restored = getPersistentState();
        if (restored) {
          setUser(restored.user);
          setSession(restored.session);
          setProfile(restored.profile);
          setRoles(restored.roles);
        }
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && session) {
      savePersistentState(user, session, profile, roles);
    }
  }, [user, session, profile, roles]);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    accountType: Exclude<AppRole, "admin">,
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
          account_type: accountType,
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
        ? accessData as { account_status?: unknown; roles?: unknown }
        : null;
    if (accessRecord?.account_status !== "active" || !Array.isArray(accessRecord.roles)) {
      await supabase.auth.signOut();
      return { error: new Error("This account is not active.") };
    }
    const accountRoles = accessRecord.roles.filter(
      (role): role is AppRole =>
        typeof role === "string" &&
        ["admin", "talent", "institution", "company", "mentor"].includes(role),
    );
    const redirectTo = accountRoles.includes("admin")
      ? "/admin"
      : accountRoles.includes("institution")
        ? "/institute"
        : accountRoles.includes("company")
          ? "/company"
          : accountRoles.includes("mentor")
            ? "/mentor"
            : "/dashboard";

    return { error: null, redirectTo };
  };

  const signInWithOAuth = async (
    provider: "google" | "apple",
    accountType: Exclude<AppRole, "admin"> = "talent",
  ) => {
    if (accountType === "talent") {
      window.sessionStorage.removeItem(pendingOAuthRoleKey);
    } else {
      window.sessionStorage.setItem(
        pendingOAuthRoleKey,
        JSON.stringify({ role: accountType, createdAt: Date.now() }),
      );
    }

    const redirectPath =
      accountType === "institution"
        ? "/institute"
        : accountType === "company"
          ? "/company"
          : accountType === "mentor"
            ? "/mentor"
            : "/dashboard";

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}${redirectPath}`,
      },
    });

    if (error) {
      window.sessionStorage.removeItem(pendingOAuthRoleKey);
    }

    return { error };
  };

  const signOut = async () => {
    clearPersistentState();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
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
