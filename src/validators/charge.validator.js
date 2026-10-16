import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const createChargeSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1, "Name is required"),
      type: z.enum(["DELIVERY", "EXTRA"]),
      amount: z.number().int().nonnegative(),
      freeAbove: z.number().int().positive().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((d) => d.type === "DELIVERY" || d.freeAbove === undefined, {
      message: "freeAbove only applies to DELIVERY charges",
      path: ["freeAbove"],
    }),
  params: z.object({ businessId: objectId }),
});

const updateChargeSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1),
      amount: z.number().int().nonnegative(),
      freeAbove: z.number().int().positive(),
      isActive: z.boolean(),
    })
    .partial()
    .refine((d) => Object.keys(d).length > 0, {
      message: "Provide at least one field to update",
    }),
  params: z.object({ businessId: objectId, chargeId: objectId }),
});

const getChargesSchema = z.object({
  params: z.object({ businessId: objectId }),
});

export { createChargeSchema, updateChargeSchema, getChargesSchema };