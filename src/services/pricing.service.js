import ServicePrice from "../models/pricing.model.js";
import { calculateOrder } from "./pricing.calculator.js";
import AppError from "../utils/AppError.js";
import Charge from "../models/charge.model.js";

async function createPrice(businessId, data) {
  try {
    return await ServicePrice.create({ ...data, business: businessId });
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError('This price already exists for your business', 409);
    }
    throw err;
  }
}

async function getPrices(businessId, { activeOnly = false } = {}) {
  const filter = { business: businessId };
  if (activeOnly) filter.isActive = true;
  return ServicePrice.find(filter).sort({ serviceName: 1 });
}

async function updatePrice(businessId, priceId, data) {
  const price = await ServicePrice.findOneAndUpdate(
    { _id: priceId, business: businessId },
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!price) throw new AppError('Price not found', 404);
  return price;
}

async function calculateOrderCost(businessId, payload) {
  const { lines, deliveryRequired, extraChargeIds = [] } = payload;

  const prices = await ServicePrice.find({
    _id: { $in: lines.map((l) => l.priceId) },
    business: businessId,
  });

  let deliveryRule = null;
  if (deliveryRequired) {
    deliveryRule = await Charge.findOne({
      business: businessId,
      type: "DELIVERY",
      isActive: true,
    });
    if (!deliveryRule) {
      throw new AppError("This business has not set a delivery fee", 400);
    }
  }

  const uniqueIds = [...new Set(extraChargeIds)];
  const extras = uniqueIds.length
    ? await Charge.find({
        _id: { $in: uniqueIds },
        business: businessId,
        type: "EXTRA",
        isActive: true,
      })
    : [];
  if (extras.length !== uniqueIds.length) {
    throw new AppError("One or more extra charges are invalid", 400);
  }

  const extraCharges = extras.map((c) => ({
    chargeId: String(c._id),
    name: c.name,
    amount: c.amount,
  }));

  return calculateOrder({ prices, lines, deliveryRule, extraCharges });
}

export { createPrice, getPrices, updatePrice, calculateOrderCost };