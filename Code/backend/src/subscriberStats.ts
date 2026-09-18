export type SubscriberStatRow = {
  subscribedAt: Date | null;
  unsubscribedAt: Date | null;
};

export type SubscriberStatDay = {
  date: string;
  activeRegistrations: number;
  registrations: number;
  unsubscribes: number;
};

export type SubscriberStatsResult = {
  totalActiveRegistrations: number;
  totalSubscribers: number;
  averageActiveRegistrationsPerDay: number;
  averageSubscribersPerDay: number;
  totalUnsubscribes: number;
  totalUnsubscribers: number;
  averageUnsubscribesPerDay: number;
  averageUnsubscribersPerDay: number;
  days: SubscriberStatDay[];
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function addDay(date: Date) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export function calculateSubscriberStats(
  rows: SubscriberStatRow[],
  from?: string,
  to?: string,
  today = new Date(),
): SubscriberStatsResult {
  const dates = rows.flatMap((row) => [row.subscribedAt, row.unsubscribedAt].filter((date): date is Date => Boolean(date)));
  const firstActivity = dates.reduce<Date | null>((first, date) => (!first || date < first ? date : first), null);
  const start = from ? startOfDay(from) : startOfDay(firstActivity ? dateKey(firstActivity) : dateKey(today));
  const end = to ? startOfDay(to) : startOfDay(dateKey(today));
  const activeCounts = new Map<string, number>();
  const unsubscribeCounts = new Map<string, number>();

  for (const row of rows) {
    if (row.subscribedAt && row.subscribedAt >= start && row.subscribedAt < addDay(end)) {
      const date = dateKey(row.subscribedAt);
      activeCounts.set(date, (activeCounts.get(date) ?? 0) + 1);
    }
    if (row.unsubscribedAt && row.unsubscribedAt >= start && row.unsubscribedAt < addDay(end)) {
      const date = dateKey(row.unsubscribedAt);
      unsubscribeCounts.set(date, (unsubscribeCounts.get(date) ?? 0) + 1);
    }
  }

  const days: SubscriberStatDay[] = [];
  for (let cursor = start; cursor <= end; cursor = addDay(cursor)) {
    const date = dateKey(cursor);
    const activeRegistrations = activeCounts.get(date) ?? 0;
    days.push({ date, activeRegistrations, registrations: activeRegistrations, unsubscribes: unsubscribeCounts.get(date) ?? 0 });
  }

  const dayCount = Math.max(days.length, 1);
  const totalSubscribers = days.reduce((total, day) => total + day.activeRegistrations, 0);
  const totalUnsubscribers = days.reduce((total, day) => total + day.unsubscribes, 0);
  return {
    totalActiveRegistrations: totalSubscribers,
    totalSubscribers,
    averageActiveRegistrationsPerDay: totalSubscribers / dayCount,
    averageSubscribersPerDay: totalSubscribers / dayCount,
    totalUnsubscribes: totalUnsubscribers,
    totalUnsubscribers,
    averageUnsubscribesPerDay: totalUnsubscribers / dayCount,
    averageUnsubscribersPerDay: totalUnsubscribers / dayCount,
    days,
  };
}