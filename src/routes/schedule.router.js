import express from "express";
import scheduleController from "../controllers/schedule.controller.js";

const router = express.Router();

router.post("/", scheduleController.createSchedule);
router.get("/", scheduleController.getSchedules);
router.get("/:id", scheduleController.getScheduleById);
router.patch("/:id", scheduleController.updateSchedule);
router.delete("/:id", scheduleController.deleteSchedule);

export default router;

