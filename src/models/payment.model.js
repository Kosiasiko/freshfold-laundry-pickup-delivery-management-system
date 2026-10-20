import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 }, // kobo
    currency: { type: String, required: true, uppercase: true, default: "NGN" },
    commissionAmount: { type: Number, min: 0, default: 0 }, // kobo
    commissionableAmount: { type: Number, min: 0, default: 0 }, // kobo
    status: {
      type: String,
      enum: ["pending", "successful", "failed", "refunded"],
      required: true,
      index: true,
      default: "pending",
    },
    attempts: { type: Number, default: 0 },
    gateway: { type: String, default: "paystack" },
    gatewayReference: { type: String, trim: true, maxlength: 200 },
    gatewayResponse: { type: mongoose.Mixed },
    idempotencyKey: { type: String, trim: true },
    paidAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    refundedAmount: { type: Number, min: 0, default: 0 }, // kobo
    commissionReversed: { type: Number, min: 0, default: 0 }, // kobo
  },
  { timestamps: true }
);

paymentSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
paymentSchema.index({ order: 1, status: 1 });
paymentSchema.index({ customer: 1, createdAt: -1 });

export default mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
