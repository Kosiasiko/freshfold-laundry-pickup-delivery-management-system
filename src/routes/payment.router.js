import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { idempotencyKey } from "../middleware/idempotency.js";
import { assertBusinessAccess } from "../middleware/ownsBusiness.js";
import {
  initiate,
  verify,
  webhook,
  refund,
  getMyPayments,
  getBusinessPayments,
} from "../controllers/payment.controller.js";

const router = express.Router();

// Public webhook (gateway posts here; signature verified inside)
router.post("/webhook", webhook);

// Customer payment initiation (idempotent)
router.post(
  "/initiate",
  authenticate,
  authorizeRoles("Customer"),
  idempotencyKey,
  initiate
);

// Server-side verification
router.get("/verify", authenticate, verify);

// Refund (admin only)
router.post(
  "/:paymentId/refund",
  authenticate,
  authorizeRoles("Administrator"),
  refund
);

// Customer's own payments
router.get("/me", authenticate, authorizeRoles("Customer"), getMyPayments);

// Business payments (owner or admin)
router.get(
  "/business/:businessId",
  authenticate,
  authorizeRoles("Administrator", "Laundry Staff"),
  assertBusinessAccess,
  getBusinessPayments
);

export default router;
