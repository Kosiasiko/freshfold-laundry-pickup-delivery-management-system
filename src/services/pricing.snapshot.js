import { calculateOrderCost } from "./pricing.service.js";

export async function buildPriceSnapshot(businessId, payload) {
  const result = await calculateOrderCost(businessId, payload);
  return { ...result, snapshotAt: new Date() };
}