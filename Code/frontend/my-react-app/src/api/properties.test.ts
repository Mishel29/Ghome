import { expect, it } from "vitest";
import { clearUnavailablePropertyFilters } from "./properties";
import type { PropertyFilterOptions } from "./schemaTypes";

const options: PropertyFilterOptions = {
  propertyTypes: ["Apartment"],
  saleTypes: ["New"],
  counties: ["Dublin"],
  locations: ["Sandyford"],
  sizeCategories: ["Medium"],
  bedrooms: [2, 3],
  bathrooms: [1, 2],
  agents: [{ id: "agent-1", name: "Aoife Kelly" }],
};

it("clears selected dynamic filters that disappear from the current metadata", () => {
  expect(clearUnavailablePropertyFilters({ type: "Townhouse", county: "Wicklow", location: "Bray", sizeCategory: "Large", agentId: "removed-agent", minBedrooms: 4, maxBathrooms: 3, publicationStatus: "DRAFT" }, options)).toEqual({ publicationStatus: "DRAFT" });
});
