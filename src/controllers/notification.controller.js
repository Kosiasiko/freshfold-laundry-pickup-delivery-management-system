
import mongoose from "mongoose";
import {
  getUserNotifications,
  markNotificationAsRead,
} from "../services/notification.service.js";

export const getNotifications = async (req, res, next) => {
  try {
    const result = await getUserNotifications(req.user.id, {
      page: req.query.page,
      limit: req.query.limit,
      unreadOnly: req.query.unreadOnly === "true",
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;

    if (!mongoose.isValidObjectId(notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await markNotificationAsRead(
      notificationId,
      req.user.id
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      notification,
    });
  } catch (error) {
    next(error);
  }
};