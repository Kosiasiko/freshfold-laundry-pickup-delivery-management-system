import mongoose from "mongoose";

const payoutSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isSafeInteger,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      match: /^[A-Z]{3}$/,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      required: true,
      index: true,
    },
    paidAt: { type: Date, default: null, index: true },
    providerReference: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true },
);

payoutSchema.pre("validate", function validatePaidDate() {
  if (this.status === "paid" && !this.paidAt) {
    this.invalidate("paidAt", "A paid payout must include its payment date.");
  }
});

payoutSchema.index({ paidAt: 1, status: 1 });

export default mongoose.models.Payout || mongoose.model("Payout", payoutSchema);
