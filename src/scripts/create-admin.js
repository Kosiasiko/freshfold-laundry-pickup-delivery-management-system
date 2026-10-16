import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/user.model.js";

const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;

if (
  !ADMIN_EMAIL?.trim() ||
  !ADMIN_PASSWORD ||
  ADMIN_PASSWORD.length < 12 ||
  !ADMIN_NAME?.trim()
) {
  console.error(
    "Set ADMIN_EMAIL, ADMIN_PASSWORD (at least 12 characters), and ADMIN_NAME before creating an administrator.",
  );
  process.exitCode = 1;
} else {
  try {
    await connectDB();
    const email = ADMIN_EMAIL.trim().toLowerCase();
    if (await User.exists({ email })) {
      throw new Error("That email already belongs to an account; no account was changed.");
    }
    await User.create({
      name: ADMIN_NAME.trim(),
      email,
      password: ADMIN_PASSWORD,
      role: "admin",
    });
    console.log(`Administrator account created for ${email}.`);
  } catch (error) {
    console.error("Administrator creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
