import { describe, expect, it } from "vitest";
import { campaignClickUrl, unsubscribeUrl } from "./emailContent.js";

describe("campaign email URLs", () => {
  const production = { NODE_ENV: "production", PUBLIC_BACKEND_URL: "https://api.harborstone.example" };

  it("constructs encoded production unsubscribe links without exposing database identifiers", () => {
    const url = unsubscribeUrl("safe token", "campaign token", production);
    expect(url).toBe("https://api.harborstone.example/unsubscribe?token=safe%20token&campaignToken=campaign%20token");
  });

  it("constructs tracked property links from the public backend URL", () => {
    const url = campaignClickUrl("token", "", "property-id", production);
    expect(url).toBe("https://api.harborstone.example/campaign-click?token=token&propertyId=property-id");
  });
});
