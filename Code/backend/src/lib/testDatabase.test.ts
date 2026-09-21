import { describe, expect, it } from "vitest";
import { requireTestDatabaseUrl } from "../integration/testDatabase.js";

describe("integration database safety", () => {
  it("accepts a dedicated local or Docker test database", () => {
    expect(requireTestDatabaseUrl("postgresql://postgres:postgres@postgres:5432/harborstone_test")).toContain("harborstone_test");
  });

  it("refuses missing, production-like, and non-test database URLs", () => {
    expect(() => requireTestDatabaseUrl(undefined)).toThrow("TEST_DATABASE_URL");
    expect(() => requireTestDatabaseUrl("postgresql://user:pass@dpg-render.example/harborstone_test")).toThrow("production");
    expect(() => requireTestDatabaseUrl("postgresql://postgres:postgres@localhost:5432/harborstone")).toThrow("*_test");
  });
});
