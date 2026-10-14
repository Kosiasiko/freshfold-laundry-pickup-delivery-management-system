import express from "express";
import {
  registerBusiness,
  getBusiness,
  updateBusiness,
  updateApprovalStatus,
} from "../controllers/business.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.post("/register", authenticate, registerBusiness);
router.get("/:id", getBusiness);
router.put("/:id", authenticate, updateBusiness);
router.patch(
  "/:id/approval",
  authenticate,
  authorizeRoles("admin"),
  updateApprovalStatus,
);

export default router;
