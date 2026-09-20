import { describe, expect, it } from "vitest";
import { allowedCorsOrigins, assertProductionRuntimeConfiguration, isAllowedCorsOrigin, publicAppUrl, publicBackendUrl } from "./runtimeConfig.js";

describe("runtime configuration", () => {
  it("uses local URL defaults only outside production", () => {
    expect(publicAppUrl({ NODE_ENV: "development" })).toBe("http://localhost:5173");
    expect(publicBackendUrl({ NODE_ENV: "test" })).toBe("http://localhost:4000");
  });

  it("requires public URLs in production instead of generating localhost links", () => {
    expect(() => publicAppUrl({ NODE_ENV: "production" })).toThrow("PUBLIC_APP_URL");
    expect(() => publicBackendUrl({ NODE_ENV: "production" })).toThrow("PUBLIC_BACKEND_URL");
  });

  it("uses configured public URLs without a trailing slash", () => {
    const env = { PUBLIC_APP_URL: "https://harborstone.example/", PUBLIC_BACKEND_URL: "https://api.harborstone.example/" };
    expect(publicAppUrl(env)).toBe("https://harborstone.example");
    expect(publicBackendUrl(env)).toBe("https://api.harborstone.example");
  });

  it("allows only the configured Vercel origin in production", () => {
    const env = { NODE_ENV: "production", PUBLIC_APP_URL: "https://harborstone.vercel.app" };
    expect(allowedCorsOrigins(env)).toEqual(new Set(["https://harborstone.vercel.app"]));
    expect(isAllowedCorsOrigin("https://harborstone.vercel.app", env)).toBe(true);
    expect(isAllowedCorsOrigin("https://evil.example", env)).toBe(false);
  });

  it("allows localhost and loopback aliases for configured local development", () => {
    const env = { NODE_ENV: "development", PUBLIC_APP_URL: "http://localhost:5173" };
    expect(allowedCorsOrigins(env)).toEqual(new Set(["http://localhost:5173", "http://127.0.0.1:5173"]));
  });

  it("fails fast when production deployment variables are incomplete", () => {
    expect(() => assertProductionRuntimeConfiguration({ NODE_ENV: "production", DATABASE_URL: "postgresql://db/harborstone" })).toThrow("PUBLIC_APP_URL");
  });
});
