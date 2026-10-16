import mongoose from "mongoose";

const priceSnapshotSchema = new mongoose.Schema(
  {
    lines: [
      {
        priceId: String,
        serviceName: String,
        itemName: String,
        pricingMethod: String,
        unitAmount: Number, // kobo, as it was at confirmation
        measure: Number, // quantity, kg or loads
        lineTotal: Number,
        _id: false,
      },
    ],
    subtotal: Number,
    deliveryFee: Number,
    extraCharges: [
      { chargeId: String, name: String, amount: Number, _id: false },
    ],
    total: Number,
    currency: String,
    snapshotAt: Date,
  },
  { _id: false }
);

export default priceSnapshotSchema;