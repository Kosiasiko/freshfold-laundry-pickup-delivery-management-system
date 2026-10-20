import AuditLog from "../models/audit-log.model.js";

const SENSITIVE_FIELDS = [
  "password",
  "passwordConfirm",
  "secretKey",
  "apiKey",
  "accessToken",
  "refreshToken",
  "cardNumber",
  "cvv",
  "pin",
  "authorization",
  "cookie",
  "set-cookie",
];

/**
 * Redact sensitive keys from an object before logging.
 */
const redact = (obj, depth = 0) => {
  if (depth > 3) return "[redacted]";
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((v) => redact(v, depth + 1));
  if (typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      const key = String(k).toLowerCase();
      if (SENSITIVE_FIELDS.some((s) => key.includes(s))) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = redact(v, depth + 1);
      }
    }
    return out;
  }
  if (typeof obj === "string" && obj.length > 200) return obj.slice(0, 200) + "…";
  return obj;
};

/**
 * Write an immutable audit log entry.
 * @param {Object} params
 * @param {string} params.actor - user id who performed the action
 * @param {string} params.action - e.g. 'payment.initiated', 'refund.approved'
 * @param {string} params.resourceType - e.g. 'Payment', 'Order', 'Payout'
 * @param {string|ObjectId} params.resourceId
 * @param {Object} params.details - safe metadata (will be redacted)
 * @param {Object} params.req - express request (for ip/userAgent)
 * @param {mongoose.ClientSession} [params.session]
 */
export const logAuditEvent = async ({
  actor,
  action,
  resourceType,
  resourceId,
  details = {},
  req,
  session,
}) => {
  try {
    await AuditLog.create(
      [
        {
          actor: actor || null,
          action,
          resourceType,
          resourceId,
          details: redact(details),
          ip: req ? req.ip : null,
          userAgent: req ? req.get("user-agent") : null,
        },
      ],
      { session }
    );
  } catch (error) {
    // Audit logging must never break the primary request.
    console.error("Audit log write failed:", error.message);
  }
};
