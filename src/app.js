import express from "express";
import cors from "cors";
import helmet from "helmet";

import { notFound } from "./middleware/notFound.middleware.js";
import { errorHandler} from "./middleware/error.middleware.js";


import authRoutes from "./routes/auth.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import orderRoutes from "./routes/order.routes.js";
import supportTicketRoutes from "./routes/supportTicket.routes.js";


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
app.use("/api/services", serviceRoutes);
app.use("/api/orders", orderRoutes);
console.log("support ticket routes are being reg");
app.use("/api/support-tickets", supportTicketRoutes );

app.use(notFound);
app.use(errorHandler);

export default app;
