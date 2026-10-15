import mongoose from "mongoose";
import { randomBytes } from "node:crypto";

const orderItemSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: [true, "Selected service is required"],
    },

    // Price and service details captured when the order is placed
    serviceName: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: [0, "Unit price cannot be negative"],
    },

    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      default: 1,
    },

    weightKg: {
      type: Number,
      min: [0.01, "Weight must be greater than zero"],
      default: null,
    },

    lineTotal: {
      type: Number,
      required: true,
      min: [0, "Line total cannot be negative"],
    },
  },
  { _id: true },
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: [
        "Pending Confirmation",
        "Confirmed",
        "Picked Up",
        "Processing",
        "Ready for Delivery",
        "Out for Delivery",
        "Completed",
        "Cancelled",
      ],
    },

    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    note: {
      type: String,
      trim: true,
      maxlength: [500, "Status note cannot exceed 500 characters"],
      default: "",
    },

    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderReference: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Customer is required"],
      index: true,
    },

    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: [true, "Laundry business is required"],
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "An order must contain, at least a service",
      },
    },

    pickupDistanceKm: {
      type: Number,
      required: [true, "Pickup distance in kilometres is required"],
      min: [0.1, "Pickup distance must be greater than zero"],
      max: [1000, "Pickup distance cannot exceed 1000 km"],
    },

    pickupDetails: {
      address: {
        type: String,
        required: [true, "Pickup address is required"],
        trim: true,
        maxlength: 300,
      },

      scheduledAt: {
        type: Date,
        required: [true, "Pickup date and time are required"],
      },

      instructions: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },
    },

    deliveryDetails: {
      address: {
        type: String,
        required: [true, "Delivery address is required"],
        trim: true,
        maxlength: 300,
      },

      deliveryDistanceKm: {
        type: Number,
        required: [true, "Delivery distance in kilometres is required"],
        min: [0.1, "Delivery distance must be greater than zero"],
        max: [1000, "Delivery distance cannot exceed 1000 km"],
      },

      instructions: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    pickupFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    deliveryFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "Pending Confirmation",
        "Confirmed",
        "Picked Up",
        "Processing",
        "Ready for Delivery",
        "Out for Delivery",
        "Completed",
        "Cancelled",
      ],
      default: "Pending Confirmation",
      required: true,
      index: true,
    },

    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },

    cancellationRequestedAt: {
      type: Date,
      default: null,
    },

    cancellationRequestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Generate a unique, human-readable order reference.
orderSchema.pre("validate", function () {
  if (!this.orderReference) {
    this.orderReference = `FF-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;
  }
});

// Useful indexes for business order lists and customer order history.
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ business: 1, status: 1, createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;
