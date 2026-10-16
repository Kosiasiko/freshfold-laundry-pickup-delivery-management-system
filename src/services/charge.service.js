import Charge from "../models/charge.model.js";
import AppError from "../utils/AppError.js";

async function createCharge(businessId, data) {
  try {
    return await Charge.create({ ...data, business: businessId });
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError("A charge with this name already exists", 409);
    }
    throw err;
  }
}

async function getCharges(businessId) {
  return Charge.find({ business: businessId }).sort({ type: 1, name: 1 });
}

async function updateCharge(businessId, chargeId, data) {
  const charge = await Charge.findOneAndUpdate(
    { _id: chargeId, business: businessId },
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!charge) throw new AppError("Charge not found", 404);
  return charge;
}

export { createCharge, getCharges, updateCharge };