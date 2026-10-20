# Payment Endpoints, Gateway Events & Commission Calculations

## Base Path
`/api/v1/payments`

## Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/initiate` | Customer | Creates a pending Payment and returns a gateway authorization URL. Idempotent via `Idempotency-Key` header. |
| GET | `/verify` | Customer/Staff/Admin | Server-side verification of a gateway reference. Marks payment successful/failed and records commission exactly once. |
| POST | `/webhook` | Public (gateway) | Asynchronous gateway notification. Signature verified via `x-paystack-signature`. |
| POST | `/:paymentId/refund` | Administrator | Records a refund and reverses commission proportionally. |
| GET | `/me` | Customer | List the authenticated customer's payments. |
| GET | `/business/:businessId` | Staff/Admin | List payments for a business. |

## Gateway Events

| Event | Meaning | Action |
|-------|---------|--------|
| `charge.success` | Customer completed payment | Payment → `successful`, Order → `confirmed`, commission recorded once |
| `charge.failed` | Payment failed | Payment → `failed`, attempts incremented |

Webhook signature is validated against `PAYSTACK_SECRET_KEY` before processing. Unknown references are ignored.

## Commission Calculation

- **Rate:** 10% (`COMMISSION_RATE = 0.10`)
- **Commissionable amount:** `order.totalAmount - order.deliveryFee` (delivery fees are not commissionable), unless `order.commissionableAmount` is explicitly set.
- **Commission (kobo):** `Math.round(commissionableAmount * 0.10)`
- **Business earnings:** `totalAmount - commissionAmount`
- **Exactly-once:** `recordCommissionOnce()` skips recalculation if `commissionAmount` is already set on the payment.
- **Refund reversal:** Commission is reversed proportionally to the refunded amount. When `refundedAmount >= amount`, payment status becomes `refunded`.

## Money

All amounts are stored/transacted in **kobo** (minor currency unit). Use `toNaira()` / `toKobo()` helpers for display/conversion.
