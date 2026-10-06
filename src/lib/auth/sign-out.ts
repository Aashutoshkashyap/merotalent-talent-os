/** Keep the post-logout destination outside protected module routes. */
export async function signOutToPublicHome(
  performSignOut: () => Promise<{ error: Error | null }>,
  clearLocalState: () => void,
  redirect: (path: string) => void,
): Promise<Error | null> {
  const { error } = await performSignOut();
  if (error) return error;

  clearLocalState();
  redirect("/");
  return null;
}
