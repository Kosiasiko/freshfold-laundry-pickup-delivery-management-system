import mongoose from "mongoose";
import Order from "../models/order.model.js";
import Service from "../models/service.model.js";
import Business from "../models/business.model.js";
import {
  calculatePickupFee,
  calculateDeliveryFee,
} from "../services/deliveryPricing.service.js";

// Find the business registered by a Laundry Staff member.
const getStaffBusiness = async (userId) => {
  return Business.findOne({ registeredBy: userId });
};

// 1. Customer creates an order.
export const createOrder = async (req, res, next) => {
  try {
    const {
      business: businessId,
      items,
      pickupDistanceKm,
      pickupDetails,
      deliveryDetails,
    } = req.body;

    // Read delivery distance from inside deliveryDetails.
    const deliveryDistanceKm = deliveryDetails?.deliveryDistanceKm;

    // Use the authenticated customer's database ID.
    const customerId = req.user?._id ?? req.user?.id;

    if (!customerId || !mongoose.isValidObjectId(customerId)) {
      return res.status(401).json({
        success: false,
        message: "Authenticated customer information is required.",
      });
    }

    // 1. Validate the business ID.
    if (!mongoose.isValidObjectId(businessId)) {
      return res.status(400).json({
        success: false,
        message: "A valid laundry business ID is required.",
      });
    }

    // 2. Convert and validate the distances.
    const pickupDistance = Number(pickupDistanceKm);
    const deliveryDistance = Number(deliveryDistanceKm);

    if (
      pickupDistanceKm === undefined ||
      pickupDistanceKm === null ||
      pickupDistanceKm === "" ||
      !Number.isFinite(pickupDistance) ||
      pickupDistance < 0.1 ||
      pickupDistance > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "Pickup distance must be between 0.1 and 1000 kilometres.",
      });
    }

    if (
      deliveryDistanceKm === undefined ||
      deliveryDistanceKm === null ||
      deliveryDistanceKm === "" ||
      !Number.isFinite(deliveryDistance) ||
      deliveryDistance < 0.1 ||
      deliveryDistance > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "Delivery distance must be between 0.1 and 1000 kilometres.",
      });
    }

    // 3. Validate required address details.
    if (
      typeof pickupDetails?.address !== "string" ||
      !pickupDetails.address.trim() ||
      typeof deliveryDetails?.address !== "string" ||
      !deliveryDetails.address.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Pickup and delivery addresses are required.",
      });
    }

    // 4. Confirm the business is approved and active.
    const business = await Business.findOne({
      _id: businessId,
      approvalStatus: "Approved",
      isActive: true,
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Approved and active laundry business not found.",
      });
    }

    // 5. Validate the requested services.
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one laundry service.",
      });
    }

    const serviceIds = items.map((item) => item?.service);

    if (
      serviceIds.some((id) => !mongoose.isValidObjectId(id)) ||
      new Set(serviceIds.map(String)).size !== serviceIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Each selected service must have a valid, unique service ID.",
      });
    }

    const services = await Service.find({
      _id: { $in: serviceIds },
      business: business._id,
      isActive: true,
      isAvailable: true,
    });

    if (services.length !== items.length) {
      return res.status(400).json({
        success: false,
        message:
          "One or more services are unavailable or do not belong to this business.",
      });
    }

    // 6. Calculate item totals using prices stored in the database.
    // Never accept customer-supplied prices.
    const serviceMap = new Map(
      services.map((service) => [String(service._id), service]),
    );

    const orderItems = [];

    for (const item of items) {
      const service = serviceMap.get(String(item.service));
      const quantity = item.quantity === undefined ? 1 : Number(item.quantity);

      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000) {
        return res.status(400).json({
          success: false,
          message: "Each service quantity must be a positive integer.",
        });
      }

      const unitPrice = Number(service.price);

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return res.status(500).json({
          success: false,
          message: "A selected service has an invalid database price.",
        });
      }

      const lineTotal = Math.round(unitPrice * quantity * 100) / 100;

      orderItems.push({
        service: service._id,
        serviceName: service.name,
        category: service.category,
        unitPrice,
        quantity,
        lineTotal,
      });
    }

    const subtotal =
      Math.round(
        orderItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100,
      ) / 100;

    // 7. Calculate pickup and delivery fees on the server.
    const pickupFee = calculatePickupFee(pickupDistance);
    const deliveryFee = calculateDeliveryFee(deliveryDistance);

    const totalAmount =
      Math.round((subtotal + pickupFee + deliveryFee) * 100) / 100;

    // 8. Create the order.
    // Customer-supplied prices, fees, status and totals are ignored.
    const order = await Order.create({
      customer: customerId,
      business: business._id,
      items: orderItems,

      pickupDistanceKm: pickupDistance,

      pickupDetails: {
        address: pickupDetails.address.trim(),
        scheduledAt: pickupDetails.scheduledAt,
        instructions: pickupDetails.instructions ?? "",
      },

      deliveryDetails: {
        address: deliveryDetails.address.trim(),
        deliveryDistanceKm: deliveryDistance,
        instructions: deliveryDetails.instructions ?? "",
      },

      subtotal,
      pickupFee,
      deliveryFee,
      totalAmount,

      status: "Pending Confirmation",

      statusHistory: [
        {
          status: "Pending Confirmation",
          changedBy: customerId,
          note: "Order created by customer.",
          changedAt: new Date(),
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Laundry order created successfully.",
      data: { order },
    });
  } catch (error) {
    return next(error);
  }
};

