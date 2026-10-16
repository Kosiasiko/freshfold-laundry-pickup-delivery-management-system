import { calculateOrderCost } from "./pricing.service.js";

// Call this when an order is confirmed. It recalculates on the server
// (never trust totals sent by the client) and returns a frozen copy.
export async function buildPriceSnapshot(businessId, payload) {
  const result = await calculateOrderCost(businessId, payload);
  return { ...result, snapshotAt: new Date() };
}