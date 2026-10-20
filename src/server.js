import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";
import { registerReminderJobs, startJobs } from "./services/job.service.js";

const PORT = process.env.PORT || 2020;

const startServer = async () => {
  try {
    await connectDB();

    // Register and start background jobs (reminders + unpaid booking expiration)
    registerReminderJobs({});
    await startJobs();

    app.listen(PORT, () => {
      console.log(`🚀🚀🚀 Server running on port  ✅✅✅🎉🎉🎉http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed ❌❌❌:", error.message);
    process.exit(1);
  }
};

startServer();
