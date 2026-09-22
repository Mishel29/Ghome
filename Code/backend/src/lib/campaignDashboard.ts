export type CampaignDashboardMetrics = {
  sent: number;
  failed: number;
  clicks: number;
  saves: number;
  interests: number;
  unsubscribes: number;
};

export type CampaignDashboardRecipient = {
  id: string;
  status: string;
  sentAt: Date | null;
  failedAt: Date | null;
};

export type CampaignDashboardEvent = {
  id: string;
  type: string;
  occurredAt: Date;
  deduplicationKey: string | null;
};

export type CampaignDashboardCampaign = {
  id: string;
  subject: string;
  sentAt: Date | null;
  createdAt: Date;
  recipientCount: number;
  recipients: CampaignDashboardRecipient[];
  events: CampaignDashboardEvent[];
};

export type CampaignDashboardDay = CampaignDashboardMetrics & { date: string };

export type CampaignPerformance = CampaignDashboardMetrics & {
  campaignId: string;
  campaignName: string;
  sentAt: string | null;
  recipients: number;
  ctr: number;
  interestRate: number;
};

export type CampaignDashboardData = {
  summary: CampaignDashboardMetrics & { ctr: number; interestRate: number };
  days: CampaignDashboardDay[];
  campaigns: CampaignPerformance[];
};

type DateRange = { from?: Date | null; to?: Date | null };

const metricTypes = new Set(["SENT", "FAILED", "CLICKED", "SAVED", "INTEREST", "UNSUBSCRIBED"]);
const attributedTypes = new Set(["SAVED", "INTEREST"]);

function emptyMetrics(): CampaignDashboardMetrics {
  return { sent: 0, failed: 0, clicks: 0, saves: 0, interests: 0, unsubscribes: 0 };
}

function inRange(date: Date | null | undefined, range: DateRange) {
  if (!date) return false;
  return (!range.from || date >= range.from) && (!range.to || date <= range.to);
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addMetric(target: CampaignDashboardMetrics, type: string) {
  if (type === "SENT") target.sent += 1;
  if (type === "FAILED") target.failed += 1;
  if (type === "CLICKED") target.clicks += 1;
  if (type === "SAVED") target.saves += 1;
  if (type === "INTEREST") target.interests += 1;
  if (type === "UNSUBSCRIBED") target.unsubscribes += 1;
}

function rates(metrics: CampaignDashboardMetrics) {
  return {
    ctr: metrics.sent ? metrics.clicks / metrics.sent : 0,
    interestRate: metrics.sent ? metrics.interests / metrics.sent : 0,
  };
}

/**
 * Builds the manager dashboard only from a campaign's recipient delivery records
 * and its attributed CampaignEvent rows. Analytics events and subscriber totals are
 * deliberately absent, so direct non-campaign activity cannot enter these metrics.
 */
export function aggregateCampaignDashboard(campaigns: CampaignDashboardCampaign[], range: DateRange = {}): CampaignDashboardData {
  const daily = new Map<string, CampaignDashboardMetrics>();
  const campaignMetrics = new Map<string, CampaignDashboardMetrics>();
  const relevantCampaignIds = new Set<string>();

  const add = (campaignId: string, date: Date, type: string) => {
    if (!inRange(date, range) || !metricTypes.has(type)) return;
    const day = daily.get(dayKey(date)) ?? emptyMetrics();
    const campaign = campaignMetrics.get(campaignId) ?? emptyMetrics();
    addMetric(day, type);
    addMetric(campaign, type);
    daily.set(dayKey(date), day);
    campaignMetrics.set(campaignId, campaign);
    relevantCampaignIds.add(campaignId);
  };

  for (const campaign of campaigns) {
    const hasDeliveryRecords = campaign.recipients.some((recipient) => recipient.status === "SENT" || recipient.status === "FAILED");

    for (const recipient of campaign.recipients) {
      if (recipient.status === "SENT" && recipient.sentAt) add(campaign.id, recipient.sentAt, "SENT");
      if (recipient.status === "FAILED" && recipient.failedAt) add(campaign.id, recipient.failedAt, "FAILED");
    }

    const deduplicatedAttribution = new Set<string>();
    for (const event of campaign.events) {
      if (!metricTypes.has(event.type)) continue;
      if ((event.type === "SENT" || event.type === "FAILED") && hasDeliveryRecords) continue;
      if (attributedTypes.has(event.type)) {
        const eventKey = `${campaign.id}:${event.type}:${event.deduplicationKey ?? event.id}`;
        if (deduplicatedAttribution.has(eventKey)) continue;
        deduplicatedAttribution.add(eventKey);
      }
      add(campaign.id, event.occurredAt, event.type);
    }

    if (inRange(campaign.sentAt, range) || inRange(campaign.createdAt, range)) relevantCampaignIds.add(campaign.id);
  }

  const summary = [...campaignMetrics.values()].reduce((total, metrics) => {
    for (const key of Object.keys(total) as Array<keyof CampaignDashboardMetrics>) total[key] += metrics[key];
    return total;
  }, emptyMetrics());

  const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
  const campaignRows = [...relevantCampaignIds]
    .map((campaignId) => {
      const campaign = campaignById.get(campaignId)!;
      const metrics = campaignMetrics.get(campaignId) ?? emptyMetrics();
      return {
        campaignId,
        campaignName: campaign.subject,
        sentAt: campaign.sentAt?.toISOString() ?? null,
        recipients: Math.max(campaign.recipientCount, campaign.recipients.length),
        ...metrics,
        ...rates(metrics),
      };
    })
    .sort((left, right) => {
      const leftDate = campaignById.get(left.campaignId)!.sentAt ?? campaignById.get(left.campaignId)!.createdAt;
      const rightDate = campaignById.get(right.campaignId)!.sentAt ?? campaignById.get(right.campaignId)!.createdAt;
      return rightDate.getTime() - leftDate.getTime() || left.campaignName.localeCompare(right.campaignName);
    });

  return {
    summary: { ...summary, ...rates(summary) },
    days: [...daily.entries()].map(([date, metrics]) => ({ date, ...metrics })).sort((left, right) => left.date.localeCompare(right.date)),
    campaigns: campaignRows,
  };
}
