import { describe, expect, it } from "vitest";
import { aggregateCampaignDashboard, type CampaignDashboardCampaign } from "./campaignDashboard.js";

const campaign = (overrides: Partial<CampaignDashboardCampaign> = {}): CampaignDashboardCampaign => ({
  id: "campaign-a",
  subject: "September homes",
  sentAt: new Date("2026-09-20T12:00:00.000Z"),
  createdAt: new Date("2026-09-20T09:00:00.000Z"),
  recipientCount: 2,
  recipients: [
    { id: "recipient-1", status: "SENT", sentAt: new Date("2026-09-20T10:00:00.000Z"), failedAt: null },
    { id: "recipient-2", status: "FAILED", sentAt: null, failedAt: new Date("2026-09-20T10:05:00.000Z") },
  ],
  events: [
    { id: "click-1", type: "CLICKED", occurredAt: new Date("2026-09-20T11:00:00.000Z"), deduplicationKey: null },
    { id: "save-1", type: "SAVED", occurredAt: new Date("2026-09-20T11:05:00.000Z"), deduplicationKey: "save:recipient-1:property-1" },
    { id: "save-duplicate", type: "SAVED", occurredAt: new Date("2026-09-20T11:06:00.000Z"), deduplicationKey: "save:recipient-1:property-1" },
    { id: "interest-1", type: "INTEREST", occurredAt: new Date("2026-09-21T09:00:00.000Z"), deduplicationKey: "interest:recipient-1:property-1" },
    { id: "interest-duplicate", type: "INTEREST", occurredAt: new Date("2026-09-21T09:01:00.000Z"), deduplicationKey: "interest:recipient-1:property-1" },
    { id: "unsubscribe-1", type: "UNSUBSCRIBED", occurredAt: new Date("2026-09-21T12:00:00.000Z"), deduplicationKey: "unsubscribe:campaign-a:subscriber-1" },
  ],
  ...overrides,
});

describe("campaign dashboard aggregation", () => {
  it("keeps recipient delivery metrics, attributed events, and rates at the correct level", () => {
    const dashboard = aggregateCampaignDashboard([campaign()]);

    expect(dashboard.summary).toEqual(expect.objectContaining({ sent: 1, failed: 1, clicks: 1, saves: 1, interests: 1, unsubscribes: 1, ctr: 1, interestRate: 1 }));
    expect(dashboard.days).toEqual([
      expect.objectContaining({ date: "2026-09-20", sent: 1, failed: 1, clicks: 1, saves: 1, interests: 0 }),
      expect.objectContaining({ date: "2026-09-21", sent: 0, failed: 0, interests: 1, unsubscribes: 1 }),
    ]);
    expect(dashboard.campaigns).toEqual([expect.objectContaining({ campaignName: "September homes", recipients: 2, sent: 1, failed: 1, ctr: 1, interestRate: 1 })]);
  });

  it("uses delivery rows over duplicate delivery events and ignores out-of-range activity", () => {
    const withLegacyEvents = campaign({ events: [
      { id: "sent-event", type: "SENT", occurredAt: new Date("2026-09-20T10:00:00.000Z"), deduplicationKey: null },
      { id: "failed-event", type: "FAILED", occurredAt: new Date("2026-09-20T10:05:00.000Z"), deduplicationKey: null },
      { id: "outside", type: "CLICKED", occurredAt: new Date("2026-08-01T10:00:00.000Z"), deduplicationKey: null },
    ] });

    const dashboard = aggregateCampaignDashboard([withLegacyEvents], { from: new Date("2026-09-20T00:00:00.000Z"), to: new Date("2026-09-21T23:59:59.999Z") });
    expect(dashboard.summary).toEqual(expect.objectContaining({ sent: 1, failed: 1, clicks: 0, saves: 0, interests: 0 }));
  });

  it("does not accept standalone activity because only campaign records are aggregated", () => {
    const dashboard = aggregateCampaignDashboard([]);
    expect(dashboard).toEqual({ summary: { sent: 0, failed: 0, clicks: 0, saves: 0, interests: 0, unsubscribes: 0, ctr: 0, interestRate: 0 }, days: [], campaigns: [] });
  });
});
