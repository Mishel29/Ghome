import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getAuthToken, graphqlRequest, setAuthToken } from "./graphql";

beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("posts GraphQL requests with the current bearer token and variables", async () => {
  setAuthToken("session-token");
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ data: { me: { id: "user-1" } } }), { status: 200 }));

  await expect(graphqlRequest<{ me: { id: string } }>("{me{id}}", { includeSaved: true })).resolves.toEqual({ me: { id: "user-1" } });

  expect(fetch).toHaveBeenCalledWith("http://localhost:4000/graphql", expect.objectContaining({
    method: "POST",
    headers: expect.objectContaining({ Authorization: "Bearer session-token" }),
    body: JSON.stringify({ query: "{me{id}}", variables: { includeSaved: true } }),
  }));
});

it("does not send an Authorization header for anonymous requests", async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ data: { publicNewsPage: { nodes: [] } } }), { status: 200 }));

  await graphqlRequest("{publicNewsPage{totalCount}}");

  expect(fetch).toHaveBeenCalledWith("http://localhost:4000/graphql", expect.objectContaining({
    headers: { "Content-Type": "application/json" },
  }));
});

it("surfaces HTTP rate-limit responses", async () => {
  vi.mocked(fetch).mockResolvedValue(new Response("Too many requests", { status: 429 }));

  await expect(graphqlRequest("{me{id}}")).rejects.toThrow("GraphQL request failed: 429");
});

it("clears an expired session and notifies the app for unauthenticated GraphQL errors", async () => {
  const expired = vi.fn();
  window.addEventListener("auth-expired", expired);
  setAuthToken("expired-token");
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ errors: [{ message: "Session expired", extensions: { code: "UNAUTHENTICATED" } }] }), { status: 200 }));

  await expect(graphqlRequest("{me{id}}")).rejects.toThrow("Session expired");

  expect(getAuthToken()).toBeNull();
  expect(expired).toHaveBeenCalledTimes(1);
  window.removeEventListener("auth-expired", expired);
});
