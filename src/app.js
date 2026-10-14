import express from "express";
import cors from "cors";
import helmet from "helmet";

import { notFound } from "./middleware/notFound.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import businessRoutes from "./routes/business.router.js";

const app = express();

app.use(helmet());
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Laundry Pickup and Delivery Management System active",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "FreshFold Api is health",
    environment: process.env.NODE_ENV || "development",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
