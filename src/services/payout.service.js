import Payout from "../models/payout.model.js";
import Payment from "../models/payment.model.js";
import Order from "../models/order.model.js";
import Business from "../models/business.model.js";
import { createTransfer, verifyTransfer } from "../utils/gatewayAdapter.js";
import { computeBusinessEarnings } from "../utils/money.js";
import { logAuditEvent } from "../utils/auditLogger.js";

/**
 * Calculate earnings owed to a business: sum of successful payments minus
 * commission and refunds.
 */
export const calculateBusinessEarnings = async (businessId) => {
  const payments = await Payment.find({ business: businessId, status: "successful" });

  let gross = 0;
  let commission = 0;
  let refunded = 0;

  for (const p of payments) {
    gross += p.amount || 0;
    commission += p.commissionAmount || 0;
    refunded += p.refundedAmount || 0;
  }

  const netOwed = gross - commission - refunded;
  return {
    gross,
    commission,
    refunded,
    netOwed: Math.max(0, netOwed),
    currency: "NGN",
  };
};

/**
 * Get payout history for a business.
 */
export const getPayoutHistory = async (businessId, filters = {}) => {
  return Payout.find({ business: businessId, ...filters }).sort({
    createdAt: -1,
  });
};

/**
 * Request a payout (business initiates). Creates a pending payout record.
 */
export const requestPayout = async ({ businessId, amountKobo, idempotencyKey, req }) => {
  const business = await Business.findById(businessId);
  if (!business) throw new Error("Business not found.");

  const earnings = await calculateBusinessEarnings(businessId);
  const paidOut = await Payout.aggregate([
    { $match: { business: businessId, status: "successful" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const totalPaidOut = paidOut.length > 0 ? paidOut[0].total : 0;
  const netAvailable = Math.max(0, earnings.netOwed - totalPaidOut);
  if (amountKobo > netAvailable) {
    throw new Error("Requested payout exceeds net owed earnings after prior payouts.");
  }

  // Prevent duplicate payout requests with same idempotency key
  const existing = await Payout.findOne({ idempotencyKey });
  if (existing) return existing;

  const payout = await Payout.create({
    business: businessId,
    amount: amountKobo,
    currency: "NGN",
    status: "pending",
    recipientCode: business.payoutRecipientCode || null,
    idempotencyKey,
  });

  await logAuditEvent({
    actor: req?.user?._id,
    action: "payout.requested",
    resourceType: "Payout",
    resourceId: payout._id,
    details: { amount: amountKobo, business: businessId },
    req,
  });

  return payout;
};

/**
 * Process a payout: call gateway transfer, then update status.
 * Intended to be called by admin or a scheduled job.
 */
export const processPayout = async ({ payoutId, req, session }) => {
  const payout = await Payout.findById(payoutId).populate("business").session(session);
  if (!payout) throw new Error("Payout not found.");
  if (payout.status !== "pending") {
    throw new Error("Only pending payouts can be processed.");
  }

  const business = payout.business;
  if (!business.payoutRecipientCode) {
    throw new Error("Business has no payout recipient code configured.");
  }

  await Payout.findByIdAndUpdate(
    payout._id,
    { status: "processing" },
    { session }
  );

  try {
    const transfer = await createTransfer({
      amountKobo: payout.amount,
      recipientCode: business.payoutRecipientCode,
      reference: `payout_${payout._id}`,
      reason: `Laundry platform payout to ${business.name}`,
    });

    const updated = await Payout.findByIdAndUpdate(
      payout._id,
      {
        status: transfer.status === "success" ? "successful" : "pending",
        providerReference: transfer.transferReference,
        paidAt: transfer.status === "success" ? new Date() : null,
      },
      { new: true, session }
    );

    await logAuditEvent({
      actor: req?.user?._id,
      action: `payout.${updated.status}`,
      resourceType: "Payout",
      resourceId: payout._id,
      details: { amount: payout.amount, providerReference: transfer.transferReference },
      req,
      session,
    });

    return updated;
  } catch (err) {
    await Payout.findByIdAndUpdate(payout._id, { status: "failed" }, { session });
    await logAuditEvent({
      actor: req?.user?._id,
      action: "payout.failed",
      resourceType: "Payout",
      resourceId: payout._id,
      details: { amount: payout.amount, error: err.message },
      req,
      session,
    });
    throw err;
  }
};

/**
 * Reconcile payouts against payments, commissions, and refunds.
 */
export const reconcilePayouts = async (businessId) => {
  const earnings = await calculateBusinessEarnings(businessId);
  const payouts = await Payout.find({ business: businessId });

  let totalPaidOut = 0;
  for (const p of payouts) {
    if (p.status === "successful") totalPaidOut += p.amount || 0;
  }

  return {
    business: businessId,
    netOwed: earnings.netOwed,
    totalPaidOut,
    outstanding: Math.max(0, earnings.netOwed - totalPaidOut),
    unreconciled: payouts.filter((p) => !p.reconciled).length,
    currency: "NGN",
  };
};
