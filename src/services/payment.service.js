import Payment from "../models/payment.model.js";
import Order from "../models/order.model.js";
import Business from "../models/business.model.js";
import {
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
} from "../utils/gatewayAdapter.js";
import { recordCommissionOnce, reverseCommissionOnRefund } from "./commission.service.js";
import { logAuditEvent } from "../utils/auditLogger.js";
import { toKobo } from "../utils/money.js";

export const initiatePayment = async ({ orderId, customerId, idempotencyKey, req }) => {
  const order = await Order.findById(orderId).populate("business");
  if (!order) throw new Error("Order not found.");
  if (order.customer && order.customer.toString() !== customerId.toString()) {
    throw new Error("Not authorized to pay for this order.");
  }

  const existing = await Payment.findOne({ order: orderId, status: "successful" });
  if (existing) {
    throw new Error("Order already has a successful payment.");
  }

  const business = order.business;
  // order.totalAmount is already stored in kobo; do not double-convert
  const amountKobo = Number(order.totalAmount || 0);
  const reference = `ff_${order._id}_${Date.now()}`;

  const payment = await Payment.create(
    [
      {
        customer: customerId,
        order: orderId,
        business: business._id,
        amount: amountKobo,
        currency: order.currency || "NGN",
        commissionableAmount: order.commissionableAmount || 0,
        status: "pending",
        gatewayReference: reference,
        idempotencyKey,
      },
    ]
  );

  let gatewayResult;
  try {
    gatewayResult = await initializeTransaction({
      amountKobo,
      email: req?.user?.email || "",
      reference,
      metadata: { orderId, customerId, paymentId: payment[0]._id },
      callbackUrl: `${process.env.APP_URL || "http://localhost:2020"}/api/v1/payments/verify`,
    });
  } catch (err) {
    await Payment.findByIdAndUpdate(payment[0]._id, { status: "failed" });
    throw err;
  }

  await Payment.findByIdAndUpdate(payment[0]._id, {
    gatewayReference: gatewayResult.reference || reference,
  });

  await logAuditEvent({
    actor: customerId,
    action: "payment.initiated",
    resourceType: "Payment",
    resourceId: payment[0]._id,
    details: { orderId, amount: amountKobo, gatewayReference },
    req,
  });

  return {
    payment: payment[0],
    authorizationUrl: gatewayResult.authorizationUrl,
    accessCode: gatewayResult.accessCode,
    reference: gatewayResult.reference,
  };
};

export const verifyPayment = async ({ reference, req }) => {
  const gatewayResult = await verifyTransaction(reference);

  const payment = await Payment.findOne({ gatewayReference: reference });
  if (!payment) throw new Error("Payment record not found.");

  if (payment.status === "successful") {
    return { payment, alreadyProcessed: true };
  }

  const isSuccess = gatewayResult.status === "success";

  const updated = await Payment.findByIdAndUpdate(
    payment._id,
    {
      status: isSuccess ? "successful" : "failed",
      $inc: { attempts: 1 },
      gatewayResponse: gatewayResult,
      paidAt: isSuccess ? new Date() : null,
    },
    { new: true }
  );

  await logAuditEvent({
    actor: payment.customer,
    action: `payment.${isSuccess ? "verified" : "failed"}`,
    resourceType: "Payment",
    resourceId: payment._id,
    details: { gatewayStatus: gatewayResult.status, amount: gatewayResult.amount },
    req,
  });

  if (isSuccess) {
    await Order.findByIdAndUpdate(payment.order, {
      status: "confirmed",
    });
    const order = await Order.findById(payment.order);
    await recordCommissionOnce({ payment: updated, order, req });
  }

  return { payment: updated, alreadyProcessed: false };
};

export const handleWebhook = async ({ rawBody, signature, req }) => {
  const payload = verifyWebhookSignature(rawBody, signature);
  const event = payload.event;
  const data = payload.data;
  const reference = data.reference;

  const payment = await Payment.findOne({ gatewayReference: reference });
  if (!payment) {
    return { received: true, ignored: true };
  }

  const isSuccess = event.toLowerCase().includes("charge.success");
  const isFailed = event.toLowerCase().includes("charge.failed");

  if (isSuccess && payment.status !== "successful") {
    await Payment.findByIdAndUpdate(payment._id, {
      status: "successful",
      gatewayResponse: data,
      paidAt: new Date(),
      $inc: { attempts: 1 },
    });
    await Order.findByIdAndUpdate(payment.order, { status: "confirmed" });
    const order = await Order.findById(payment.order);
    await recordCommissionOnce({ payment, order, req });

    await logAuditEvent({
      actor: payment.customer,
      action: "payment.webhook.success",
      resourceType: "Payment",
      resourceId: payment._id,
      details: { event },
      req,
    });
  } else if (isFailed && payment.status !== "failed") {
    await Payment.findByIdAndUpdate(payment._id, {
      status: "failed",
      gatewayResponse: data,
      $inc: { attempts: 1 },
    });
    await logAuditEvent({
      actor: payment.customer,
      action: "payment.webhook.failed",
      resourceType: "Payment",
      resourceId: payment._id,
      details: { event },
      req,
    });
  }

  return { received: true, processed: true, event };
};

export const refundPayment = async ({ paymentId, refundAmountKobo, reason, req, session }) => {
  const payment = await Payment.findById(paymentId).session(session);
  if (!payment) throw new Error("Payment not found.");
  if (payment.status !== "successful") {
    throw new Error("Only successful payments can be refunded.");
  }

  const reversal = await reverseCommissionOnRefund({
    payment,
    refundAmountKobo,
    req,
    session,
  });

  await logAuditEvent({
    actor: req?.user?._id,
    action: "payment.refunded",
    resourceType: "Payment",
    resourceId: payment._id,
    details: { refundAmount: refundAmountKobo, reason, ...reversal },
    req,
    session,
  });

  return reversal;
};

export const getPaymentsByCustomer = async (customerId, filters = {}) => {
  return Payment.find({ customer: customerId, ...filters })
    .populate("order")
    .sort({ createdAt: -1 });
};

export const getPaymentsByBusiness = async (businessId, filters = {}) => {
  return Payment.find({ business: businessId, ...filters }).sort({ createdAt: -1 });
};

