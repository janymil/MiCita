import assert from "node:assert/strict";
import { test } from "node:test";
import { generatePromoSlots } from "../promos.js";

const base = {
  date: "2026-10-20",
  startTime: "11:00",
  endTime: "13:00",
  durationMinutes: 30,
  todayISO: "2026-10-19",
  nowTime: "09:00",
};

test("generates every slot where the service fits", () => {
  const slots = generatePromoSlots(base);
  assert.deepEqual(
    slots.map((slot) => slot.time),
    ["11:00", "11:30", "12:00", "12:30"],
  );
  assert.ok(slots.every((slot) => slot.available));
});

test("booked times are unavailable", () => {
  const slots = generatePromoSlots({ ...base, bookedTimes: ["11:30", "12:00"] });
  assert.deepEqual(
    slots.map((slot) => [slot.time, slot.available]),
    [
      ["11:00", true],
      ["11:30", false],
      ["12:00", false],
      ["12:30", true],
    ],
  );
});

test("past slots today are unavailable, future days are not", () => {
  const today = generatePromoSlots({
    ...base,
    date: "2026-10-19",
    startTime: "11:00",
    endTime: "14:00",
    nowTime: "12:10",
  });
  assert.deepEqual(
    today.map((slot) => [slot.time, slot.available]),
    [
      ["11:00", false],
      ["11:30", false],
      ["12:00", false],
      ["12:30", true],
      ["13:00", true],
      ["13:30", true],
    ],
  );
});

test("invalid windows produce no slots", () => {
  assert.deepEqual(generatePromoSlots({ ...base, startTime: "13:00", endTime: "11:00" }), []);
});

test("duration gaps leave no slot that would overrun the window", () => {
  const slots = generatePromoSlots({ ...base, durationMinutes: 45 });
  assert.deepEqual(
    slots.map((slot) => slot.time),
    ["11:00", "11:45"],
  );
});
