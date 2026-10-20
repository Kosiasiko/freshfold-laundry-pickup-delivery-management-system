import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { idempotencyKey } from "../middleware/idempotency.js";
import { assertBusinessAccess } from "../middleware/ownsBusiness.js";
import {
  calculateEarnings,
  getPayoutHistory,
  requestPayout,
  processPayout,
  reconcile,
} from "../controllers/payout.controller.js";

const router = express.Router();

// Business earnings
router.get(
  "/:businessId/earnings",
  authenticate,
  authorizeRoles("Administrator", "Laundry Staff"),
  assertBusinessAccess,
  calculateEarnings
);

// Payout history
router.get(
  "/:businessId/history",
  authenticate,
  authorizeRoles("Administrator", "Laundry Staff"),
  assertBusinessAccess,
  getPayoutHistory
);

// Request payout (business owner or staff)
router.post(
  "/:businessId/request",
  authenticate,
  authorizeRoles("Administrator", "Laundry Staff"),
  idempotencyKey,
  requestPayout
);

// Process payout (admin)
router.post(
  "/:payoutId/process",
  authenticate,
  authorizeRoles("Administrator"),
  processPayout
);

// Reconciliation report (admin)
router.get(
  "/:businessId/reconcile",
  authenticate,
  authorizeRoles("Administrator"),
  reconcile
);

export default router;
