const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDateOnly(value, fieldName) {
  if (typeof value !== "string" || !DATE_ONLY_PATTERN.test(value)) {
    throw new Error(`${fieldName} must use YYYY-MM-DD format.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${fieldName} is not a valid calendar date.`);
  }
  return date;
}

export function getReportDateRange(query = {}) {
  const { startDate, endDate } = query;
  const hasStartDate = startDate !== undefined;
  const hasEndDate = endDate !== undefined;
  if (hasStartDate !== hasEndDate) {
    throw new Error("Provide both startDate and endDate.");
  }
  if (!hasStartDate) return {};

  const start = parseDateOnly(startDate, "startDate");
  const end = parseDateOnly(endDate, "endDate");
  if (start > end) throw new Error("startDate must not be after endDate.");

  const endExclusive = new Date(end);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  if (Number.isNaN(endExclusive.getTime())) {
    throw new Error("endDate is outside the supported date range.");
  }
  return { start, endExclusive };
}

export function buildFinancialReportPipeline(start, endExclusive) {
  const match = { status: "succeeded" };
  if (start || endExclusive) {
    match.createdAt = {};
    if (start) match.createdAt.$gte = start;
    if (endExclusive) match.createdAt.$lt = endExclusive;
  }

  return [
    { $match: match },
    {
      $group: {
        _id: "$currency",
        grossSales: {
          $sum: { $cond: [{ $eq: ["$type", "payment"] }, "$amount", 0] },
        },
        refunds: {
          $sum: { $cond: [{ $eq: ["$type", "refund"] }, "$amount", 0] },
        },
        commissionsCollected: {
          $sum: {
            $cond: [
              { $eq: ["$type", "payment"] },
              "$commissionAmount",
              0,
            ],
          },
        },
        commissionReversed: {
          $sum: {
            $cond: [
              { $eq: ["$type", "refund"] },
              "$commissionAmount",
              0,
            ],
          },
        },
        paymentCount: {
          $sum: { $cond: [{ $eq: ["$type", "payment"] }, 1, 0] },
        },
        refundCount: {
          $sum: { $cond: [{ $eq: ["$type", "refund"] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        currency: "$_id",
        grossSales: 1,
        refunds: 1,
        commissionsCollected: 1,
        commissionReversed: 1,
        paymentCount: 1,
        refundCount: 1,
        commissionRevenue: {
          $subtract: ["$commissionsCollected", "$commissionReversed"],
        },
        netSales: { $subtract: ["$grossSales", "$refunds"] },
      },
    },
  ];
}

export function buildPayoutPipeline(start, endExclusive) {
  const match = { status: "paid", paidAt: { $ne: null } };
  if (start || endExclusive) {
    if (start) match.paidAt.$gte = start;
    if (endExclusive) match.paidAt.$lt = endExclusive;
  }
  return [
    { $match: match },
    {
      $group: {
        _id: "$currency",
        paidOut: { $sum: "$amount" },
        paidPayoutCount: { $sum: 1 },
      },
    },
    { $project: { _id: 0, currency: "$_id", paidOut: 1, paidPayoutCount: 1 } },
  ];
}

export function buildPendingPayoutPipeline(start, endExclusive) {
  const match = { status: "pending" };
  if (start || endExclusive) {
    match.createdAt = {};
    if (start) match.createdAt.$gte = start;
    if (endExclusive) match.createdAt.$lt = endExclusive;
  }
  return [
    { $match: match },
    {
      $group: {
        _id: "$currency",
        pendingPayouts: { $sum: "$amount" },
        pendingPayoutCount: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        currency: "$_id",
        pendingPayouts: 1,
        pendingPayoutCount: 1,
      },
    },
  ];
}
