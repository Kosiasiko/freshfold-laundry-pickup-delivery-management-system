import { Router } from "express";

import {
  createOrder,
  getMyOrders,
  getOrderById,
  getBusinessOrders,
  updateOrderStatus,
  requestOrderCancellation,
} from "../controllers/order.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

import {
  createOrderValidation,
  orderIdValidation,
  updateOrderStatusValidation,
  cancelOrderValidation,
} from "../validations/order.validation.js";

const router = Router();

// Customer creates an order.
router.post(
  "/",
  authenticate,
  authorizeRoles("Customer"),
  createOrderValidation,
  validate,
  createOrder,
);

// Customer views their own orders.
router.get("/my-orders", authenticate, authorizeRoles("Customer"), getMyOrders);

// Laundry Staff views orders for their business.
router.get(
  "/business-orders",
  authenticate,
  authorizeRoles("Laundry Staff"),
  getBusinessOrders,
);

// Customer or Laundry Staff views one permitted order.
router.get(
  "/:orderId",
  authenticate,
  authorizeRoles("Customer", "Laundry Staff"),
  orderIdValidation,
  validate,
  getOrderById,
);

// Laundry Staff updates order progress.
router.patch(
  "/:orderId/status",
  authenticate,
  authorizeRoles("Laundry Staff"),
  updateOrderStatusValidation,
  validate,
  updateOrderStatus,
);

// Customer requests cancellation.
router.patch(
  "/:orderId/cancellation-request",
  authenticate,
  authorizeRoles("Customer"),
  cancelOrderValidation,
  validate,
  requestOrderCancellation,
);

export default router;
