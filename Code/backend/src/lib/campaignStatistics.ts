export type CampaignStatisticEvent = {
  campaignId: string;
  type: string;
  occurredAt: Date;
  campaign: { subject: string };
};

export type CampaignDayStatistic = {
  campaignId: string;
  campaignSubject: string;
  date: string;
  sent: number;
  clicks: number;
  interests: number;
  saves: number;
  unsubscribes: number;
  clickRate: number;
  interestRate: number;
};

export function aggregateCampaignStatistics(events: CampaignStatisticEvent[]): CampaignDayStatistic[] {
  const days = new Map<string, Omit<CampaignDayStatistic, "clickRate" | "interestRate">>();
  for (const event of events) {
    const date = event.occurredAt.toISOString().slice(0, 10);
    const key = `${event.campaignId}:${date}`;
    const day = days.get(key) ?? {
      campaignId: event.campaignId,
      campaignSubject: event.campaign.subject,
      date,
      sent: 0,
      clicks: 0,
      interests: 0,
      saves: 0,
      unsubscribes: 0,
    };
    if (event.type === "SENT") day.sent += 1;
    if (event.type === "CLICKED") day.clicks += 1;
    if (event.type === "INTEREST") day.interests += 1;
    if (event.type === "SAVED") day.saves += 1;
    if (event.type === "UNSUBSCRIBED") day.unsubscribes += 1;
    days.set(key, day);
  }
  return [...days.values()].map((day) => ({
    ...day,
    clickRate: day.sent ? day.clicks / day.sent : 0,
    interestRate: day.sent ? day.interests / day.sent : 0,
  }));
}
