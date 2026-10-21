import type { QueryClient } from "@tanstack/react-query";

export const adminUserPageKey = (actorId: string, page: number, pageSize: number, search: string) =>
  ["admin-user-pages", actorId, page, pageSize, search.trim()] as const;

/** Memory only: never persist private directory data or put it in a CDN cache. */
export function loadAdminUserPage<T>(client: QueryClient, actorId: string,
  input: { page: number; pageSize: number; search: string },
  load: (signal: AbortSignal) => Promise<T>, force = false): Promise<T> {
  return client.fetchQuery({
    queryKey: adminUserPageKey(actorId, input.page, input.pageSize, input.search),
    queryFn: ({ signal }) => load(signal),
    staleTime: force ? 0 : 30_000,
    gcTime: 60_000,
    retry: false,
  });
}
