import assert from "node:assert/strict";
import { test } from "node:test";
import { computeQueuePlan } from "../queue.js";

const at = (minutesFromNow: number, now = new Date("2026-10-19T15:00:00.000Z")) =>
  new Date(now.getTime() + minutesFromNow * 60_000);

test("empty queue with a free chair means no wait", () => {
  const plan = computeQueuePlan([], { now: at(0) });
  assert.equal(plan.waitForNewTicketMinutes, 0);
  assert.equal(plan.remainingChairMinutes, 0);
  assert.deepEqual(plan.entries, []);
});

test("positions and ETAs accumulate service durations", () => {
  const now = at(0);
  const plan = computeQueuePlan(
    [
      { id: 3, joinedAt: at(2, now), durationMinutes: 45 },
      { id: 1, joinedAt: at(-5, now), durationMinutes: 30 },
      { id: 2, joinedAt: at(0, now), durationMinutes: 20 },
    ],
    { now },
  );

  assert.deepEqual(
    plan.entries.map((entry) => [entry.id, entry.position, entry.etaMinutes]),
    [
      [1, 1, 0],
      [2, 2, 30],
      [3, 3, 50],
    ],
  );
  assert.equal(plan.waitForNewTicketMinutes, 95);
});

test("a busy chair delays everyone by the remaining service time", () => {
  const now = at(0);
  const plan = computeQueuePlan(
    [{ id: 1, joinedAt: now, durationMinutes: 30 }],
    { now, seated: { startedAt: at(-20, now), durationMinutes: 60 } },
  );

  assert.equal(plan.remainingChairMinutes, 40);
  assert.equal(plan.entries[0].etaMinutes, 40);
  assert.equal(plan.waitForNewTicketMinutes, 70);
});

test("overdue services never produce negative ETAs", () => {
  const now = at(0);
  const plan = computeQueuePlan([], {
    now,
    seated: { startedAt: at(-90, now), durationMinutes: 30 },
  });

  assert.equal(plan.remainingChairMinutes, 0);
  assert.equal(plan.waitForNewTicketMinutes, 0);
});

test("missing durations fall back to the default", () => {
  const now = at(0);
  const plan = computeQueuePlan(
    [
      { id: 1, joinedAt: now, durationMinutes: null },
      { id: 2, joinedAt: at(1, now), durationMinutes: 0 },
    ],
    { now, defaultDurationMinutes: 30 },
  );

  assert.equal(plan.entries[1].etaMinutes, 30);
  assert.equal(plan.waitForNewTicketMinutes, 60);
});
