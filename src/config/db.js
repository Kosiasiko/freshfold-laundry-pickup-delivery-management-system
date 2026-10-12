import dns from "dns";
import mongoose from "mongoose";

dns.setServers([
    "1.1.1.1",
    "1.0.0.1",
]);

dns.setDefaultResultOrder("ipv4first");

const connectDB = async () => {
    try{
        const connection = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`Connection to Database successfully ✅✅✅`);
    }catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

export default connectDB