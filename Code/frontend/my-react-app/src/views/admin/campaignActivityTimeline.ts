import type { CampaignActivityPoint } from "../../api/schemaTypes";

export type CampaignActivityTimelinePoint = CampaignActivityPoint & {
  timestampMs: number;
  sentValue: number | null;
  failedValue: number | null;
  clicksValue: number | null;
  interestsValue: number | null;
  savesValue: number | null;
  unsubscribesValue: number | null;
};

type DateInput = string | number;

function dateFor(timestamp: DateInput) {
  return new Date(timestamp);
}

export function formatCampaignActivityAxisLabel(timestamp: DateInput, timeZone?: string) {
  const parts = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(dateFor(timestamp));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("day")} ${value("month")} · ${value("hour")}:${value("minute")}`;
}

export function formatCampaignActivityDate(timestamp: DateInput, timeZone?: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(dateFor(timestamp));
}

export function formatCampaignActivityTime(timestamp: DateInput, timeZone?: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(dateFor(timestamp));
}

export function toCampaignActivityTimeline(points: CampaignActivityPoint[]): CampaignActivityTimelinePoint[] {
  return points
    .map((point, index) => ({ point, index, timestampMs: Date.parse(point.timestamp) }))
    .filter(({ timestampMs }) => Number.isFinite(timestampMs))
    .sort((left, right) => left.timestampMs - right.timestampMs || left.index - right.index)
    .map(({ point, timestampMs }) => ({
      ...point,
      timestampMs,
      sentValue: point.sent || null,
      failedValue: point.failed || null,
      clicksValue: point.clicks || null,
      interestsValue: point.interests || null,
      savesValue: point.saves || null,
      unsubscribesValue: point.unsubscribes || null,
    }));
}
