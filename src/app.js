import express from "express";
import {createNotificationRouter} from "./routes/notification.router.js";
import { protect } from "./middleware/auth.middleware.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/notifications", createNotificationRouter(protect));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Laundry Pickup and Delivery Management System active",
  });
});

export default app;