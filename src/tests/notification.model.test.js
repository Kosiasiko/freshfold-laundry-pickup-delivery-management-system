
import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Notification from "../models/notification.model.js";

const validNotification = () => ({
  user: new mongoose.Types.ObjectId(),
  type: "laundry_ready",
  title: "Laundry ready",
  message: "Your laundry is ready for delivery.",
});

test("accepts a valid notification", () => {
  const notification = new Notification(validNotification());

  assert.equal(notification.validateSync(), undefined);
});

test("rejects an invalid notification type", () => {
  const notification = new Notification({
    ...validNotification(),
    type: "laundry_redy",
  });

  const error = notification.validateSync();

  assert.ok(error);
  assert.ok(error.errors.type);
});

test("defaults new notifications to unread", () => {
  const notification = new Notification(validNotification());

  assert.equal(notification.isRead, false);
});

test("requires a user and message", () => {
  const notification = new Notification({
    type: "booking_confirmed",
    title: "Booking confirmed",
  });

  const error = notification.validateSync();

  assert.ok(error);
  assert.ok(error.errors.user);
  assert.ok(error.errors.message);
});
