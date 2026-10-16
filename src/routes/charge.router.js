import express from "express";
import * as controller from "../controllers/charge.controller.js";
import validate from "../middleware/validate.js";
// import auth from "../middleware/auth.js";
// import ownsBusiness from "../middleware/ownsBusiness.js";
import {
  createChargeSchema,
  updateChargeSchema,
  getChargesSchema,
} from "../validators/charge.validator.js";

const router = express.Router({ mergeParams: true });

// router.use(auth, ownsBusiness); // enable once the user and business models exist

router.post("/", validate(createChargeSchema), controller.create);
router.get("/", validate(getChargesSchema), controller.getAll);
router.patch("/:chargeId", validate(updateChargeSchema), controller.update);

export default router;