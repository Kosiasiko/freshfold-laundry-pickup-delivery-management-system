import mongoose from "mongoose";

const chargeSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true }, // "Delivery", "Express", "Starch"
    type: { type: String, enum: ["DELIVERY", "EXTRA"], required: true },
    amount: { type: Number, required: true, min: 0 }, // kobo
    freeAbove: { type: Number, min: 1 }, // DELIVERY only: free if subtotal >= this (kobo)
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

chargeSchema.index({ business: 1, type: 1, name: 1 }, { unique: true });

export default mongoose.model("Charge", chargeSchema);