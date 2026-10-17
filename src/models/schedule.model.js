import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema(
  {
    serviceType: {
      type: String,
      enum: ["pickup", "delivery"],
      required: true,
    },

    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },

    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Capacity must be a positive integer",
      },
    },

    bookedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

scheduleSchema.index({
  serviceType: 1,
  date: 1,
  startTime: 1,
  endTime: 1,
});

export default mongoose.model("Schedule", scheduleSchema);

