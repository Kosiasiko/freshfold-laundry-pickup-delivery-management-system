import Order from "../models/order.model.js";
import OrderItem from "../models/order-item.model.js";
import { sendOrderReadyNotification } from "../services/notification.service.js";
import AppError from "../utils/AppError.js";

// Valid processing status transitions
const TRANSITIONS = {
  received: ["inspection"],
  inspection: ["washing"],
  washing: ["drying"],
  drying: ["ironing"],
  ironing: ["quality_check"],
  quality_check: ["ready_for_delivery"],
  ready_for_delivery: [],
};

/**
 * Ensure staff can only manage orders belonging to their assigned business.
 * Administrators bypass this check.
 */
const assertBusinessAccess = (order, user) => {
  if (user.role === "Administrator") return;
  if (user.role === "Laundry Staff" || user.role === "Rider") {
    if (!user.businessId) {
      throw new AppError("No business assigned to your account.", 403);
    }
    if (order.business.toString() !== user.businessId.toString()) {
      throw new AppError(
        "You can only manage orders belonging to your assigned business.",
        403
      );
    }
  }
};

export const getOrdersAwaitingProcessing = async (req, res) => {
  const { businessId } = req.params;
  const filter = {
    processingStatus: {
      $in: [
        "received",
        "inspection",
        "washing",
        "drying",
        "ironing",
        "quality_check",
      ],
    },
  };
  if (req.user.role !== "Administrator") {
    filter.business = req.user.businessId;
  } else if (businessId) {
    filter.business = businessId;
  }
  const orders = await Order.find(filter).populate("customer rider");
  res.json({ success: true, data: orders });
};

export const confirmReceived = async (req, res) => {
  const { orderId } = req.params;
  const order = await Order.findById(orderId);
  if (!order) throw new AppError("Order not found.", 404);
  assertBusinessAccess(order, req.user);
  if (order.processingStatus && order.processingStatus !== "received") {
    throw new AppError("Order already past received stage.", 400);
  }
  order.processingStatus = "received";
  await order.save();
  res.json({ success: true, data: order });
};

export const recordInspection = async (req, res) => {
  const { orderId } = req.params;
  const { notes, stains, damage, specialHandling } = req.body;
  const order = await Order.findById(orderId);
  if (!order) throw new AppError("Order not found.", 404);
  assertBusinessAccess(order, req.user);
  if (order.processingStatus !== "received") {
    throw new AppError(
      "Order must be in received stage before inspection.",
      400
    );
  }
  order.processingStatus = "inspection";
  await order.save();
  res.json({
    success: true,
    data: order,
    inspection: { notes, stains, damage, specialHandling },
  });
};

export const updateProcessingStatus = async (req, res) => {
  const { orderId } = req.params;
  const { processingStatus } = req.body;
  const order = await Order.findById(orderId).populate("business");
  if (!order) throw new AppError("Order not found.", 404);
  assertBusinessAccess(order, req.user);

  const current = order.processingStatus;
  const allowed = TRANSITIONS[current] || [];
  if (!allowed.includes(processingStatus)) {
    throw new AppError(
      `Invalid transition from ${current} to ${processingStatus}.`,
      400
    );
  }

  order.processingStatus = processingStatus;
  if (processingStatus === "ready_for_delivery") {
    order.status = "ready_for_delivery";
  }
  await order.save();

  await sendOrderReadyNotification({
    customerEmail: req.body.customerEmail,
    orderId,
    businessName: order.business ? order.business.name : "Laundry Business",
  });

  res.json({ success: true, data: order });
};
