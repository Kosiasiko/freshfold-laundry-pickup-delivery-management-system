import * as disputeService from "../services/dispute.service.js";

export const reportIssue = async (req, res) => {
  const { orderId, businessId, type, description } = req.body;
  // Persist uploaded evidence files from multer (req.files populated by upload.array middleware)
  const evidenceFiles = (req.files || []).map((file) => ({
    url: file.path,
    fileName: file.originalname,
    mimeType: file.mimetype,
    uploadedBy: req.user._id,
    uploadedAt: new Date(),
  }));
  const dispute = await disputeService.createDispute({
    customerId: req.user._id,
    orderId,
    businessId,
    type,
    description,
    evidence: evidenceFiles,
    req,
  });
  res.status(201).json({
    success: true,
    message: "Dispute reported.",
    data: dispute,
  });
};

export const getMyDisputes = async (req, res) => {
  const disputes = await disputeService.getDisputes(
    {},
    req.user,
    req.user.role === "Administrator"
  );
  res.json({ success: true, data: disputes });
};

export const getDispute = async (req, res) => {
  const dispute = await disputeService.getDisputeById(
    req.params.disputeId,
    req.user,
    req.user.role === "Administrator"
  );
  res.json({ success: true, data: dispute });
};

export const resolveDispute = async (req, res) => {
  const { resolution, status, assignedTo, refundApproved, refundAmount } =
    req.body;
  const dispute = await disputeService.resolveDispute({
    disputeId: req.params.disputeId,
    resolution,
    status,
    assignedTo,
    refundApproved: refundApproved === true,
    refundAmountKobo: refundAmount,
    req,
  });
  res.json({
    success: true,
    message: "Dispute resolved.",
    data: dispute,
  });
};

export const assignReviewer = async (req, res) => {
  const { assignedTo } = req.body;
  const dispute = await disputeService.assignReviewer(
    req.params.disputeId,
    assignedTo,
    req
  );
  res.json({ success: true, data: dispute });
};
