/**
 * Client routing is a convenience only; database RLS remains the authorization
 * boundary. Delegated module access is represented by explicit permissions,
 * so it must be considered alongside a user's primary role.
 */
export const resolveWorkspacePath = (
  roles: readonly string[],
  _permissions: readonly string[] = [],
  _capabilities: readonly string[] = [],
) => {
  if (roles.includes("admin") || roles.includes("super_admin")) return "/admin";

  // Every non-platform-admin account lands in the shared student dashboard.
  // Module workspaces remain explicit destinations in dashboard navigation,
  // where their own entitlement and entity-scope guards can render the
  // correct locked/renewal state. This prevents an expired module assignment
  // from replacing the user's normal signed-in landing experience.
  return "/dashboard";
};
