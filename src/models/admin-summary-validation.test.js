import assert from "node:assert/strict";
import mongoose from "mongoose";
import test from "node:test";
import Order from "./order.model.js";
import Payout from "./payout.model.js";

test("completed orders require a completion date", async () => {
  const order = new Order({
    business: new mongoose.Types.ObjectId(),
    status: "completed",
  });
  await assert.rejects(order.validate(), (error) => {
    assert.equal(error.name, "ValidationError");
    assert.ok(error.errors.completedAt);
    return true;
  });
});

test("paid payouts require a payment date and integer minor-unit amount", async () => {
  const payout = new Payout({
    business: new mongoose.Types.ObjectId(),
    amount: 100.5,
    currency: "USD",
    status: "paid",
  });
  await assert.rejects(payout.validate(), { name: "ValidationError" });
});
