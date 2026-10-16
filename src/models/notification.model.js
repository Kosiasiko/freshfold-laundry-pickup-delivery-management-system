import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    default: null,
  },
  type: {
    type: String,
    enum: [
    "booking_confirmed",
    "payment_successful",
    "payment_failed",
    "pickup_completed",
    "laundry_processing",
    "laundry_ready",
    "delivery_completed"
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  channels: {
    inApp: {
        status: {
            type: String,
            enum: ["pending", "delivered", "failed"],
            default: "delivered",
        }
    },
    email: {
        status: {
            type: String,
            enum: ["pending", "sent", "delivered", "failed"],
            default: "pending",
        },
        sentAt: Date,
        deliveredAt: Date,
        error: String
    },
    sms: {
        status: {
            type: String,
            enum: ["pending", "sent", "delivered", "failed"],
            default: "pending"
        },
        sentAt: Date,
        deliveredAt: Date,
        error: String
    }
  },

  deduplicationKey: {
    type: String,
    default: undefined
  },
}, { timestamps: true });

notificationSchema.index(
    {deduplicationKey: 1},
    {
        unique: true,
        partialFilterExpression: {
            deduplicationKey: {$type: "string"},
        },
    }
);

notificationSchema.index({user: 1, isRead: 1, createdAt: -1});

export default mongoose.model("Notification", notificationSchema);