import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import PropertyFilters from "./PropertyFilters";
import type { PropertyFilterOptions } from "../api/schemaTypes";

afterEach(cleanup);

const options: PropertyFilterOptions = {
  propertyTypes: ["Apartment", "Townhouse"],
  saleTypes: ["New", "Resale"],
  counties: ["Dublin", "Wicklow"],
  locations: ["Bray", "Sandyford"],
  sizeCategories: ["Large"],
  bedrooms: [2, 3, 4],
  bathrooms: [1, 2],
  agents: [{ id: "agent-1", name: "Aoife Kelly" }],
};

it("renders dynamic property metadata while retaining All choices", () => {
  const onChange = vi.fn();
  render(<PropertyFilters value={{}} options={options} onChange={onChange} />);

  expect(screen.getByRole("option", { name: "All types" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Townhouse" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Wicklow" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Bray" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Aoife Kelly" })).toBeInTheDocument();
});

it("passes a selected dynamic property type to the existing filter state", () => {
  const onChange = vi.fn();
  render(<PropertyFilters value={{}} options={options} onChange={onChange} />);

  fireEvent.change(screen.getByLabelText("Property type"), { target: { value: "Townhouse" } });

  expect(onChange).toHaveBeenLastCalledWith({ type: "Townhouse" });
});
