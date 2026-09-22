import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { graphqlRequest } from "../api/graphql";
import type { Property } from "../api/schemaTypes";
import Chatbot from "./Chatbot";

vi.mock("../api/graphql", () => ({ graphqlRequest: vi.fn() }));
vi.mock("../components/PropertyCard", () => ({
  default: ({ property, onAskAI }: { property: { id: string; name: string }; onAskAI?: (property: unknown) => void }) => (
    <button type="button" onClick={() => onAskAI?.(property)}>Ask AI about {property.name}</button>
  ),
}));

const property = {
  id: "published-property-1",
  name: "Published Cork Home",
  location: "Cork",
  county: "Cork",
  address: null,
  postalCode: null,
  type: "House",
  saleType: "New homes",
  status: "ON_SALE",
  stage: "READY_TO_MOVE",
  publicationStatus: "PUBLISHED",
  publishedAt: "2026-01-01",
  priceMin: 400000,
  priceMax: 450000,
  bedroomsMin: 3,
  bedroomsMax: 3,
  bathroomsMin: 2,
  bathroomsMax: 2,
  sizeSqm: 100,
  sizeSqmMax: 100,
  sizeCategory: null,
  completionYear: 2026,
  description: "Public description",
  bedroomOptions: [3],
  bathroomOptions: [2],
  listedDate: "2026-01-01",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  sourceKey: null,
  agentId: null,
  slug: null,
  developmentId: null,
  agent: null,
  media: [],
  features: [],
  valueHistory: [],
  historicalPrices: [],
  clickCount: 0,
  interestCount: 0,
  pendingInterestCount: 0,
  saveCount: 0,
  campaigned: false,
} as Property;

function reply(overrides: Record<string, unknown> = {}) {
  return {
    chatWithPropertyAI: {
      message: "I found a current published property.",
      sessionId: "assistant-session-1234",
      intent: "PROPERTY_SEARCH",
      responseType: "PROPERTY_RESULTS",
      selectedPropertyId: null,
      filterJson: JSON.stringify({ location: "Cork" }),
      totalCount: 1,
      warnings: [],
      properties: [property],
      ...overrides,
    },
  };
}

describe("Chatbot", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("sends the mutation, renders authoritative cards, and selects a property", async () => {
    vi.mocked(graphqlRequest).mockResolvedValueOnce(reply()).mockResolvedValueOnce(reply({ intent: "PROPERTY_DETAILS", responseType: "PROPERTY_DETAILS", selectedPropertyId: property.id, properties: [property] }));
    const user = userEvent.setup();
    render(<MemoryRouter><Chatbot /></MemoryRouter>);

    const input = screen.getByLabelText("Ask about properties");
    await user.type(input, "Show me homes in Cork{enter}");
    await screen.findByText("I found a current published property.");
    expect(vi.mocked(graphqlRequest)).toHaveBeenCalledWith(expect.stringContaining("chatWithPropertyAI"), expect.objectContaining({ input: expect.objectContaining({ message: "Show me homes in Cork" }) }));
    await user.click(screen.getByRole("button", { name: "Ask AI about Published Cork Home" }));
    await screen.findByText("Asking about:");
    expect(vi.mocked(graphqlRequest)).toHaveBeenLastCalledWith(expect.stringContaining("chatWithPropertyAI"), expect.objectContaining({ input: expect.objectContaining({ selectedPropertyId: property.id, sessionId: "assistant-session-1234" }) }));
  });

  it("shows a friendly retry state without exposing GraphQL errors", async () => {
    vi.mocked(graphqlRequest).mockRejectedValueOnce(new Error("provider token should not appear")).mockResolvedValueOnce(reply());
    const user = userEvent.setup();
    render(<MemoryRouter><Chatbot /></MemoryRouter>);

    await user.type(screen.getByLabelText("Ask about properties"), "Find homes{enter}");
    await screen.findByRole("alert");
    expect(screen.getByRole("alert").textContent).toContain("temporarily unavailable");
    expect(screen.getByRole("alert").textContent).not.toContain("provider token");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("I found a current published property.");
  });

  it("renders a deterministic comparison table instead of treating comparison as free-form text", async () => {
    vi.mocked(graphqlRequest).mockResolvedValueOnce(reply({ intent: "PROPERTY_COMPARISON", responseType: "COMPARISON", properties: [property, { ...property, id: "published-property-2", name: "Published Dublin Home" }] }));
    const user = userEvent.setup();
    render(<MemoryRouter><Chatbot /></MemoryRouter>);

    await user.type(screen.getByLabelText("Ask about properties"), "Compare the first two{enter}");
    await screen.findByRole("table");
    expect(screen.getByText("Published Dublin Home")).toBeTruthy();
    expect(screen.getByText("Price")).toBeTruthy();
  });
});
