import { describe, expect, it } from "vitest";
import { calculateSubscriberStats } from "./subscriberStats.js";

const date = (value: string) => new Date(`${value}T12:00:00.000Z`);

const rows = [
  { subscribedAt: date("2026-09-01"), unsubscribedAt: null },
  { subscribedAt: date("2026-09-02"), unsubscribedAt: date("2026-09-04") },
  { subscribedAt: date("2026-09-04"), unsubscribedAt: null },
];

describe("subscriber statistics", () => {
it("uses the full activity range by default", () => {
  const result = calculateSubscriberStats(rows, undefined, undefined, date("2026-09-05"));
  expect(result.totalSubscribers).toBe(3);
  expect(result.totalUnsubscribers).toBe(1);
  expect(result.days).toHaveLength(5);
  expect(result.averageSubscribersPerDay).toBe(0.6);
  expect(result.averageUnsubscribersPerDay).toBe(0.2);
});

it("counts and averages only activity inside a selected range", () => {
  const result = calculateSubscriberStats(rows, "2026-09-02", "2026-09-04", date("2026-09-05"));
  expect(result.totalSubscribers).toBe(2);
  expect(result.totalUnsubscribers).toBe(1);
  expect(result.days).toHaveLength(3);
  expect(result.averageSubscribersPerDay).toBe(2 / 3);
  expect(result.averageUnsubscribersPerDay).toBe(1 / 3);
});

it("open-ended ranges extend to the available boundary", () => {
  const fromOnly = calculateSubscriberStats(rows, "2026-09-03", undefined, date("2026-09-05"));
  const toOnly = calculateSubscriberStats(rows, undefined, "2026-09-02", date("2026-09-05"));
  expect(fromOnly.days.map((day) => day.date)).toEqual(["2026-09-03", "2026-09-04", "2026-09-05"]);
  expect(toOnly.days.map((day) => day.date)).toEqual(["2026-09-01", "2026-09-02"]);
  expect(fromOnly.totalSubscribers).toBe(1);
  expect(toOnly.totalSubscribers).toBe(2);
});
});
