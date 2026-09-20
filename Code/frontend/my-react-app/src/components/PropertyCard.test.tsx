import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { properties } from "../data";

const toggleSave = vi.fn();
const toggleCompare = vi.fn();
vi.mock("../context", () => ({
  useApp: () => ({ savedIds: [], compareIds: [], toggleSave, toggleCompare }),
}));
import PropertyCard from "./PropertyCard";

function Location() { return <output>{useLocation().pathname}</output>; }
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("keeps save and compare actions inside the card while its content navigates to the property", () => {
  render(<MemoryRouter><Routes><Route path="*" element={<><PropertyCard property={properties[0]} showCompare /><Location /></>} /></Routes></MemoryRouter>);

  fireEvent.click(screen.getByTitle("Save property"));
  fireEvent.click(screen.getByRole("button", { name: "+ Compare" }));
  expect(toggleSave).toHaveBeenCalledWith(properties[0].id);
  expect(toggleCompare).toHaveBeenCalledWith(properties[0].id);
  expect(screen.getByRole("status")).toHaveTextContent("/");

  fireEvent.click(screen.getByText(`View ${properties[0].name}`));
  expect(screen.getByRole("status")).toHaveTextContent(`/properties/${properties[0].id}`);
});
