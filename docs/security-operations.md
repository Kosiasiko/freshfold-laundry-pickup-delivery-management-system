# Security Operations & Audit Logging

## Audit Log

- **Model:** `AuditLog` (`src/models/audit-log.model.js`)
- **Fields:** `actor` (user), `action`, `resourceType`, `resourceId`, `details`, `ip`, `userAgent`, `createdAt`
- **Immutability:** Schema-level `pre` hooks throw on `findOneAndUpdate`, `findOneAndDelete`, and `deleteMany`. No update/delete routes are exposed.
- **Access:** `GET /api/v1/audit-logs` — `Administrator` only, rate-limited (30 req/min).

## Events Recorded

Payment initiated/verified/failed/webhook success/failure/refunded, commission recorded/reversed, payout requested/processed/failed, disputes created/resolved/assigned, laundry processing status changes, job retries, expired unpaid bookings.

## Secret Redaction

`auditLogger.redact()` scrubs the following keys (case-insensitive, substring match) before writing: `password`, `passwordConfirm`, `secretKey`, `apiKey`, `accessToken`, `refreshToken`, `cardNumber`, `cvv`, `pin`, `authorization`, `cookie`, `set-cookie`.

Server-side gateway secrets (`PAYSTACK_SECRET_KEY`, `JWT_SECRET`) are never written to logs.

## Rate Limiting & Access Protection

- `authenticate` — JWT required on all mutation/read endpoints
- `authorizeRoles(...)` — role-based gating (Customer, Administrator, Rider, Laundry Staff)
- `idempotencyKey` — prevents duplicate payment/payout creation
- `rateLimiter` — fixed-window rate limiter on audit-log endpoint
- `express.raw()` body parser on webhook route for signature verification
