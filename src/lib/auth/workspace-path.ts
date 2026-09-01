/**
 * Client routing is a convenience only; database RLS remains the authorization
 * boundary. Delegated module access is represented by explicit permissions,
 * so it must be considered alongside a user's primary role.
 */
export const resolveWorkspacePath = (
  roles: readonly string[],
  permissions: readonly string[] = [],
) => {
  if (roles.includes("admin") || roles.includes("super_admin")) return "/admin";
  if (roles.includes("institution") || permissions.includes("college.manage")) return "/institute";
  if (roles.includes("company") || permissions.includes("job.post")) return "/company";
  if (roles.includes("mentor") || permissions.includes("mentor.manage")) return "/mentor";
  return "/dashboard";
};
