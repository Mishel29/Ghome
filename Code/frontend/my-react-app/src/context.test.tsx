import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const mocked = vi.hoisted(() => ({
  token: null as string | null,
  graphqlRequest: vi.fn(),
  propertyPage: vi.fn(),
  propertyById: vi.fn(),
  capture: vi.fn(),
  campaignToken: "campaign-token",
}));

vi.mock("./api/graphql", () => ({
  getAuthToken: () => mocked.token,
  setAuthToken: (token: string | null) => { mocked.token = token; },
  graphqlRequest: mocked.graphqlRequest,
}));
vi.mock("./api/properties", () => ({
  PROPERTY_FIELDS: "id",
  propertyPage: mocked.propertyPage,
  propertyById: mocked.propertyById,
  viewProperty: (property: unknown) => property,
}));
vi.mock("./lib/campaignAttribution", () => ({
  captureCampaignAttributionFromUrl: mocked.capture,
  getCampaignAttributionToken: () => mocked.campaignToken,
}));

import { AppProvider, useApp } from "./context";

function Controls() {
  const { login, savedIds, toggleSave, user } = useApp();
  return <>
    <button onClick={() => void login("user@example.test", "password")}>Log in</button>
    <button onClick={() => toggleSave("property-1")}>Save property</button>
    <output>{`${user?.role ?? "anonymous"}:${savedIds.join(",")}`}</output>
  </>;
}

beforeEach(() => {
  localStorage.clear();
  mocked.token = null;
  mocked.campaignToken = "campaign-token";
  mocked.capture.mockReset();
  mocked.propertyPage.mockResolvedValue({ nodes: [] });
  mocked.propertyById.mockResolvedValue(null);
  mocked.graphqlRequest.mockImplementation(async (query: string) => {
    if (query.includes("login")) return { login: { token: "new-token", user: { id: "user-1", name: "User", email: "user@example.test", role: "USER" } } };
    if (query.includes("publicNewsPage")) return { publicNewsPage: { nodes: [] } };
    if (query.includes("savedProperties")) return { savedProperties: [] };
    return {};
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("records an anonymous campaign save and persists the local saved list", async () => {
  render(<AppProvider><Controls /></AppProvider>);

  fireEvent.click(screen.getByRole("button", { name: "Save property" }));

  expect(screen.getByRole("status")).toHaveTextContent("anonymous:property-1");
  expect(localStorage.getItem("harborstone-saved-properties")).toBe('["property-1"]');
  await waitFor(() => expect(mocked.graphqlRequest).toHaveBeenCalledWith(
    "mutation($id:ID!,$campaignToken:String!){recordCampaignSave(propertyId:$id,campaignToken:$campaignToken)}",
    { id: "property-1", campaignToken: "campaign-token" },
  ));
});

it("includes campaign attribution when an authenticated user saves a property", async () => {
  render(<AppProvider><Controls /></AppProvider>);

  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Log in" })));
  fireEvent.click(screen.getByRole("button", { name: "Save property" }));

  await waitFor(() => expect(mocked.graphqlRequest).toHaveBeenCalledWith(
    "mutation($id:ID!,$saved:Boolean!,$campaignToken:String){setPropertySaved(propertyId:$id,saved:$saved,campaignToken:$campaignToken)}",
    { id: "property-1", saved: true, campaignToken: "campaign-token" },
  ));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("user:property-1"));
});
