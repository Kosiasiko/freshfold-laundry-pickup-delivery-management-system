import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    rider: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "picked_up",
        "processing",
        "ready_for_delivery",
        "delivered",
        "completed",
        "cancelled",
      ],
      required: true,
      index: true,
      default: "pending",
    },
    // Laundry processing state machine (Task 19)
    processingStatus: {
      type: String,
      enum: [
        "received",
        "inspection",
        "washing",
        "drying",
        "ironing",
        "quality_check",
        "ready_for_delivery",
      ],
      default: null,
      index: true,
    },
    // Pricing
    subtotal: { type: Number, min: 0, default: 0 }, // kobo
    deliveryFee: { type: Number, min: 0, default: 0 }, // kobo
    totalAmount: { type: Number, min: 0, default: 0 }, // kobo
    commissionableAmount: { type: Number, min: 0, default: 0 }, // kobo
    currency: { type: String, default: "NGN", uppercase: true },
    completedAt: { type: Date, index: true },
    // Reminder deduplication: set when a pickup/delivery reminder has been sent
    remindedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

orderSchema.pre("validate", function validateCompletionDate() {
  if (["completed", "delivered"].includes(this.status) && !this.completedAt) {
    this.completedAt = new Date();
  }
});

export default mongoose.models.Order || mongoose.model("Order", orderSchema);
