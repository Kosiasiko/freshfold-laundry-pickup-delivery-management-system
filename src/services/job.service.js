import FailedJob from "../models/failed-job.model.js";
import Order from "../models/order.model.js";
import { sendReminder } from "../services/notification.service.js";
import { logAuditEvent } from "../utils/auditLogger.js";

/**
 * In-memory job registry + simple scheduler.
 * In production, replace with Agenda/Bull + Redis for distributed durability.
 */
const jobs = new Map(); // jobName -> { fn, intervalMs, lastRun, running }

/**
 * Register a scheduled job.
 */
export const registerJob = ({ name, fn, intervalMs }) => {
  jobs.set(name, { fn, intervalMs, lastRun: null, running: false });
};

/**
 * Start all registered jobs (setInterval loop).
 */
export const startJobs = async () => {
  // Durable retry: process failed jobs whose nextRetryAt has arrived
  const now = new Date();
  const due = await FailedJob.find({
    resolved: false,
    nextRetryAt: { $lte: now },
  });
  for (const failed of due) {
    if (failed.attempts >= failed.maxAttempts) continue;
    try {
      const job = jobs.get(failed.jobName);
      if (job && job.fn) {
        await job.fn();
        failed.resolved = true;
        failed.resolvedAt = new Date();
        await failed.save();
        await logAuditEvent({
          action: "job.retry.success",
          resourceType: "FailedJob",
          resourceId: failed._id,
          details: { jobName: failed.jobName },
        });
        console.error(`Job ${failed.jobName} retried successfully`);
      }
    } catch (err) {
      failed.attempts += 1;
      failed.nextRetryAt = new Date(Date.now() + 5 * 60 * 1000);
      await failed.save();
      console.error(`Job ${failed.jobName} retry failed:`, err.message);
    }
  }

  for (const [name, job] of jobs.entries()) {
    setInterval(async () => {
      if (job.running) return; // prevent duplicate concurrent runs
      job.running = true;
      job.lastRun = new Date();
      try {
        await job.fn();
      } catch (err) {
        await recordFailedJob({ jobName: name, error: err.message, stack: err.stack });
        console.error(`Job ${name} failed:`, err.message);
      } finally {
        job.running = false;
      }
    }, job.intervalMs);
  }
};

/**
 * Register built-in scheduled jobs:
 *  - pickupDeliveryReminder: reminds customers of upcoming pickup/delivery
 *  - expireUnpaidBookings: cancels pending orders past TTL
 */
export const registerReminderJobs = ({ expireUnpaidTtlMs = 60 * 60 * 1000 }) => {
  // Pickup/delivery reminder: every 15 minutes, find orders confirmed within
  // the next 24 hours that haven't been reminded yet.
  registerJob({
    name: "pickupDeliveryReminder",
    intervalMs: 15 * 60 * 1000,
    fn: async () => {
      const now = new Date();
      const windowStart = new Date(now.getTime());
      const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const orders = await Order.find({
        status: "confirmed",
        createdAt: { $gte: windowStart, $lte: windowEnd },
        $or: [{ remindedAt: null }, { remindedAt: { $lt: windowStart } }],
      }).populate("customer");

      for (const order of orders) {
        const customer = order.customer;
        if (!customer || !customer.email) continue;
        await sendReminder({
          to: customer.email,
          type: "pickup_delivery_reminder",
          orderId: order._id,
          scheduledAt: order.createdAt,
        });
        // Mark reminded to prevent duplicate notifications on the next tick
        await Order.findByIdAndUpdate(order._id, { remindedAt: new Date() });
      }
    },
  });

  // Expiration of unpaid bookings
  registerJob({
    name: "expireUnpaidBookings",
    intervalMs: 30 * 60 * 1000, // every 30 minutes
    fn: async () => {
      await expireUnpaidBookings({ ttlMs: expireUnpaidTtlMs });
    },
  });
};

/**
 * Record a failed job for investigation and retry.
 */
export const recordFailedJob = async ({ jobName, payload, error, stack, maxAttempts = 5 }) => {
  const failed = await FailedJob.create({
    jobName,
    payload: payload || {},
    error,
    stack,
    attempts: 1,
    maxAttempts,
    nextRetryAt: new Date(Date.now() + 5 * 60 * 1000), // retry in 5 min
  });
  return failed;
};

/**
 * Retry a failed job by id.
 */
export const retryFailedJob = async (failedJobId, fn, req) => {
  const failed = await FailedJob.findById(failedJobId);
  if (!failed) throw new Error("Failed job not found.");
  if (failed.resolved) throw new Error("Job already resolved.");

  if (failed.attempts >= failed.maxAttempts) {
    throw new Error("Max retry attempts reached.");
  }

  try {
    await fn();
    failed.resolved = true;
    failed.resolvedAt = new Date();
    await failed.save();
    await logAuditEvent({
      actor: req?.user?._id,
      action: "job.retry.success",
      resourceType: "FailedJob",
      resourceId: failed._id,
      details: { jobName: failed.jobName },
      req,
    });
  } catch (err) {
    failed.attempts += 1;
    failed.nextRetryAt = new Date(Date.now() + 5 * 60 * 1000);
    await failed.save();
    throw err;
  }
};

/**
 * Expire unpaid bookings: cancel pending orders older than ttlMs.
 */
export const expireUnpaidBookings = async ({ ttlMs = 60 * 60 * 1000, req }) => {
  const cutoff = new Date(Date.now() - ttlMs);
  const result = await Order.updateMany(
    {
      status: "pending",
      createdAt: { $lt: cutoff },
      $or: [{ paymentStatus: { $ne: "successful" } }, { paymentStatus: null }],
    },
    { status: "cancelled" }
  );

  await logAuditEvent({
    actor: req?.user?._id,
    action: "job.expire_unpaid_bookings",
    resourceType: "Order",
    details: { cancelledCount: result.modifiedCount, cutoff },
    req,
  });

  return result;
};

/**
 * List failed jobs for admin investigation.
 */
export const listFailedJobs = async (filters = {}) => {
  return FailedJob.find({ ...filters, resolved: false })
    .sort({ nextRetryAt: 1, createdAt: -1 });
};

export { jobs };
