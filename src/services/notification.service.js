import Notification from "../models/notification.model.js";
import {
  sendEmail,
  sendSms,
} from "./notification-delivery.service.js";

export const createNotification = async ({
  userId,
  orderId = null,
  type,
  title,
  message,
  deduplicationKey,
}) => {
  const notificationData = {
    user: userId,
    order: orderId,
    type,
    title,
    message,
  };

  if (deduplicationKey) {
    notificationData.deduplicationKey = deduplicationKey;
  }

  try {
    return await Notification.create(notificationData);
  } catch (error) {
    if (error.code === 11000 && deduplicationKey) {
      return Notification.findOne({ deduplicationKey });
    }
    throw error;
  }
};

export const getUserNotifications = async (
  userId,
  { page = 1, limit = 20, unreadOnly = false } = {}
) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));

  const filter = { user: userId };

  if (unreadOnly) {
    filter.isRead = false;
  }

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),

    Notification.countDocuments(filter),
  ]);

  return {
    notifications,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit),
    },
  };
};

export const markNotificationAsRead = async (
  notificationId,
  userId
) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    },
    { new: true, runValidators: true }
  );
};


export const retryFailedDelivery = async ({
  notificationId,
  userId,
  email = null,
  phone = null,
}) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    user: userId,
  });

  if (!notification) {
    return null;
  }

  const updates = {};

  if (notification.channels.email.status === "failed" && email) {
    try {
      await sendEmail({
        to: email,
        title: notification.title,
        message: notification.message,
      });

      updates["channels.email.status"] = "sent";
      updates["channels.email.sentAt"] = new Date();
      updates["channels.email.error"] = null;
    } catch (error) {
      updates["channels.email.error"] = error.message;
    }
  }

  if (notification.channels.sms.status === "failed" && phone) {
    try {
      await sendSms({
        to: phone,
        message: notification.message,
      });

      updates["channels.sms.status"] = "sent";
      updates["channels.sms.sentAt"] = new Date();
      updates["channels.sms.error"] = null;
    } catch (error) {
      updates["channels.sms.error"] = error.message;
    }
  }

  if (Object.keys(updates).length > 0) {
    await Notification.updateOne(
      { _id: notification._id, user: userId },
      { $set: updates }
    );
  }

  return Notification.findById(notification._id);
};