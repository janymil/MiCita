import assert from "node:assert/strict";
import { test } from "node:test";
import { findLapsedClients } from "../retention.js";

const clients = [
  { id: 1, name: "Ana", phone: "999111222" },
  { id: 2, name: "Beto", phone: null },
  { id: 3, name: "Carla", phone: "988777666" },
];

test("only completed visits count towards the last visit", () => {
  const lapsed = findLapsedClients({
    clients,
    appointments: [
      { clientId: 1, date: "2026-08-01", status: "completed", price: "30" },
      { clientId: 1, date: "2026-09-20", status: "cancelled", price: "30" },
      { clientId: 2, date: "2026-09-25", status: "completed", price: "50" },
    ],
    days: 21,
    todayISO: "2026-10-19",
  });

  assert.deepEqual(
    lapsed.map((client) => [client.id, client.daysSince]),
    [
      [1, 79],
      [2, 24],
    ],
  );
});

test("clients inside the window are not returned", () => {
  const lapsed = findLapsedClients({
    clients,
    appointments: [{ clientId: 1, date: "2026-10-10", status: "completed", price: "30" }],
    days: 21,
    todayISO: "2026-10-19",
  });
  assert.deepEqual(lapsed, []);
});

test("clients without completed visits are never labelled lapsed", () => {
  const lapsed = findLapsedClients({
    clients: [{ id: 9, name: "Nuevo", phone: null }],
    appointments: [],
    days: 7,
    todayISO: "2026-10-19",
  });
  assert.deepEqual(lapsed, []);
});

test("visits and lifetime spend are aggregated per client", () => {
  const lapsed = findLapsedClients({
    clients,
    appointments: [
      { clientId: 3, date: "2026-07-01", status: "completed", price: "25.50" },
      { clientId: 3, date: "2026-08-01", status: "completed", price: "24.50" },
    ],
    days: 21,
    todayISO: "2026-10-19",
  });

  assert.equal(lapsed.length, 1);
  assert.equal(lapsed[0].visits, 2);
  assert.equal(lapsed[0].totalSpent, 50);
  assert.equal(lapsed[0].lastVisitDate, "2026-08-01");
});

test("results are ordered by the longest absence first", () => {
  const lapsed = findLapsedClients({
    clients,
    appointments: [
      { clientId: 1, date: "2026-09-01", status: "completed", price: "20" },
      { clientId: 3, date: "2026-06-01", status: "completed", price: "20" },
    ],
    days: 21,
    todayISO: "2026-10-19",
  });
  assert.deepEqual(lapsed.map((client) => client.id), [3, 1]);
});

test("the response respects the limit", () => {
  const many = Array.from({ length: 10 }, (_, index) => ({ id: index + 1, name: `C${index}`, phone: null }));
  const lapsed = findLapsedClients({
    clients: many,
    appointments: many.map((client) => ({
      clientId: client.id,
      date: "2026-01-01",
      status: "completed",
      price: "20",
    })),
    days: 21,
    todayISO: "2026-10-19",
    limit: 3,
  });
  assert.equal(lapsed.length, 3);
});
