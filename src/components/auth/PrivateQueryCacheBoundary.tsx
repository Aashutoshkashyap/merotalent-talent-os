import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

/** Private caches never survive a change of signed-in identity. */
export function PrivateQueryCacheBoundary() {
  const { user } = useAuth();
  const client = useQueryClient();
  useEffect(() => {
    client.removeQueries({ predicate: query => query.queryKey[0] === "admin-user-pages" &&
      query.queryKey[1] !== user?.id });
  }, [client, user?.id]);
  return null;
}
