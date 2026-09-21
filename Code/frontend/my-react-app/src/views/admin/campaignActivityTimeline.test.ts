import { describe,expect,it } from "vitest";
import type { CampaignActivityPoint } from "../../api/schemaTypes";
import { formatCampaignActivityAxisLabel,toCampaignActivityTimeline } from "./campaignActivityTimeline";

const point=(timestamp:string,metrics:Partial<CampaignActivityPoint>={})=>({campaignId:"campaign-a",campaignSubject:"September homes",timestamp,sent:0,failed:0,clicks:0,interests:0,saves:0,unsubscribes:0,...metrics});

describe("campaign activity timeline",()=>{
  it("keeps same-day activity at different times as distinct chronological points",()=>{
    const timeline=toCampaignActivityTimeline([
      point("2026-09-20T17:15:00Z",{saves:1}),
      point("2026-09-21T08:00:00Z",{interests:1}),
      point("2026-09-20T09:00:00Z",{sent:1}),
      point("2026-09-20T12:30:00Z",{clicks:1}),
    ]);

    expect(timeline).toHaveLength(4);
    expect(timeline.map((item)=>item.timestamp)).toEqual(["2026-09-20T09:00:00Z","2026-09-20T12:30:00Z","2026-09-20T17:15:00Z","2026-09-21T08:00:00Z"]);
    expect(new Set(timeline.map((item)=>item.timestampMs)).size).toBe(4);
  });

  it("formats concise localizable axis labels with time instead of ISO timestamps",()=>{
    const label=formatCampaignActivityAxisLabel("2026-09-20T09:00:00Z","UTC");
    expect(label).toMatch(/Sep/);
    expect(label).toMatch(/09:00/);
    expect(label).not.toContain("2026-09-20T09:00:00Z");
  });

  it("retains zero-valued supported metrics without restoring opens",()=>{
    const [timeline]=toCampaignActivityTimeline([point("2026-09-20T09:00:00Z")]);
    expect(timeline).toMatchObject({sent:0,failed:0,clicks:0,saves:0,interests:0,unsubscribes:0,sentValue:null,savesValue:null});
    expect(timeline).not.toHaveProperty("opens");
    expect(timeline).not.toHaveProperty("openValue");
  });
});
