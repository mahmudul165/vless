import mongoose from "mongoose";

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) return;

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in .env.local");
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "v2collector",        // Atlas DB name
      serverSelectionTimeoutMS: 5000,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    isConnected = true;
    console.log("✅ MongoDB Atlas connected");
  } catch (error) {
    console.error("MongoDB Atlas connection error:", error.message);
    throw error;
  }
};