// 2. Customer views their own orders.
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({
      customer: req.user._id,
    })
      .populate("business", "name address phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    return next(error);
  }
};

// 3. Customer or Laundry Staff views one permitted order.
export const getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    const order = await Order.findById(orderId)
      .populate("business", "name address phone")
      .populate("customer", "name email phone");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (req.user.role === "Customer") {
      if (String(order.customer._id) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own orders.",
        });
      }
    } else if (req.user.role === "Laundry Staff") {
      const business = await getStaffBusiness(req.user._id);

      if (!business || String(order.business._id) !== String(business._id)) {
        return res.status(403).json({
          success: false,
          message: "You cannot access orders belonging to another business.",
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "You are not permitted to view this order.",
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    return next(error);
  }
};

// 4. Laundry Staff views orders for their business.
export const getBusinessOrders = async (req, res, next) => {
  try {
    const business = await getStaffBusiness(req.user._id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "No laundry business found for this account.",
      });
    }

    const orders = await Order.find({
      business: business._id,
    })
      .populate("customer", "name email phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    return next(error);
  }
};

// 5. Laundry Staff updates order progress.
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, note = "" } = req.body;

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    const business = await getStaffBusiness(req.user._id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "No laundry business found for this account.",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      business: business._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found for your business.",
      });
    }

    const nextStatus = {
      "Pending Confirmation": "Confirmed",
      Confirmed: "Picked Up",
      "Picked Up": "Processing",
      Processing: "Ready for Delivery",
      "Ready for Delivery": "Out for Delivery",
      "Out for Delivery": "Completed",
    };

    if (nextStatus[order.status] !== status) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from "${order.status}" to "${status}".`,
      });
    }

    order.status = status;
    order.statusHistory.push({
      status,
      changedBy: req.user._id,
      note,
      changedAt: new Date(),
    });

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully.",
      data: order,
    });
  } catch (error) {
    return next(error);
  }
};

// 6. Customer requests cancellation; the order is not cancelled immediately.
export const requestOrderCancellation = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { reason = "" } = req.body;

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      customer: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found in your account.",
      });
    }

    if (!["Pending Confirmation", "Confirmed"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message:
          "Cancellation can only be requested before the order is picked up.",
      });
    }

    if (order.cancellationRequestedAt) {
      return res.status(400).json({
        success: false,
        message: "A cancellation request has already been submitted.",
      });
    }

    order.cancellationRequestedAt = new Date();
    order.cancellationRequestedBy = req.user._id;
    order.cancellationReason = reason || null;

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Cancellation request submitted for review.",
      data: order,
    });
  } catch (error) {
    return next(error);
  }
};
