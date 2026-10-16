import mongoose from "mongoose";

const financialTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["payment", "refund"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed"],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isSafeInteger,
    },
    commissionAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: Number.isSafeInteger,
    },
    refundedAmount: {
      type: Number,
      min: 0,
      default: 0,
      validate: Number.isSafeInteger,
    },
    commissionReversed: {
      type: Number,
      min: 0,
      default: 0,
      validate: Number.isSafeInteger,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      match: /^[A-Z]{3}$/,
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
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FinancialTransaction",
      default: null,
    },
    providerReference: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true },
);

financialTransactionSchema.index({ createdAt: 1, status: 1, type: 1 });
financialTransactionSchema.index(
  { providerReference: 1 },
  { unique: true, sparse: true },
);

financialTransactionSchema.pre("validate", async function validateLedgerEntry() {
  if (
    this.type === "refund" &&
    (this.refundedAmount !== 0 || this.commissionReversed !== 0)
  ) {
    this.invalidate("refundedAmount", "Refund totals can only be stored on payments.");
  }
  if (
    this.type === "payment" &&
    (this.refundedAmount > this.amount || this.commissionReversed > this.commissionAmount)
  ) {
    this.invalidate("refundedAmount", "Recorded refund totals exceed the payment.");
  }
  if (this.type === "payment" && this.payment) {
    this.invalidate("payment", "A payment cannot reference another payment.");
  }
  if (this.type === "refund" && !this.payment) {
    this.invalidate("payment", "A refund must reference its original payment.");
  }
  if (this.type === "refund" && this.isNew && !this.$locals.recordingRefund) {
    this.invalidate("payment", "Create refunds with FinancialTransaction.recordRefund().");
  }
  if (this.type === "payment" && this.commissionAmount > this.amount) {
    this.invalidate("commissionAmount", "Commission cannot exceed payment.");
  }
  if (this.type === "refund" && this.commissionAmount > this.amount) {
    this.invalidate("commissionAmount", "Commission reversal cannot exceed refund.");
  }
  if (this.type === "refund" && this.payment) {
    const originalPayment = await this.constructor
      .findOne({ _id: this.payment, type: "payment", status: "succeeded" })
      .session(this.$session());
    if (!originalPayment) {
      this.invalidate("payment", "A succeeded original payment was not found.");
    } else {
      if (this.order && this.order.toString() !== originalPayment.order.toString()) {
        this.invalidate("order", "Refund order must match the original payment.");
      }
      if (
        this.business &&
        this.business.toString() !== originalPayment.business.toString()
      ) {
        this.invalidate("business", "Refund business must match the original payment.");
      }
      if (this.currency !== originalPayment.currency) {
        this.invalidate("currency", "Refund currency must match the original payment.");
      }
    }
  }
});

financialTransactionSchema.statics.recordRefund = async function recordRefund({
  paymentId,
  amount,
  commissionAmount,
  providerReference,
}) {
  const ledgerError = (message, statusCode) =>
    Object.assign(new Error(message), { statusCode });
  if (
    !mongoose.isValidObjectId(paymentId) ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    !Number.isSafeInteger(commissionAmount) ||
    commissionAmount < 0 ||
    commissionAmount > amount
  ) {
    throw ledgerError("Refund amount, commission reversal, or payment ID is invalid.", 400);
  }

  const session = await this.startSession();
  let refund;
  try {
    await session.withTransaction(async () => {
      const payment = await this.findOne({
        _id: paymentId,
        type: "payment",
        status: "succeeded",
      }).session(session);
      if (!payment) {
        throw ledgerError("A succeeded original payment was not found.", 404);
      }
      if (commissionAmount > payment.commissionAmount) {
        throw ledgerError("Commission reversal cannot exceed the original commission.", 400);
      }

      const result = await this.updateOne(
        {
          _id: payment._id,
          type: "payment",
          status: "succeeded",
          $expr: {
            $and: [
              {
                $lte: [
                  { $add: [{ $ifNull: ["$refundedAmount", 0] }, amount] },
                  "$amount",
                ],
              },
              {
                $lte: [
                  {
                    $add: [
                      { $ifNull: ["$commissionReversed", 0] },
                      commissionAmount,
                    ],
                  },
                  "$commissionAmount",
                ],
              },
            ],
          },
        },
        {
          $inc: { refundedAmount: amount, commissionReversed: commissionAmount },
        },
        { session },
      );
      if (result.modifiedCount !== 1) {
        throw ledgerError("Refund exceeds the original payment's remaining balance.", 409);
      }

      refund = new this({
        type: "refund",
        status: "succeeded",
        amount,
        commissionAmount,
        currency: payment.currency,
        order: payment.order,
        business: payment.business,
        payment: payment._id,
        providerReference,
      });
      refund.$locals.recordingRefund = true;
      await refund.save({ session });
    });
    return refund;
  } finally {
    await session.endSession();
  }
};

export default mongoose.models.FinancialTransaction ||
  mongoose.model("FinancialTransaction", financialTransactionSchema);
