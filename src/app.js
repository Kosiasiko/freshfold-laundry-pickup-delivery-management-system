import express from "express";
import helmet from "helmet";
import adminRouter from "./routes/admin.router.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Laundry Pickup and Delivery Management System active",
  });
});

app.use("/api/admin", adminRouter);
app.use(errorHandler);

export default app;
