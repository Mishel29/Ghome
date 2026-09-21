import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import AdminSubscribers from "./Subscribers";
import { graphqlRequest } from "../../api/graphql";
import { useQuery } from "../../api/useQuery";

vi.mock("../../api/graphql", () => ({ graphqlRequest: vi.fn() }));
vi.mock("../../api/useQuery", () => ({
  useQuery: vi.fn(),
  useAction: () => ({ busy: false, error: "", success: "", run: async (work: () => Promise<void>) => work() }),
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("adds a consented subscriber with a normalized international phone number", async () => {
  vi.mocked(useQuery).mockImplementation(((query: string) => query.includes("subscriberStats")
    ? { data: { subscriberStats: { totalSubscribers: 1, totalUnsubscribers: 0, averageSubscribersPerDay: 1, averageUnsubscribersPerDay: 0, days: [] } }, loading: false, error: "", reload: vi.fn() }
    : { data: { subscribersPage: { totalCount: 1, activeCount: 1, unsubscribedCount: 0, nodes: [{ id: "subscriber-1", name: "Pat", email: "pat@example.test", phone: null, status: "ACTIVE", subscribedAt: "2026-09-01T00:00:00.000Z", unsubscribedAt: null }] } }, loading: false, error: "", reload: vi.fn() }) as never);
  vi.mocked(graphqlRequest).mockResolvedValue({ addSubscriber: { id: "subscriber-2" } });

  render(<MemoryRouter><AdminSubscribers /></MemoryRouter>);
  fireEvent.click(screen.getAllByRole("button", { name: "Add Subscriber" }).at(-1)!);
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New Subscriber" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.test" } });
  fireEvent.change(screen.getByLabelText("Country code"), { target: { value: "+44" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Phone number" }), { target: { value: "20-7946 0018" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /explicit marketing consent/i }));
  fireEvent.click(screen.getAllByRole("button", { name: "Add Subscriber" }).at(-1)!);

  await waitFor(() => expect(graphqlRequest).toHaveBeenCalledWith(
    "mutation($input:SubscriberInput!){addSubscriber(input:$input){id}}",
    { input: { name: "New Subscriber", email: "new@example.test", consent: true, phone: "+442079460018" } },
  ));
});
