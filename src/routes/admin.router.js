import { rateLimit } from "express-rate-limit";
import { Router } from "express";
import {
  adminLogin,
  getAdminSummary,
  getFinancialReport,
  listAuditLogs,
  listBusinesses,
  updateBusinessStatus,
} from "../controllers/admin.controller.js";
import { requireAdmin } from "../middleware/admin-auth.middleware.js";

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Try again later.",
  },
});

router.post("/auth/login", loginLimiter, adminLogin);
router.use(requireAdmin);
router.get("/summary", getAdminSummary);
router.get("/businesses", listBusinesses);
router.patch("/businesses/:businessId/status", updateBusinessStatus);
router.get("/reports/financial", getFinancialReport);
router.get("/audit-logs", listAuditLogs);

export default router;
