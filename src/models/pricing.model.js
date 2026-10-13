import mongoose from 'mongoose';

const servicePriceSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    serviceName: { type: String, required: true, trim: true },
    itemName: { type: String, trim: true }, // only for PER_ITEM
    pricingMethod: {
      type: String,
      enum: ['PER_ITEM', 'PER_KG', 'PER_LOAD'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Amount must be greater than 0'], // kobo
    },
    currency: { type: String, default: 'NGN' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

servicePriceSchema.index(
  { business: 1, serviceName: 1, itemName: 1, pricingMethod: 1 },
  { unique: true }
);

export default mongoose.model('ServicePrice', servicePriceSchema);