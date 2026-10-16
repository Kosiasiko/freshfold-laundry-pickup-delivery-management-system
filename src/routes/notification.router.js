import express from "express";
import {
  getNotifications,
  markAsRead,
} from "../controllers/notification.controller.js";

export const createNotificationRouter = (protect) => {
const router = express.Router();

router.use(protect);

router.get("/", protect, getNotifications);
router.patch("/:notificationId/read", markAsRead);

return router;
};