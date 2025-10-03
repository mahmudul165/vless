// // models/Server.js
// import mongoose from "mongoose";

// const serverSchema = new mongoose.Schema({
//   link: { type: String, required: true, unique: true },
//   valid: { type: Boolean, default: false },
//   source: { type: String, default: "unknown" },
//   lastSeen: { type: Date, default: Date.now },
// });

// const Server = mongoose.models.Server || mongoose.model("Server", serverSchema);
// export default Server;
import mongoose from "mongoose";

const serverSchema = new mongoose.Schema({
  link: {
    type: String,
    required: true,
    unique: true,
  },
  source: {
    type: String,
    default: "telegram",
  },
  valid: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
});

const Server = mongoose.models.Server || mongoose.model("Server", serverSchema);
export default Server;
