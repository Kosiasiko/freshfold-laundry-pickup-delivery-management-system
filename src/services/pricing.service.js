import ServicePrice from "../models/pricing.model.js";
import { calculateOrder } from "./pricing.calculator.js";
import AppError from "../utils/AppError.js";

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

// Placeholder: agree the real delivery rules with your team
async function getDeliveryFee(businessId, deliveryRequired) {
  if (!deliveryRequired) return 0;
  return 50000; // 500 naira in kobo
}

async function calculateOrderCost(businessId, payload) {
  const { lines, deliveryRequired, extraCharges = [] } = payload;

  const prices = await ServicePrice.find({
    _id: { $in: lines.map((l) => l.priceId) },
    business: businessId,
  });

  const deliveryFee = await getDeliveryFee(businessId, deliveryRequired);
  return calculateOrder({ prices, lines, deliveryFee, extraCharges });
}

export { createPrice, getPrices, updatePrice, calculateOrderCost };