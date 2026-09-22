import type { CampaignPerformanceRow } from "../../api/schemaTypes";

export type CampaignSortKey = "sentAt" | "clicks" | "saves" | "interests" | "ctr" | "interestRate";

export function formatCampaignDashboardDay(date: string) {
  return new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00.000Z`));
}

export function formatCampaignDashboardDate(date: string) {
  return new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00.000Z`));
}

export function formatCampaignSentDate(date: string | null) {
  if (!date) return "Not sent";
  return new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(date));
}

export function formatRate(rate: number) {
  return `${(Number.isFinite(rate) ? rate * 100 : 0).toFixed(1)}%`;
}

export function sortCampaignPerformance(rows: CampaignPerformanceRow[], sortKey: CampaignSortKey, direction: "asc" | "desc") {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => {
    const leftValue = sortKey === "sentAt" ? Date.parse(left.sentAt ?? "") || 0 : left[sortKey];
    const rightValue = sortKey === "sentAt" ? Date.parse(right.sentAt ?? "") || 0 : right[sortKey];
    return (leftValue - rightValue) * multiplier || left.campaignName.localeCompare(right.campaignName);
  });
}
