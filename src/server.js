import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";
import { getJwtSecret } from "./middleware/admin-auth.middleware.js";

const PORT = process.env.PORT || 2020;

const startServer = async () => {
  try {
    getJwtSecret();
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
