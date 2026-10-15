import Business from "../models/business.model.js";

export const registerBusiness = async (req, res) => {
  try {
    const {
      name,
      registrationNumber,
      email,
      phone,
      address,
      verificationDocuments,
    } = req.body;

    const existing = await Business.findOne({
      $or: [{ registrationNumber }, { email: email?.toLowerCase() }],
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "A business with this registration number or email already exists",
      });
    }

    const business = await Business.create({
      name,
      owner: req.user._id,
      registrationNumber,
      email,
      phone,
      address,
      verificationDocuments,
      status: "pending",
    });

    res.status(201).json({ success: true, data: business });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res
      .status(500)
      .json({ success: false, message: "Failed to register business" });
  }
};

export const getBusiness = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) {
      return res
        .status(404)
        .json({ success: false, message: "Business not found" });
    }

    const isOwner = business.owner.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.status(200).json({ success: true, data: business });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch business" });
  }
};

export const updateBusiness = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) {
      return res
        .status(404)
        .json({ success: false, message: "Business not found" });
    }

    if (business.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the owner can update this business",
      });
    }

    const allowedFields = ["name", "phone", "address", "verificationDocuments"];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        business[field] = req.body[field];
      }
    });

    await business.save();
    res.status(200).json({ success: true, data: business });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res
      .status(500)
      .json({ success: false, message: "Failed to update business" });
  }
};

export const updateApprovalStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const allowedStatuses = ["approved", "rejected", "suspended"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${allowedStatuses.join(", ")}`,
      });
    }

    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { status, statusReason: reason || "" },
      { returnDocument: "after" },
    );

    if (!business) {
      return res
        .status(404)
        .json({ success: false, message: "Business not found" });
    }

    res.status(200).json({ success: true, data: business });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update approval status" });
  }
};
