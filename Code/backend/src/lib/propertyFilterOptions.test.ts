import { describe, expect, it } from "vitest";
import { buildPropertyFilterOptions } from "./propertyFilterOptions.js";

describe("property filter options", () => {
  it("normalizes text, excludes empty values, and sorts distinct options", () => {
    const options = buildPropertyFilterOptions({
      propertyTypes: [" Townhouse ", "townhouse", "Apartment", ""],
      saleTypes: ["New", null],
      counties: [" Wicklow", "wicklow", "Dublin"],
      locations: ["Bray", "  Bray  ", undefined],
      sizeCategories: ["Large", ""],
      bedrooms: [3, 1, 3, null],
      bathrooms: [2, 1, 2, undefined],
      agents: [{ id: "agent-2", name: "  Zoe Agent " }, { id: "agent-1", name: "Alice Agent" }, { id: "agent-1", name: "Duplicate" }, null],
    });

    expect(options).toEqual({
      propertyTypes: ["Apartment", "Townhouse"],
      saleTypes: ["New"],
      counties: ["Dublin", "Wicklow"],
      locations: ["Bray"],
      sizeCategories: ["Large"],
      bedrooms: [1, 3],
      bathrooms: [1, 2],
      agents: [{ id: "agent-1", name: "Alice Agent" }, { id: "agent-2", name: "Zoe Agent" }],
    });
  });

  it("removes a category when no current property supplies it", () => {
    const initial = buildPropertyFilterOptions({ propertyTypes: ["Townhouse"], saleTypes: [], counties: ["Wicklow"], locations: ["Bray"], sizeCategories: [], bedrooms: [], bathrooms: [], agents: [] });
    const afterDeletion = buildPropertyFilterOptions({ propertyTypes: [], saleTypes: [], counties: [], locations: [], sizeCategories: [], bedrooms: [], bathrooms: [], agents: [] });

    expect(initial.propertyTypes).toContain("Townhouse");
    expect(afterDeletion.propertyTypes).not.toContain("Townhouse");
    expect(afterDeletion.counties).not.toContain("Wicklow");
  });
});
