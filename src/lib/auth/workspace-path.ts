/**
 * Client routing is a convenience only; database RLS remains the authorization
 * boundary. Delegated module access is represented by explicit permissions,
 * so it must be considered alongside a user's primary role.
 */
export const resolveWorkspacePath = (
  roles: readonly string[],
  permissions: readonly string[] = [],
  capabilities: readonly string[] = [],
) => {
  if (roles.includes("admin") || roles.includes("super_admin")) return "/admin";
  if (roles.includes("institution") || permissions.includes("college.manage") || capabilities.includes("college")) return "/institute";
  if (roles.includes("company") || permissions.includes("job.post") || capabilities.includes("jobs")) return "/company";
  if (roles.includes("mentor") || permissions.includes("mentor.manage") || capabilities.includes("mentor")) return "/mentor";
  return "/dashboard";
};
