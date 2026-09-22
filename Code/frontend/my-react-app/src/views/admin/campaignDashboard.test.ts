import { describe, expect, it } from "vitest";
import type { CampaignPerformanceRow } from "../../api/schemaTypes";
import { formatRate, sortCampaignPerformance } from "./campaignDashboard";

const row = (overrides: Partial<CampaignPerformanceRow> = {}): CampaignPerformanceRow => ({
  campaignId: "campaign-a",
  campaignName: "September homes",
  sentAt: "2026-09-20T10:00:00.000Z",
  recipients: 10,
  sent: 10,
  failed: 0,
  clicks: 2,
  saves: 1,
  interests: 1,
  unsubscribes: 0,
  ctr: 0.2,
  interestRate: 0.1,
  ...overrides,
});

describe("campaign dashboard presentation helpers", () => {
  it("renders zero-safe rates", () => {
    expect(formatRate(0)).toBe("0.0%");
    expect(formatRate(Number.NaN)).toBe("0.0%");
  });

  it("sorts campaign rows by delivery date and attributed conversion metrics", () => {
    const rows = [row({ campaignId: "older", campaignName: "Older", sentAt: "2026-09-10T10:00:00.000Z", clicks: 1 }), row({ campaignId: "newer", campaignName: "Newer", sentAt: "2026-09-20T10:00:00.000Z", clicks: 4 })];
    expect(sortCampaignPerformance(rows, "sentAt", "desc").map((item) => item.campaignId)).toEqual(["newer", "older"]);
    expect(sortCampaignPerformance(rows, "clicks", "asc").map((item) => item.campaignId)).toEqual(["older", "newer"]);
  });
});
