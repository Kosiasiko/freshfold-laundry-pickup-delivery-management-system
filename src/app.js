import express from "express";
import pricingRouter from "./routes/pricing.router.js";
import chargeRouter from "./routes/charge.router.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Laundry Pickup and Delivery Management System active",
  });
});

app.use("/api/businesses/:businessId/prices", pricingRouter);
app.use("/api/businesses/:businessId/charges", chargeRouter);

// error handler (keep last, after all routes)
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  res.status(status).json({
    status: status >= 500 ? "error" : "fail",
    message: status >= 500 ? "Something went wrong" : err.message,
  });
});

export default app;