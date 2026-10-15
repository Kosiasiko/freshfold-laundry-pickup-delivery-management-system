import mongoose from "mongoose";
import Service from "../models/service.model.js";
import Business from "../models/business.model.js";

// Helper: Find the business belonging to the logged-in user
const getUserBusiness = async (userId) => {
  return Business.findOne({
    registeredBy: userId,
  });
};

// Helper: Check whether the business is approved and active
const isBusinessApproved = (business) => {
  return (
    business.approvalStatus === "Approved" &&
    business.isActive === true
  );
};

// CREATE SERVICE
export const createService = async (req, res, next) => {
  try {
    const { name, description, category, price } = req.body;

    const business = await getUserBusiness(req.user._id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Register a business before creating services.",
      });
    }

    if (!isBusinessApproved(business)) {
      return res.status(403).json({
        success: false,
        message: "Your business must be approved and active.",
      });
    }

    if (
      price === undefined ||
      price === null ||
      price === "" ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid, non-negative price is required.",
      });
    }

    const service = await Service.create({
      business: business._id,
      name,
      description,
      category,
      price: Number(price),
    });

    return res.status(201).json({
      success: true,
      message: "Laundry service created successfully.",
      data: service,
    });
  } catch (error) {
    return next(error);
  }
};

// GET ALL SERVICES BELONGING TO THE LOGGED-IN BUSINESS
export const getMyServices = async (req, res, next) => {
  try {
    const business = await getUserBusiness(req.user._id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "No business found for this account.",
      });
    }

    const services = await Service.find({
      business: business._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    return next(error);
  }
};

// GET ONE SERVICE BELONGING TO THE LOGGED-IN BUSINESS
export const getServiceById = async (req, res, next) => {
  try {
    const { serviceId } = req.params;

    if (!mongoose.isValidObjectId(serviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    const business = await getUserBusiness(req.user._id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "No business found for this account.",
      });
    }

    const service = await Service.findOne({
      _id: serviceId,
      business: business._id,
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found in your business.",
      });
    }

    return res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    return next(error);
  }
};

// UPDATE SERVICE DETAILS
export const updateService = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    const { name, description, category, price, isAvailable, isActive } =
      req.body;

    if (!mongoose.isValidObjectId(serviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    const business = await getUserBusiness(req.user._id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "No business found for this account.",
      });
    }

    if (!isBusinessApproved(business)) {
      return res.status(403).json({
        success: false,
        message: "Your business must be approved and active.",
      });
    }

    // Only update a service owned by this business
    const service = await Service.findOne({
      _id: serviceId,
      business: business._id,
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found in your business.",
      });
    }

    // Update only explicitly supplied fields
    if (name !== undefined) service.name = name;
    if (description !== undefined) service.description = description;
    if (category !== undefined) service.category = category;

    if (price !== undefined) {
      if (
        price === null ||
        price === "" ||
        !Number.isFinite(Number(price)) ||
        Number(price) < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Price must be a valid non-negative number.",
        });
      }

      service.price = Number(price);
    }

    if (isAvailable !== undefined) {
      if (typeof isAvailable !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isAvailable must be true or false.",
        });
      }

      service.isAvailable = isAvailable;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isActive must be true or false.",
        });
      }

      service.isActive = isActive;
    }

    await service.save();

    return res.status(200).json({
      success: true,
      message: "Laundry service updated successfully.",
      data: service,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
};

// DELETE SERVICE (SOFT DELETE / DEACTIVATE)
export const deleteService = async (req, res, next) => {
  try {
    const { serviceId } = req.params;

    if (!mongoose.isValidObjectId(serviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    const business = await getUserBusiness(req.user._id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "No business found for this account.",
      });
    }

    const service = await Service.findOne({
      _id: serviceId,
      business: business._id,
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found in your business.",
      });
    }

    // Keep the record but prevent it from being selected
    service.isActive = false;
    service.isAvailable = false;

    await service.save();

    return res.status(200).json({
      success: true,
      message: "Laundry service deactivated successfully.",
      data: service,
    });
  } catch (error) {
    return next(error);
  }
};