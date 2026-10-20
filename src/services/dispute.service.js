import Dispute from "../models/dispute.model.js";
import Payment from "../models/payment.model.js";
import Order from "../models/order.model.js";
import { reverseCommissionOnRefund } from "./commission.service.js";
import { logAuditEvent } from "../utils/auditLogger.js";

export const createDispute = async ({ customerId, orderId, businessId, type, description, evidence, req }) => {
  const order = orderId ? await Order.findById(orderId) : null;
  if (order) {
    if (order.business.toString() !== businessId.toString()) {
      throw new Error("Order does not belong to the specified business.");
    }
    if (order.customer.toString() !== customerId.toString()) {
      throw new Error("Not authorized to dispute this order.");
    }
  }

  const dispute = await Dispute.create({
    customer: customerId,
    order: orderId || null,
    business: businessId,
    type,
    description,
    evidence: evidence || [],
    status: "Open",
  });

  await logAuditEvent({
    actor: customerId,
    action: "dispute.created",
    resourceType: "Dispute",
    resourceId: dispute._id,
    details: { type, order: orderId, business: businessId },
    req,
  });

  return dispute;
};

export const getDisputes = async (filters = {}, user, isAdmin = false) => {
  const query = { ...filters };
  if (!isAdmin) {
    // Customers see their own; business owners/staff see their business
    if (user.role === "Customer") query.customer = user._id;
    else if (user.role === "Laundry Staff") {
      if (user.businessId) query.business = user.businessId;
      else throw new Error("No business assigned to your account.");
    } else if (user.role === "Rider") {
      throw new Error("Riders are not authorized to view disputes.");
    } else {
      throw new Error(`Unknown role: ${user.role}.`);
    }
  }
  return Dispute.find(query)
    .populate("customer order business assignedTo resolvedBy")
    .sort({ createdAt: -1 });
};

export const getDisputeById = async (disputeId, user, isAdmin = false) => {
  const dispute = await Dispute.findById(disputeId)
    .populate("customer order business assignedTo resolvedBy");
  if (!dispute) throw new Error("Dispute not found.");

  const isOwner = dispute.customer && dispute.customer._id.toString() === user._id.toString();
  const isBusinessMember =
    user.businessId &&
    dispute.business &&
    dispute.business._id.toString() === user.businessId.toString();

  if (!isAdmin && !isOwner && !isBusinessMember) {
    throw new Error("Not authorized to view this dispute.");
  }

  return dispute;
};

export const resolveDispute = async ({ disputeId, resolution, status, assignedTo, refundApproved, refundAmountKobo, req, session }) => {
  const dispute = await Dispute.findById(disputeId).session(session);
  if (!dispute) throw new Error("Dispute not found.");

  const previousStatus = dispute.status;
  dispute.status = status || "Resolved";
  dispute.resolution = resolution || dispute.resolution;
  dispute.resolvedBy = req?.user?._id || null;
  dispute.resolvedAt = new Date();
  if (assignedTo) dispute.assignedTo = assignedTo;

  if (refundApproved && dispute.payment) {
    const payment = await Payment.findById(dispute.payment).session(session);
    if (payment) {
      const reversal = await reverseCommissionOnRefund({
        payment,
        refundAmountKobo: refundAmountKobo || 0,
        req,
        session,
      });
      dispute.refundAmount = refundAmountKobo || 0;
      dispute.commissionReversed = reversal.commissionReversed;
    }
  } else if (refundApproved) {
    throw new Error("Refund approval requires a linked payment.");
  }

  dispute.history.push({
    status: dispute.status,
    changedBy: req?.user?._id,
    note: resolution || `Status changed from ${previousStatus} to ${dispute.status}`,
  });

  await dispute.save({ session });

  await logAuditEvent({
    actor: req?.user?._id,
    action: "dispute.resolved",
    resourceType: "Dispute",
    resourceId: dispute._id,
    details: {
      previousStatus,
      newStatus: dispute.status,
      refundApproved,
      refundAmount: refundAmountKobo || 0,
    },
    req,
    session,
  });

  return dispute;
};

export const assignReviewer = async (disputeId, reviewerId, req) => {
  const dispute = await Dispute.findByIdAndUpdate(
    disputeId,
    { assignedTo: reviewerId },
    { new: true }
  );
  if (!dispute) throw new Error("Dispute not found.");

  await logAuditEvent({
    actor: req?.user?._id,
    action: "dispute.assigned",
    resourceType: "Dispute",
    resourceId: dispute._id,
    details: { assignedTo: reviewerId },
    req,
  });

  return dispute;
};
