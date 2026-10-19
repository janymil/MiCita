import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildBuckets,
  computeBusinessMetrics,
  computeOccupancy,
  computePopularTimes,
  growthPct,
  money,
} from "../analytics.js";
import { addDaysISO, limaDateISO, parseISODate, resolvePeriod, startOfWeekISO } from "../dates.js";

const appointment = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  date: "2026-10-05",
  time: "10:00",
  duration: 60,
  status: "completed",
  price: "100.00",
  clientId: 1,
  serviceId: 1,
  createdAt: new Date("2026-09-20T12:00:00Z"),
  ...overrides,
});

test("revenue is attributed to the service date, not the booking date", () => {
  const period = {
    key: "thisMonth" as const,
    from: "2026-10-01",
    to: "2026-10-31",
    previousFrom: "2026-08-31",
    previousTo: "2026-09-30",
  };
  const metrics = computeBusinessMetrics({
    appointments: [appointment()],
    clients: [{ id: 1, name: "Ana" }],
    services: [{ id: 1, name: "Corte", duration: 60 }],
    period,
    granularity: "day",
    nowKey: "2026-10-19T09:00",
  });

  assert.equal(metrics.revenue, 100);
  assert.equal(metrics.appointmentsCreatedInPeriod, 0, "booking was created in September");
  assert.equal(metrics.totalRevenue, 100);
});

test("appointments booked this month but serviced next month do not inflate revenue", () => {
  const period = resolvePeriod("thisMonth", "2026-10-19");
  const metrics = computeBusinessMetrics({
    appointments: [appointment({ date: "2026-11-02", createdAt: new Date("2026-10-10T15:00:00Z") })],
    clients: [],
    services: [],
    period,
    nowKey: "2026-10-19T09:00",
  });
  assert.equal(metrics.revenue, 0);
  assert.equal(metrics.appointmentsCreatedInPeriod, 1);
});

test("growthPct handles a zero baseline", () => {
  assert.equal(growthPct(100, 0), 100);
  assert.equal(growthPct(0, 0), 0);
  assert.equal(growthPct(150, 100), 50);
});

test("retention is the share of served clients who came back", () => {
  const period = resolvePeriod("last30Days", "2026-10-19");
  const metrics = computeBusinessMetrics({
    appointments: [
      appointment({ id: 1, clientId: 1, date: "2026-10-01" }),
      appointment({ id: 2, clientId: 1, date: "2026-10-10" }),
      appointment({ id: 3, clientId: 2, date: "2026-10-11" }),
      appointment({ id: 4, clientId: 3, date: "2026-10-12" }),
    ],
    clients: [
      { id: 1, name: "Ana" },
      { id: 2, name: "Luis" },
      { id: 3, name: "Eva" },
    ],
    services: [],
    period,
    nowKey: "2026-10-19T09:00",
  });
  assert.equal(metrics.returningClients, 1);
  assert.ok(Math.abs(metrics.retentionRate - 33.333) < 0.01);
});

test("cancelled appointments free their slot and are excluded from occupancy", () => {
  const period = {
    key: "thisMonth" as const,
    from: "2026-10-05",
    to: "2026-10-05",
    previousFrom: "2026-10-04",
    previousTo: "2026-10-04",
  };
  const workingHours = { monday: { enabled: true, start: "09:00", end: "11:00" } };

  const active = computeOccupancy([appointment({ status: "confirmed" })], workingHours, period);
  const cancelled = computeOccupancy([appointment({ status: "cancelled" })], workingHours, period);

  assert.equal(active, 50, "60 booked minutes out of 120 available");
  assert.equal(cancelled, 0);
});

test("buckets fall back to weeks when a daily range is too long", () => {
  const period = resolvePeriod("thisYear", "2026-10-19");
  const buckets = buildBuckets([appointment()], period, "day");
  assert.ok(buckets.length < 60);
  assert.ok(buckets.length >= 40);
});

test("weekly buckets are Monday-first and carry ISO bounds", () => {
  assert.equal(startOfWeekISO("2026-10-18"), "2026-10-12");
  assert.equal(startOfWeekISO("2026-10-19"), "2026-10-19");
  assert.equal(addDaysISO("2026-10-19", 7), "2026-10-26");
  assert.equal(parseISODate("2026-10-19").getDay(), 1);
});

test("popular times normalise to 100 and ignore cancellations", () => {
  const cells = computePopularTimes([
    appointment({ id: 1, date: limaDateISO(), time: "10:00" }),
    appointment({ id: 2, date: limaDateISO(), time: "10:00" }),
    appointment({ id: 3, date: limaDateISO(), time: "11:00" }),
    appointment({ id: 4, date: limaDateISO(), time: "11:00", status: "cancelled" }),
  ]);
  const ten = cells.find((cell) => cell.hour === 10);
  const eleven = cells.find((cell) => cell.hour === 11);
  assert.equal(ten?.count, 2);
  assert.equal(ten?.popularity, 100);
  assert.equal(eleven?.count, 1, "the cancelled appointment must not count");
});

test("money survives nulls, empty strings and comma decimals", () => {
  assert.equal(money(null), 0);
  assert.equal(money(""), 0);
  assert.equal(money("120.50"), 120.5);
  assert.equal(money("120,50"), 120);
});
