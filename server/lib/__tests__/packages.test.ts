import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_PACKAGE_SALE_MESSAGE,
  DEFAULT_PACKAGE_USE_MESSAGE,
  normalizeDeskSettings,
  renderPackageMessage,
} from "../desk-settings.js";
import { packageExpired, packageExpiry } from "../packages.js";

test("package expiry respects status and validity date", () => {
  const now = new Date("2026-10-19T12:00:00Z");
  assert.equal(packageExpired({ status: "active", expiresAt: null }, now), false);
  assert.equal(
    packageExpired({ status: "active", expiresAt: new Date("2026-10-20T12:00:00Z") }, now),
    false,
  );
  assert.equal(
    packageExpired({ status: "active", expiresAt: new Date("2026-10-19T11:59:59Z") }, now),
    true,
  );
  assert.equal(packageExpired({ status: "used", expiresAt: null }, now), true);
  assert.equal(packageExpired({ status: "expired", expiresAt: null }, now), true);
});

test("package validity days produce an expiry timestamp", () => {
  const from = new Date("2026-10-19T12:00:00Z");
  assert.equal(packageExpiry({ validityDays: 60 }, from).toISOString(), "2026-12-18T12:00:00.000Z");
  assert.equal(packageExpiry({ validityDays: 1 }, from).toISOString(), "2026-10-20T12:00:00.000Z");
});

test("package settings normalize defaults", () => {
  const defaults = normalizeDeskSettings({});
  assert.equal(defaults.packagesEnabled, true);
  assert.equal(defaults.showPackagesOnMicrosite, true);
  assert.equal(defaults.packageSaleMessageTemplate, DEFAULT_PACKAGE_SALE_MESSAGE);
  assert.equal(defaults.packageUseMessageTemplate, DEFAULT_PACKAGE_USE_MESSAGE);

  const disabled = normalizeDeskSettings({
    packagesEnabled: false,
    showPackagesOnMicrosite: false,
  });
  assert.equal(disabled.packagesEnabled, false);
  assert.equal(disabled.showPackagesOnMicrosite, false);
});

test("package templates render names, uses and links", () => {
  const sale = renderPackageMessage(DEFAULT_PACKAGE_SALE_MESSAGE, {
    name: "Ana",
    businessName: "Barbería Lima",
    packageName: "Bono 5 cortes",
    uses: 5,
    remaining: 5,
    link: "https://micita.pe/bono/t/token",
  });
  assert.ok(sale.includes("Ana"));
  assert.ok(sale.includes("Bono 5 cortes"));
  assert.ok(sale.includes("5 usos"));
  assert.ok(sale.includes("/bono/t/token"));
  assert.ok(!sale.includes("{paquete}"));

  const use = renderPackageMessage(DEFAULT_PACKAGE_USE_MESSAGE, {
    name: "Ana",
    businessName: "Barbería Lima",
    packageName: "Bono 5 cortes",
    uses: 5,
    remaining: 3,
    link: "https://micita.pe/bono/t/token",
  });
  assert.ok(use.includes("quedan 3"));
});
