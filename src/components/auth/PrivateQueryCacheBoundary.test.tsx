import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { PrivateQueryCacheBoundary } from "./PrivateQueryCacheBoundary";

const state = vi.hoisted(() => ({ user: { id: "admin-a" } as { id: string } | null }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => state }));

it("evicts the previous identity's private pages on account change and logout", () => {
  const client = new QueryClient();
  client.setQueryData(["admin-user-pages", "admin-a", 1], ["private-a"]);
  client.setQueryData(["public-directory"], ["public"]);
  const view = () => <QueryClientProvider client={client}><PrivateQueryCacheBoundary /></QueryClientProvider>;
  const rendered = render(view());
  expect(client.getQueryData(["admin-user-pages", "admin-a", 1])).toEqual(["private-a"]);
  state.user = { id: "admin-b" };
  rendered.rerender(view());
  expect(client.getQueryData(["admin-user-pages", "admin-a", 1])).toBeUndefined();
  client.setQueryData(["admin-user-pages", "admin-b", 1], ["private-b"]);
  state.user = null;
  rendered.rerender(view());
  expect(client.getQueryData(["admin-user-pages", "admin-b", 1])).toBeUndefined();
  expect(client.getQueryData(["public-directory"])).toEqual(["public"]);
  client.clear();
});
