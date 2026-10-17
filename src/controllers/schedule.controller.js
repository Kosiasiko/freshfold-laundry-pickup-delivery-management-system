import Schedule from "../models/schedule.model.js";

const OPENING_TIME = "08:00";
const CLOSING_TIME = "18:00";

class ScheduleController {
  async createSchedule(req, res) {
    try {
      const { serviceType, date, startTime, endTime, capacity } = req.body;

      if (
        !serviceType ||
        !date ||
        !startTime ||
        !endTime ||
        capacity === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }

      if (!["pickup", "delivery"].includes(serviceType)) {
        return res.status(400).json({
          success: false,
          message: "Service type must be pickup or delivery",
        });
      }

      if (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Capacity must be a positive integer",
        });
      }

      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

      if (
        !datePattern.test(date) ||
        !timePattern.test(startTime) ||
        !timePattern.test(endTime)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid date or time format. Use YYYY-MM-DD and HH:mm",
        });
      }

      const parsedDate = new Date(`${date}T00:00:00Z`);

      if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== date
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid calendar date",
        });
      }

      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Africa/Lagos",
      });

      if (date < today) {
        return res.status(400).json({
          success: false,
          message: "Cannot schedule a slot in the past",
        });
      }

      if (
        startTime >= endTime ||
        startTime < OPENING_TIME ||
        endTime > CLOSING_TIME
      ) {
        return res.status(400).json({
          success: false,
          message: `Time slot must fall between ${OPENING_TIME} and ${CLOSING_TIME}`,
        });
      }

      if (date === today) {
        const currentTime = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Africa/Lagos",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(new Date());

        if (startTime <= currentTime) {
          return res.status(400).json({
            success: false,
            message: "Cannot schedule a slot in the past",
          });
        }
      }

      // Reject overlapping slots for the same service
      const overlapping = await Schedule.findOne({
        serviceType,
        date,
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
      });

      if (overlapping) {
        return res.status(409).json({
          success: false,
          message: "This time slot overlaps an existing slot",
        });
      }

      const schedule = await Schedule.create({
        serviceType,
        date,
        startTime,
        endTime,
        capacity: Number(capacity),
      });

      return res.status(201).json({
        success: true,
        message: "Schedule created successfully",
        data: schedule,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error creating schedule",
        error: error.message,
      });
    }
  }

  // Retrieve available slots
  async getSchedules(req, res) {
    try {
      const { serviceType, date } = req.query;

      const filter = {
        isAvailable: true,
        $expr: { $lt: ["$bookedCount", "$capacity"] },
      };

      if (serviceType) {
        if (!["pickup", "delivery"].includes(serviceType)) {
          return res.status(400).json({
            success: false,
            message: "Invalid service type",
          });
        }

        filter.serviceType = serviceType;
      }

      if (date) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return res.status(400).json({
            success: false,
            message: "Date must use YYYY-MM-DD format",
          });
        }

        filter.date = { $gte: date };
      } else {
        filter.date = { $gte: new Date().toLocaleDateString("en-CA", {
          timeZone: "Africa/Lagos",
        }) };
      }

      const schedules = await Schedule.find(filter).sort({
        date: 1,
        startTime: 1,
      });

      return res.status(200).json({
        success: true,
        count: schedules.length,
        data: schedules,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error retrieving schedules",
        error: error.message,
      });
    }
  }

  // Retrieve one slot
  async getScheduleById(req, res) {
    try {
      const schedule = await Schedule.findById(req.params.id);

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: "Schedule not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid schedule ID",
      });
    }
  }

  // Update a slot
  async updateSchedule(req, res) {
    try {
      const schedule = await Schedule.findById(req.params.id);

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: "Schedule not found",
        });
      }

      if (schedule.bookedCount > 0) {
        return res.status(409).json({
          success: false,
          message: "Cannot edit a slot with existing bookings",
        });
      }

      const allowedFields = [
        "serviceType",
        "date",
        "startTime",
        "endTime",
        "capacity",
        "isAvailable",
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          schedule[field] = req.body[field];
        }
      }

      await schedule.save();

      return res.status(200).json({
        success: true,
        message: "Schedule updated successfully",
        data: schedule,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Error updating schedule",
        error: error.message,
      });
    }
  }

  // Disable a slot
  async deleteSchedule(req, res) {
    try {
      const schedule = await Schedule.findById(req.params.id);

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: "Schedule not found",
        });
      }

      if (schedule.bookedCount > 0) {
        return res.status(409).json({
          success: false,
          message: "Cannot delete a slot with existing bookings",
        });
      }

      schedule.isAvailable = false;
      await schedule.save();

      return res.status(200).json({
        success: true,
        message: "Schedule disabled successfully",
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Error disabling schedule",
        error: error.message,
      });
    }
  }
}

export default new ScheduleController();

