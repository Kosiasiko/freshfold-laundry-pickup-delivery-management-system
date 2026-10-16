import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const JWT_ISSUER = "freshfold-api";
const JWT_AUDIENCE = "freshfold-admin";

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

export function createAdminToken(userId) {
  return jwt.sign({}, getJwtSecret(), {
    subject: userId.toString(),
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    expiresIn: "15m",
    algorithm: "HS256",
  });
}

export async function requireAdmin(req, res, next) {
  const authorization = req.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  try {
    const payload = jwt.verify(authorization.slice(7), getJwtSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ["HS256"],
    });
    if (typeof payload === "string" || !payload.sub) {
      return res.status(401).json({ success: false, message: "Invalid or expired token." });
    }

    const user = await User.findById(payload.sub).select("name email role isActive");
    if (!user?.isActive) {
      return res.status(401).json({ success: false, message: "Invalid or expired token." });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Administrator access required." });
    }

    req.admin = user;
    return next();
  } catch (error) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      return res.status(401).json({ success: false, message: "Invalid or expired token." });
    }
    return next(error);
  }
}
