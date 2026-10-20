import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeCommission,
  computeBusinessEarnings,
  toKobo,
  toNaira,
} from "../src/utils/money.js";

describe("money utils", () => {
  it("converts naira to kobo and back", () => {
    assert.strictEqual(toKobo(10.5), 1050);
    assert.strictEqual(toNaira(1050), 10.5);
  });

  it("computes 10% commission", () => {
    assert.strictEqual(computeCommission(10000, 0.10), 1000);
    assert.strictEqual(computeCommission(10000), 1000);
  });

  it("computes business earnings", () => {
    assert.strictEqual(computeBusinessEarnings(10000, 1000), 9000);
    assert.strictEqual(computeBusinessEarnings(500, 1000), 0); // floor at 0
  });
});
