import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
  createService,
  getMyServices,
  getServiceById,
  updateService,
  deleteService,
} from "../controllers/service.controller.js";

const router = express.Router();

// All routes below require an authenticated Laundry Staff member
router.use(authenticate, authorizeRoles("Laundry Staff"));

// Create a service
router.post("/", createService);

// Get all services belonging to the staff member's business
router.get("/my-services", getMyServices);

// Get one service
router.get("/:serviceId", getServiceById);

// Update a service
router.patch("/:serviceId", updateService);

// Deactivate a service
router.delete("/:serviceId", deleteService);

export default router;