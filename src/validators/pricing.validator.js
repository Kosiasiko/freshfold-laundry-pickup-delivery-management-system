import { z } from 'zod';

const PRICING_METHODS = ['PER_ITEM', 'PER_KG', 'PER_LOAD'];
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const createPriceSchema = z.object({
  body: z
    .object({
      serviceName: z.string().trim().min(1, 'Service name is required'),
      itemName: z.string().trim().min(1).optional(),
      pricingMethod: z.enum(PRICING_METHODS),
      amount: z.number().int().positive('Amount must be greater than 0'),
      currency: z.string().length(3).default('NGN'),
      isActive: z.boolean().optional(),
    })
    .refine((d) => d.pricingMethod !== 'PER_ITEM' || d.itemName, {
      message: 'itemName is required for PER_ITEM pricing',
      path: ['itemName'],
    }),
  params: z.object({ businessId: objectId }),
});

const updatePriceSchema = z.object({
  body: z
    .object({
      serviceName: z.string().trim().min(1),
      itemName: z.string().trim().min(1),
      pricingMethod: z.enum(PRICING_METHODS),
      amount: z.number().int().positive(),
      isActive: z.boolean(),
    })
    .partial()
    .refine((d) => Object.keys(d).length > 0, {
      message: 'Provide at least one field to update',
    }),
  params: z.object({ businessId: objectId, priceId: objectId }),
});

const getPricesSchema = z.object({
  params: z.object({ businessId: objectId }),
});

const calculateOrderSchema = z.object({
  params: z.object({ businessId: objectId }),
  body: z.object({
    lines: z
      .array(
        z.object({
          priceId: objectId,
          quantity: z.number().int().positive().optional(),
          weightKg: z.number().positive().max(500).optional(),
          loads: z.number().int().positive().max(100).optional(),
        })
      )
      .min(1, 'Add at least one line'),
    deliveryRequired: z.boolean().default(false),
    extraCharges: z
      .array(
        z.object({
          name: z.string().min(1),
          amount: z.number().int().nonnegative(),
        })
      )
      .optional(),
  }),
});

export {
  createPriceSchema,
  updatePriceSchema,
  getPricesSchema,
  calculateOrderSchema,
};