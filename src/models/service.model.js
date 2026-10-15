import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: [true, "Business is required"],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
      minlength: [3, "Service name must be at least 3 characters long"],
      maxlength: [50, "Service name must be at most 50 characters long"],
    },

    description: {
      type: String,
      required: [true, "Service description is required"],
      trim: true,
      minlength: [10, "Service description must be at least 10 characters long"],
      maxlength: [200, "Service description must be at most 200 characters long"],
    },

    category: {
      type: String,
      required: [true, "Service category is required"],
      enum: ["Washing", "Dry Cleaning", "Ironing", "Wash and Fold", "Other"],
      default: "Other",
    },

    price: {
      type: Number,
      required: [true, "Service price is required"],
      min: [0, "Service price cannot be negative"],
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

serviceSchema.index({ business: 1, isActive: 1, isAvailable: 1 });

const Service = mongoose.model("Service", serviceSchema);

export default Service;