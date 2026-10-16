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
    },
    completedAt: { type: Date, index: true },
  },
  { timestamps: true },
);

orderSchema.pre("validate", function validateCompletionDate() {
  if (["completed", "delivered"].includes(this.status) && !this.completedAt) {
    this.invalidate("completedAt", "A completed order must include its completion date.");
  }
});

export default mongoose.models.Order || mongoose.model("Order", orderSchema);
