import mongoose from "mongoose";
import AdminAuditLog from "../models/admin-audit-log.model.js";
import Business from "../models/business.model.js";
import FinancialTransaction from "../models/financial-transaction.model.js";
import Order from "../models/order.model.js";
import Payout from "../models/payout.model.js";
import User from "../models/user.model.js";
import {
  buildFinancialReportPipeline,
  buildPayoutPipeline,
  buildPendingPayoutPipeline,
  getReportDateRange,
} from "../utils/admin-reporting.js";
import { createAdminToken } from "../middleware/admin-auth.middleware.js";

const VALID_BUSINESS_STATUSES = new Set(["pending", "approved", "suspended"]);

function parsePagination(query) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 25);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    const error = new Error("page must be positive and limit must be between 1 and 100.");
    error.statusCode = 400;
    throw error;
  }
  return { page, limit, skip: (page - 1) * limit };
}

function validateDateRange(query) {
  try {
    return getReportDateRange(query);
  } catch (error) {
    error.statusCode = 400;
    throw error;
  }
}

function mapByCurrency(rows, key) {
  return new Map(rows.map((row) => [row.currency, row[key] ?? 0]));
}

export async function adminLogin(req, res) {
  const { email, password } = req.body ?? {};
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid email and password are required.",
    });
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
  if (!user || !user.isActive || user.role !== "admin" || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: "Invalid credentials." });
  }

  await AdminAuditLog.create({
    actor: user._id,
    action: "admin.auth.login",
    targetType: "User",
    targetId: user._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent")?.slice(0, 500),
  });

  return res.status(200).json({
    success: true,
    data: {
      accessToken: createAdminToken(user._id),
      tokenType: "Bearer",
      expiresIn: 900,
      administrator: { id: user.id, name: user.name, email: user.email },
    },
  });
}

