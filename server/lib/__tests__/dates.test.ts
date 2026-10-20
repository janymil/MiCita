import assert from "node:assert/strict";
import { test } from "node:test";
import { limaDateISO, limaDayBounds, limaTimeHM } from "../dates.js";

test("limaDayBounds starts at 05:00 UTC (Peru is UTC-5 all year)", () => {
  const { from, to } = limaDayBounds("2026-10-19");
  assert.equal(from.toISOString(), "2026-10-19T05:00:00.000Z");
  assert.equal(to.toISOString(), "2026-10-20T05:00:00.000Z");
});

test("a late-night Lima transaction stays inside its local day", () => {
  // 2026-10-20T02:30Z is 21:30 on 2026-10-19 in Lima.
  const instant = new Date("2026-10-20T02:30:00.000Z");
  const { from, to } = limaDayBounds(limaDateISO(instant));
  assert.equal(limaDateISO(instant), "2026-10-19");
  assert.ok(instant >= from && instant < to);
});

test("limaTimeHM formats with a 24h clock", () => {
  assert.equal(limaTimeHM(new Date("2026-10-19T23:05:00.000Z")), "18:05");
});
