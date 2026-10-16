import mongoose from "mongoose";

const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "suspended"],
      default: "pending",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

export default mongoose.models.Business ||
  mongoose.model("Business", businessSchema);
