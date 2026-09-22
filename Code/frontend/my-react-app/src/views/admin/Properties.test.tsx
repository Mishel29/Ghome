import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom/vitest";

const mocked = vi.hoisted(() => ({
  reload: vi.fn(),
  optionReload: vi.fn(),
}));

vi.mock("../../api/useQuery", () => ({
  useQuery: (query: string) => query.includes("propertyFilterOptions")
    ? { data: null, loading: false, error: "Metadata unavailable", reload: mocked.optionReload }
    : { data: { adminProperties: { totalCount: 0, nodes: [] } }, loading: false, error: "", reload: mocked.reload },
  useAction: () => ({ busy: false, error: "", success: "", run: vi.fn() }),
}));

vi.mock("../../api/properties", () => ({
  PROPERTY_FIELDS: "id",
  PROPERTY_FILTER_OPTIONS_QUERY: "query { propertyFilterOptions { propertyTypes } }",
  clearUnavailablePropertyFilters: (filter: unknown) => filter,
  deleteProperty: vi.fn(),
  publishProperties: vi.fn(),
  publishProperty: vi.fn(),
  saveProperty: vi.fn(),
}));

import AdminProperties from "./Properties";

it("keeps the property listing usable when filter metadata fails", () => {
  render(<MemoryRouter><AdminProperties /></MemoryRouter>);

  expect(screen.getByRole("heading", { name: "Property Management" })).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("Filter options could not be loaded");
  expect(screen.getByRole("option", { name: "All types" })).toBeInTheDocument();
});
