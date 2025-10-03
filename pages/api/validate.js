// import { connectDB } from "../../lib/db.js";
// import { validateAll } from "../../lib/validator.js";

// export default async function handler(req, res) {
//   await connectDB();
//   await validateAll();
//   res.status(200).json({ success: true });
// }
import { connectDB } from "../../lib/db.js";
import { validateAll } from "../../lib/validator.js";
import Server from "../../models/Server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    await connectDB();
    await validateAll();

    const validServers = await Server.find({ valid: true })
      .sort({ lastSeen: -1 })
      .limit(10);

    const totalValid = await Server.countDocuments({ valid: true });

    res.status(200).json({
      success: true,
      totalValid,
      servers: validServers,
    });
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}