export async function getAdminSummary(req, res) {
  const [
    businessTotal,
    businessStatuses,
    customerCount,
    riderCount,
    orderTotal,
    orderStatuses,
  ] = await Promise.all([
    Business.countDocuments(),
    Business.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    User.countDocuments({ role: "customer" }),
    User.countDocuments({ role: "rider" }),
    Order.countDocuments(),
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  return res.json({
    success: true,
    data: {
      businesses: {
        total: businessTotal,
        byStatus: Object.fromEntries(businessStatuses.map(({ _id, count }) => [_id, count])),
      },
      customers: { total: customerCount },
      riders: { total: riderCount },
      orders: {
        total: orderTotal,
        byStatus: Object.fromEntries(orderStatuses.map(({ _id, count }) => [_id, count])),
      },
    },
  });
}

export async function listBusinesses(req, res) {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.status !== undefined) {
    if (!VALID_BUSINESS_STATUSES.has(req.query.status)) {
      return res.status(400).json({
        success: false,
        message: "status must be pending, approved, or suspended.",
      });
    }
    filter.status = req.query.status;
  }

  const [businesses, total] = await Promise.all([
    Business.find(filter)
      .select("name owner status createdAt updatedAt")
      .populate("owner", "name email")
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Business.countDocuments(filter),
  ]);
  return res.json({
    success: true,
    data: businesses,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function updateBusinessStatus(req, res) {
  const { status, reason } = req.body ?? {};
  if (!VALID_BUSINESS_STATUSES.has(status)) {
    return res.status(400).json({
      success: false,
      message: "status must be pending, approved, or suspended.",
    });
  }
  if (status === "suspended" && (typeof reason !== "string" || !reason.trim())) {
    return res.status(400).json({
      success: false,
      message: "A reason is required when suspending a business.",
    });
  }
  if (reason !== undefined && (typeof reason !== "string" || reason.length > 1000)) {
    return res.status(400).json({
      success: false,
      message: "reason must be a string of at most 1000 characters.",
    });
  }
  if (!mongoose.isValidObjectId(req.params.businessId)) {
    return res.status(400).json({ success: false, message: "Invalid business ID." });
  }

  const session = await mongoose.startSession();
  let responseBusiness;
  try {
    await session.withTransaction(async () => {
      const business = await Business.findById(req.params.businessId).session(session);
      if (!business) {
        const error = new Error("Business not found.");
        error.statusCode = 404;
        throw error;
      }
      if (business.status === status) {
        responseBusiness = business;
        return;
      }

      const previousStatus = business.status;
      business.status = status;
      await business.save({ session });
      await AdminAuditLog.create(
        [
          {
            actor: req.admin._id,
            action: "business.status.changed",
            targetType: "Business",
            targetId: business._id,
            details: {
              businessName: business.name,
              previousStatus,
              status,
              reason: reason?.trim() || null,
            },
            ipAddress: req.ip,
            userAgent: req.get("user-agent")?.slice(0, 500),
          },
        ],
        { session },
      );
      responseBusiness = business;
    });
  } finally {
    await session.endSession();
  }

  return res.json({
    success: true,
    data: {
      id: responseBusiness.id,
      name: responseBusiness.name,
      status: responseBusiness.status,
    },
  });
}

export async function getFinancialReport(req, res) {
  const { start, endExclusive } = validateDateRange(req.query);
  const transactionPipeline = buildFinancialReportPipeline(start, endExclusive);
  const payoutPipeline = buildPayoutPipeline(start, endExclusive);
  const pendingPipeline = buildPendingPayoutPipeline(start, endExclusive);
  const orderDateMatch = {
    status: { $in: ["completed", "delivered"] },
    completedAt: { $ne: null },
  };
  if (start || endExclusive) {
    if (start) orderDateMatch.completedAt.$gte = start;
    if (endExclusive) orderDateMatch.completedAt.$lt = endExclusive;
  }

  const [transactions, payouts, pendingPayouts, completedOrders] = await Promise.all([
    FinancialTransaction.aggregate(transactionPipeline),
    Payout.aggregate(payoutPipeline),
    Payout.aggregate(pendingPipeline),
    Order.countDocuments(orderDateMatch),
  ]);

  const transactionByCurrency = new Map(transactions.map((row) => [row.currency, row]));
  const paidByCurrency = mapByCurrency(payouts, "paidOut");
  const pendingByCurrency = mapByCurrency(pendingPayouts, "pendingPayouts");
  const currencies = new Set([
    ...transactionByCurrency.keys(),
    ...paidByCurrency.keys(),
    ...pendingByCurrency.keys(),
  ]);

  const financials = [...currencies].sort().map((currency) => {
    const transaction = transactionByCurrency.get(currency) ?? {
      grossSales: 0,
      refunds: 0,
      commissionsCollected: 0,
      commissionReversed: 0,
      commissionRevenue: 0,
      netSales: 0,
      paymentCount: 0,
      refundCount: 0,
    };
    const paidOut = paidByCurrency.get(currency) ?? 0;
    const pendingAmount = pendingByCurrency.get(currency) ?? 0;
    const merchantPayable = transaction.netSales - transaction.commissionRevenue;
    const payoutBalance = merchantPayable - paidOut;
    return {
      currency,
      grossSales: transaction.grossSales,
      refunds: transaction.refunds,
      netSales: transaction.netSales,
      commissionsCollected: transaction.commissionsCollected,
      commissionReversed: transaction.commissionReversed,
      commissionRevenue: transaction.commissionRevenue,
      paidOut,
      pendingPayouts: pendingAmount,
      merchantPayable,
      payoutBalance,
      availableForPayout: payoutBalance - pendingAmount,
      paymentCount: transaction.paymentCount,
      refundCount: transaction.refundCount,
    };
  });

  return res.json({
    success: true,
    data: {
      period: {
        startDate: start?.toISOString().slice(0, 10) ?? null,
        endDate: endExclusive
          ? new Date(endExclusive.getTime() - 1).toISOString().slice(0, 10)
          : null,
      },
      completedOrders,
      financials,
    },
  });
}

export async function listAuditLogs(req, res) {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.targetType !== undefined) {
    if (typeof req.query.targetType !== "string" || req.query.targetType.length > 100) {
      return res.status(400).json({ success: false, message: "Invalid targetType." });
    }
    filter.targetType = req.query.targetType;
  }
  if (req.query.actor !== undefined) {
    if (!mongoose.isValidObjectId(req.query.actor)) {
      return res.status(400).json({ success: false, message: "Invalid actor ID." });
    }
    filter.actor = req.query.actor;
  }

  const [logs, total] = await Promise.all([
    AdminAuditLog.find(filter)
      .populate("actor", "name email")
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AdminAuditLog.countDocuments(filter),
  ]);
  return res.json({
    success: true,
    data: logs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
