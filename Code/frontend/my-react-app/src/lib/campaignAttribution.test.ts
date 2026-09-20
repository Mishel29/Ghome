import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureCampaignAttributionFromUrl, clearCampaignAttribution, getCampaignAttributionToken, setCampaignAttribution } from "./campaignAttribution";

describe("campaign attribution", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T03:04:05.000Z"));
  });

  it("stores a campaign token for the browser session", () => {
    setCampaignAttribution("campaign-a");
    expect(getCampaignAttributionToken()).toBe("campaign-a");
  });

  it("survives SPA navigation without a campaign query parameter", () => {
    expect(captureCampaignAttributionFromUrl("?campaignToken=campaign-a")).toBe("campaign-a");
    expect(captureCampaignAttributionFromUrl("")).toBe("campaign-a");
  });

  it("replaces attribution with the latest campaign click", () => {
    captureCampaignAttributionFromUrl("?campaignToken=campaign-a");
    captureCampaignAttributionFromUrl("?campaignToken=campaign-b");
    expect(getCampaignAttributionToken()).toBe("campaign-b");
  });

  it("can clear an attributed session", () => {
    setCampaignAttribution("campaign-a");
    clearCampaignAttribution();
    expect(getCampaignAttributionToken()).toBeUndefined();
  });
});
