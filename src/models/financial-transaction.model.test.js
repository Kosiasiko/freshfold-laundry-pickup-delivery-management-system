import assert from "node:assert/strict";
import mongoose from "mongoose";
import test from "node:test";
import FinancialTransaction from "./financial-transaction.model.js";

const validPayment = () => ({
  type: "payment",
  status: "succeeded",
  amount: 10000,
  commissionAmount: 1500,
  currency: "USD",
  order: new mongoose.Types.ObjectId(),
  business: new mongoose.Types.ObjectId(),
});

test("financial ledger accepts integer minor-unit payment values", async () => {
  const payment = new FinancialTransaction(validPayment());
  await assert.doesNotReject(payment.validate());
});

test("financial ledger rejects fractional amounts and commission above payment", async () => {
  const fractional = new FinancialTransaction({ ...validPayment(), amount: 100.25 });
  await assert.rejects(fractional.validate(), { name: "ValidationError" });

  const excessiveCommission = new FinancialTransaction({
    ...validPayment(),
    commissionAmount: 10001,
  });
  await assert.rejects(excessiveCommission.validate(), { name: "ValidationError" });
});

test("refund ledger entries must refer to an original payment", async () => {
  const refund = new FinancialTransaction({
    ...validPayment(),
    type: "refund",
  });
  await assert.rejects(refund.validate(), { name: "ValidationError" });
});

test("payment refund counters cannot exceed the original payment or commission", async () => {
  const payment = new FinancialTransaction({
    ...validPayment(),
    refundedAmount: 10001,
  });
  await assert.rejects(payment.validate(), { name: "ValidationError" });

  const commission = new FinancialTransaction({
    ...validPayment(),
    commissionReversed: 1501,
  });
  await assert.rejects(commission.validate(), { name: "ValidationError" });
});
