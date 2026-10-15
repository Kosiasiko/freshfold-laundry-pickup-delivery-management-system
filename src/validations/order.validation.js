import { body, param } from "express-validator";

// 1. Validate customer order creation.
export const createOrderValidation = [
  body("business")
    .notEmpty()
    .withMessage("Laundry business is required.")
    .isMongoId()
    .withMessage("Invalid laundry business ID."),

  body("items")
    .isArray({ min: 1 })
    .withMessage("An order must contain at least one service."),

  body("items.*.service")
    .notEmpty()
    .withMessage("Service ID is required.")
    .isMongoId()
    .withMessage("Invalid service ID."),

  body("items.*.quantity")
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage("Quantity must be a whole number between 1 and 10000."),

  body("items.*.weightKg")
    .optional({ nullable: true })
    .isFloat({ min: 0.01 })
    .withMessage("Weight must be greater than zero."),

  // Pickup distance is stored at the top level.
  body("pickupDistanceKm")
    .exists({ values: "null" })
    .withMessage("Pickup distance is required.")
    .bail()
    .notEmpty()
    .withMessage("Pickup distance is required.")
    .bail()
    .isFloat({ min: 0.1, max: 1000 })
    .withMessage("Pickup distance must be between 0.1 and 1000 kilometres."),

  body("pickupDetails.address")
    .isString()
    .withMessage("Pickup address must be text.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Pickup address is required.")
    .isLength({ max: 300 })
    .withMessage("Pickup address cannot exceed 300 characters."),

  body("pickupDetails.scheduledAt")
    .notEmpty()
    .withMessage("Pickup date and time are required.")
    .bail()
    .isISO8601()
    .withMessage("Provide a valid pickup date and time."),

  body("pickupDetails.instructions")
    .optional()
    .isString()
    .withMessage("Pickup instructions must be text.")
    .bail()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Pickup instructions cannot exceed 500 characters."),

  // Delivery distance is stored inside deliveryDetails.
  body("deliveryDetails.deliveryDistanceKm")
    .exists({ values: "null" })
    .withMessage("Delivery distance is required.")
    .bail()
    .notEmpty()
    .withMessage("Delivery distance is required.")
    .bail()
    .isFloat({ min: 0.1, max: 1000 })
    .withMessage("Delivery distance must be between 0.1 and 1000 kilometres."),

  body("deliveryDetails.address")
    .isString()
    .withMessage("Delivery address must be text.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Delivery address is required.")
    .isLength({ max: 300 })
    .withMessage("Delivery address cannot exceed 300 characters."),

  body("deliveryDetails.instructions")
    .optional()
    .isString()
    .withMessage("Delivery instructions must be text.")
    .bail()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Delivery instructions cannot exceed 500 characters."),
];

// 2. Validate an order ID.
export const orderIdValidation = [
  param("orderId").isMongoId().withMessage("Invalid order ID."),
];

// 3. Validate order status updates by Laundry Staff.
export const updateOrderStatusValidation = [
  param("orderId").isMongoId().withMessage("Invalid order ID."),

  body("status")
    .notEmpty()
    .withMessage("Order status is required.")
    .isIn([
      "Confirmed",
      "Picked Up",
      "Processing",
      "Ready for Delivery",
      "Out for Delivery",
      "Completed",
    ])
    .withMessage("Invalid order status."),

  body("note")
    .optional()
    .isString()
    .withMessage("Status note must be text.")
    .bail()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Status note cannot exceed 500 characters."),
];

// 4. Validate customer cancellation requests.
export const cancelOrderValidation = [
  param("orderId").isMongoId().withMessage("Invalid order ID."),

  body("reason")
    .optional()
    .isString()
    .withMessage("Cancellation reason must be text.")
    .bail()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Cancellation reason cannot exceed 500 characters."),
];
