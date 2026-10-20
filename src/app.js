import express from "express";

const app = express();

// Capture raw body for webhook signature verification (must run BEFORE json parsing)
app.use("/api/v1/payments/webhook", express.raw({ type: "*/*" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Laundry Pickup and Delivery Management System active",
  });
});

// ---- API v1 routes ----
import paymentRouter from "./routes/payment.router.js";
import payoutRouter from "./routes/payout.router.js";
import disputeRouter from "./routes/dispute.router.js";
import auditLogRouter from "./routes/audit-log.router.js";
import serviceAreaRouter from "./routes/service-area.router.js";
import orderItemRouter from "./routes/order-item.router.js";
import processingRouter from "./routes/processing.router.js";
import jobRouter from "./routes/job.router.js";

app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/payouts", payoutRouter);
app.use("/api/v1/disputes", disputeRouter);
app.use("/api/v1/audit-logs", auditLogRouter);
app.use("/api/v1/service-areas", serviceAreaRouter);
app.use("/api/v1/order-items", orderItemRouter);
app.use("/api/v1/processing", processingRouter);
app.use("/api/v1/jobs", jobRouter);

// ---- 404 ----
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ---- Error handler ----
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;
