import express from "express";
import * as controller from "../controllers/pricing.controller.js";
import validate from "../middleware/validate.js";
// import auth from "../middleware/auth.js";
// import ownsBusiness from "../middleware/ownsBusiness.js";
import {
  createPriceSchema,
  updatePriceSchema,
  getPricesSchema,
  calculateOrderSchema,
} from "../validators/pricing.validator.js";

const router = express.Router({ mergeParams: true });

// router.use(auth, ownsBusiness); // enable once the user and business models exist

router.post("/", validate(createPriceSchema), controller.create);
router.get("/", validate(getPricesSchema), controller.getAll);
router.patch("/:priceId", validate(updatePriceSchema), controller.update);
router.post("/calculate", validate(calculateOrderSchema), controller.calculate);

export default router;