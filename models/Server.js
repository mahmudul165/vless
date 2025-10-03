 
// import mongoose from "mongoose";

// const serverSchema = new mongoose.Schema({
//   link: {
//     type: String,
//     required: true,
//     unique: true,
//   },
//   host: String,
//   port: Number,
//   source: {
//     type: String,
//     default: "telegram",
//   },
//   valid: {
//     type: Boolean,
//     default: false,
//   },
//   lastSeen: {
//     type: Date,
//     default: Date.now,
//   },
//   score: {
//     type: Number,
//     default: 0,
//   },
//   deadCount: {
//     type: Number,
//     default: 0,
//   },
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
  protocol: { type: String, default: "vmess" },
  host: String,
  port: Number,
  source: { type: String, default: "telegram" },
  valid: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  score: { type: Number, default: 0 },
  deadCount: { type: Number, default: 0 },
  responseTime: { type: Number, default: 0 },
  country: { type: String, default: "Unknown" },
  region: { type: String, default: "Unknown" },
  timezone: { type: String, default: "Unknown" },
  organization: { type: String, default: "" },
  isp: { type: String, default: "" },
});

const Server = mongoose.models.Server || mongoose.model("Server", serverSchema);
export default Server;
