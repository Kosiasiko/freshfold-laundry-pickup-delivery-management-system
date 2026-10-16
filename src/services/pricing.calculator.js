import AppError from '../utils/AppError.js';

const MEASURE_FIELD = {
  PER_ITEM: 'quantity',
  PER_KG: 'weightKg',
  PER_LOAD: 'loads',
};

function calculateLine(price, input) {
  const field = MEASURE_FIELD[price.pricingMethod];
  if (!field) {
    throw new AppError(`Invalid pricing method: ${price.pricingMethod}`, 400);
  }

  const measure = input[field];
  if (measure === undefined || measure === null || measure <= 0) {
    throw new AppError(`${field} is required for ${price.pricingMethod} pricing`, 400);
  }

  return {
    priceId: String(price._id),
    serviceName: price.serviceName,
    itemName: price.itemName || null,
    pricingMethod: price.pricingMethod,
    unitAmount: price.amount,
    measure,
    lineTotal: Math.round(price.amount * measure),
  };
}

function resolveDeliveryFee(rule, subtotal) {
  if (!rule) return 0;
  if (rule.freeAbove && subtotal >= rule.freeAbove) return 0;
  return rule.amount;
}

function calculateOrder({
  prices,
  lines,
  deliveryFee = 0,
  deliveryRule = null,
  extraCharges = [],
}) {
  const priceMap = new Map(prices.map((p) => [String(p._id), p]));

  const calculatedLines = lines.map((line) => {
    const price = priceMap.get(line.priceId);
    if (!price) throw new AppError(`Price not found: ${line.priceId}`, 404);
    if (!price.isActive) {
      throw new AppError(`Price is not active: ${price.serviceName}`, 400);
    }
    return calculateLine(price, line);
  });

  const subtotal = calculatedLines.reduce((sum, l) => sum + l.lineTotal, 0);
  const finalDeliveryFee = deliveryRule
    ? resolveDeliveryFee(deliveryRule, subtotal)
    : deliveryFee;
  const extrasTotal = extraCharges.reduce((sum, c) => sum + c.amount, 0);

  return {
    lines: calculatedLines,
    subtotal,
    deliveryFee: finalDeliveryFee,
    extraCharges,
    total: subtotal + finalDeliveryFee + extrasTotal,
    currency: "NGN",
  };
}

export { calculateLine, calculateOrder, resolveDeliveryFee };