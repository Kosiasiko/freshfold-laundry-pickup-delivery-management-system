
import { createNotification } from "./notification.service.js";

const notifyCustomer = async ({
  userId,
  email,
  phone,
  bookingReference,
  eventId,
  type,
  title,
  message,
}) => {
  if (!eventId) {
    throw new Error("A stable eventId is required for deduplication.");
  }

  return createNotification({
    userId,
    email,
    phone,
    bookingReference,
    type,
    title,
    message,
    deduplicationKey: `${type}:${eventId}`,
    sendEmailNotification: true,
    sendSmsNotification: true,
  });
};

export const notifyBookingConfirmed = (data) =>
  notifyCustomer({
    ...data,
    type: "booking_confirmed",
    title: "Booking confirmed",
    message: "Your laundry booking has been confirmed.",
  });

export const notifyPaymentSuccessful = (data) =>
  notifyCustomer({
    ...data,
    type: "payment_successful",
    title: "Payment successful",
    message: "Your laundry payment was successful.",
  });

export const notifyPaymentFailed = (data) =>
  notifyCustomer({
    ...data,
    type: "payment_failed",
    title: "Payment unsuccessful",
    message: "Your laundry payment could not be completed.",
  });

export const notifyPickupCompleted = (data) =>
  notifyCustomer({
    ...data,
    type: "pickup_completed",
    title: "Laundry picked up",
    message: "Your laundry has been picked up.",
  });

export const notifyLaundryProcessing = (data) =>
  notifyCustomer({
    ...data,
    type: "laundry_processing",
    title: "Laundry processing",
    message: "Your laundry is now being processed.",
  });

export const notifyLaundryReady = (data) =>
  notifyCustomer({
    ...data,
    type: "laundry_ready",
    title: "Laundry ready",
    message: "Your laundry is ready for delivery.",
  });

export const notifyDeliveryCompleted = (data) =>
  notifyCustomer({
    ...data,
    type: "delivery_completed",
    title: "Laundry delivered",
    message: "Your laundry has been delivered successfully.",
  });
