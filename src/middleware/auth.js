import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";

export default (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new AppError("Please log in", 401);

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }
};