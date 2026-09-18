import assert from "node:assert/strict";
import test from "node:test";
import { calculateSubscriberStats } from "./subscriberStats.js";

const date = (value: string) => new Date(`${value}T12:00:00.000Z`);

const rows = [
  { subscribedAt: date("2026-09-01"), unsubscribedAt: null },
  { subscribedAt: date("2026-09-02"), unsubscribedAt: date("2026-09-04") },
  { subscribedAt: date("2026-09-04"), unsubscribedAt: null },
];

test("uses the full activity range by default", () => {
  const result = calculateSubscriberStats(rows, undefined, undefined, date("2026-09-05"));
  assert.equal(result.totalSubscribers, 3);
  assert.equal(result.totalUnsubscribers, 1);
  assert.equal(result.days.length, 5);
  assert.equal(result.averageSubscribersPerDay, 0.6);
  assert.equal(result.averageUnsubscribersPerDay, 0.2);
});

test("counts and averages only activity inside a selected range", () => {
  const result = calculateSubscriberStats(rows, "2026-09-02", "2026-09-04", date("2026-09-05"));
  assert.equal(result.totalSubscribers, 2);
  assert.equal(result.totalUnsubscribers, 1);
  assert.equal(result.days.length, 3);
  assert.equal(result.averageSubscribersPerDay, 2 / 3);
  assert.equal(result.averageUnsubscribersPerDay, 1 / 3);
});

test("open-ended ranges extend to the available boundary", () => {
  const fromOnly = calculateSubscriberStats(rows, "2026-09-03", undefined, date("2026-09-05"));
  const toOnly = calculateSubscriberStats(rows, undefined, "2026-09-02", date("2026-09-05"));
  assert.deepEqual(fromOnly.days.map((day) => day.date), ["2026-09-03", "2026-09-04", "2026-09-05"]);
  assert.deepEqual(toOnly.days.map((day) => day.date), ["2026-09-01", "2026-09-02"]);
  assert.equal(fromOnly.totalSubscribers, 1);
  assert.equal(toOnly.totalSubscribers, 2);
});