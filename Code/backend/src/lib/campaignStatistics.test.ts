import { describe, expect, it } from "vitest";
import { aggregateCampaignStatistics, type CampaignStatisticEvent } from "./campaignStatistics.js";

const event = (type: CampaignStatisticEvent["type"], occurredAt: string, campaignId = "campaign-a"): CampaignStatisticEvent => ({
  campaignId,
  type,
  occurredAt: new Date(occurredAt),
  campaign: { subject: campaignId === "campaign-a" ? "Harbor update" : "Second update" },
});

describe("campaign statistics aggregation", () => {
  it("keeps saves and interests in their campaign/day bucket", () => {
    const days = aggregateCampaignStatistics([
      event("SENT", "2026-09-01T10:00:00.000Z"),
      event("CLICKED", "2026-09-01T11:00:00.000Z"),
      event("SAVED", "2026-09-01T12:00:00.000Z"),
      event("SAVED", "2026-09-01T13:00:00.000Z"),
      event("INTEREST", "2026-09-01T14:00:00.000Z"),
      event("SAVED", "2026-09-01T15:00:00.000Z", "campaign-b"),
    ]);

    expect(days).toEqual(expect.arrayContaining([
      expect.objectContaining({ campaignId: "campaign-a", sent: 1, clicks: 1, saves: 2, interests: 1, clickRate: 1, interestRate: 1 }),
      expect.objectContaining({ campaignId: "campaign-b", sent: 0, clicks: 0, saves: 1, interests: 0, clickRate: 0, interestRate: 0 }),
    ]));
  });

  it("returns explicit zero values for metrics with no events", () => {
    expect(aggregateCampaignStatistics([event("SENT", "2026-09-02T10:00:00.000Z")])[0]).toMatchObject({ clicks: 0, interests: 0, saves: 0, unsubscribes: 0 });
  });

  it("keeps different UTC dates separate", () => {
    const days = aggregateCampaignStatistics([event("SAVED", "2026-09-02T23:59:59.000Z"), event("INTEREST", "2026-09-03T00:00:00.000Z")]);
    expect(days.map((day) => day.date)).toEqual(["2026-09-02", "2026-09-03"]);
  });
});
