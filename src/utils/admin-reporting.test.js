import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFinancialReportPipeline,
  buildPayoutPipeline,
  buildPendingPayoutPipeline,
  getReportDateRange,
} from "./admin-reporting.js";

test("report range is UTC-inclusive by calendar day", () => {
  const { start, endExclusive } = getReportDateRange({
    startDate: "2026-10-01",
    endDate: "2026-10-31",
  });
  assert.equal(start.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.equal(endExclusive.toISOString(), "2026-11-01T00:00:00.000Z");
});

test("report range accepts an omitted range", () => {
  assert.deepEqual(getReportDateRange({}), {});
});

test("report range rejects incomplete, malformed, and reversed dates", () => {
  assert.throws(() => getReportDateRange({ startDate: "2026-10-01" }), /both/);
  assert.throws(
    () => getReportDateRange({ startDate: "2026-02-30", endDate: "2026-03-01" }),
    /valid calendar date/,
  );
  assert.throws(
    () => getReportDateRange({ startDate: "2026-10-02", endDate: "2026-10-01" }),
    /must not be after/,
  );
  assert.throws(
    () => getReportDateRange({ startDate: "", endDate: "" }),
    /YYYY-MM-DD/,
  );
});

test("financial report sums only successful payment and refund ledger entries", () => {
  const [match, group, project] = buildFinancialReportPipeline(
    new Date("2026-10-01T00:00:00.000Z"),
    new Date("2026-11-01T00:00:00.000Z"),
  );
  assert.deepEqual(match.$match, {
    status: "succeeded",
    createdAt: {
      $gte: new Date("2026-10-01T00:00:00.000Z"),
      $lt: new Date("2026-11-01T00:00:00.000Z"),
    },
  });
  assert.equal(group.$group._id, "$currency");
  assert.deepEqual(project.$project.commissionRevenue, {
    $subtract: ["$commissionsCollected", "$commissionReversed"],
  });
  assert.deepEqual(project.$project.netSales, {
    $subtract: ["$grossSales", "$refunds"],
  });
});

test("payout reports use paidAt for paid payouts and createdAt for pending", () => {
  const start = new Date("2026-10-01T00:00:00.000Z");
  const endExclusive = new Date("2026-11-01T00:00:00.000Z");
  assert.deepEqual(buildPayoutPipeline(start, endExclusive)[0].$match, {
    status: "paid",
    paidAt: { $ne: null, $gte: start, $lt: endExclusive },
  });
  assert.deepEqual(buildPendingPayoutPipeline(start, endExclusive)[0].$match, {
    status: "pending",
    createdAt: { $gte: start, $lt: endExclusive },
  });
});
