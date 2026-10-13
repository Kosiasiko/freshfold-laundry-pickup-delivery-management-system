import { describe, test, expect } from "@jest/globals";
import { calculateLine, calculateOrder } from "../src/services/pricing.calculator.js";

const perKg = { _id: 'p1', serviceName: 'Wash & Fold', pricingMethod: 'PER_KG', amount: 100000, isActive: true };
const perItem = { _id: 'p2', serviceName: 'Dry Clean', itemName: 'Shirt', pricingMethod: 'PER_ITEM', amount: 50000, isActive: true };
const perLoad = { _id: 'p3', serviceName: 'Bulk Wash', pricingMethod: 'PER_LOAD', amount: 300000, isActive: true };

describe('calculateLine', () => {
  test('PER_KG multiplies amount by weight', () => {
    expect(calculateLine(perKg, { weightKg: 2.5 }).lineTotal).toBe(250000);
  });

  test('PER_ITEM multiplies amount by quantity', () => {
    expect(calculateLine(perItem, { quantity: 3 }).lineTotal).toBe(150000);
  });

  test('PER_LOAD multiplies amount by loads', () => {
    expect(calculateLine(perLoad, { loads: 2 }).lineTotal).toBe(600000);
  });

  test('rejects a missing measure', () => {
    expect(() => calculateLine(perKg, {})).toThrow('weightKg is required');
  });

  test('rejects zero or negative values', () => {
    expect(() => calculateLine(perItem, { quantity: 0 })).toThrow();
    expect(() => calculateLine(perKg, { weightKg: -1 })).toThrow();
  });
});

describe('calculateOrder', () => {
  const prices = [perKg, perItem, perLoad];

  test('adds subtotal, delivery fee and extra charges', () => {
    const result = calculateOrder({
      prices,
      lines: [
        { priceId: 'p1', weightKg: 2 },
        { priceId: 'p2', quantity: 2 },
      ],
      deliveryFee: 50000,
      extraCharges: [{ name: 'Express', amount: 20000 }],
    });
    expect(result.subtotal).toBe(300000);
    expect(result.total).toBe(370000);
  });

  test('rejects an unknown price', () => {
    expect(() =>
      calculateOrder({ prices, lines: [{ priceId: 'nope', quantity: 1 }] })
    ).toThrow('Price not found');
  });

  test('rejects an inactive price', () => {
    const inactive = [{ ...perKg, isActive: false }];
    expect(() =>
      calculateOrder({ prices: inactive, lines: [{ priceId: 'p1', weightKg: 1 }] })
    ).toThrow('not active');
  });
});