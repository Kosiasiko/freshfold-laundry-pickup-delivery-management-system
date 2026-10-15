import express from "express";

import {
  registerUser,
  loginUser,
  getCurrentUser,
} from "../controllers/auth.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

import {
  registerValidation,
  loginValidation,
} from "../validations/auth.validation.js";

import { validate } from "../validations/validate.middleware.js";

const router = express.Router();

router.post("/register", registerValidation, validate, registerUser);

router.post("/login", loginValidation, validate, loginUser);

router.get("/me", authenticate, getCurrentUser);

export default router;