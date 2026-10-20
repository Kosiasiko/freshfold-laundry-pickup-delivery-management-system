import mongoose from "mongoose";

const payoutSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 }, // kobo
    currency: { type: String, required: true, uppercase: true, default: "NGN" },
    status: {
      type: String,
      enum: ["pending", "processing", "successful", "failed"],
      required: true,
      index: true,
      default: "pending",
    },
    paidAt: { type: Date, default: null },
    providerReference: { type: String, trim: true, maxlength: 200 },
    recipientCode: { type: String, trim: true },
    idempotencyKey: { type: String, trim: true },
    reconciled: { type: Boolean, default: false },
    reconciledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

payoutSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
payoutSchema.index({ business: 1, status: 1, createdAt: -1 });

export default mongoose.models.Payout || mongoose.model("Payout", payoutSchema);
