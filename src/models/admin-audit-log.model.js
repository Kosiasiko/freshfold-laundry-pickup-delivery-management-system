import mongoose from "mongoose";

const adminAuditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    action: { type: String, required: true, immutable: true, maxlength: 100 },
    targetType: {
      type: String,
      required: true,
      immutable: true,
      maxlength: 100,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      immutable: true,
    },
    details: { type: mongoose.Schema.Types.Mixed, immutable: true },
    ipAddress: { type: String, immutable: true, maxlength: 100 },
    userAgent: { type: String, immutable: true, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export default mongoose.models.AdminAuditLog ||
  mongoose.model("AdminAuditLog", adminAuditLogSchema);
