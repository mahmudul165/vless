import { connectDB } from "../../lib/db.js";
import Server from "../../models/Server.js";

export default async function handler(req, res) {
  try {
    // Connect to MongoDB
    await connectDB();

    // Extract query params
    const { valid, source } = req.query;
    let query = {};

    // Only filter if valid is provided
    if (valid !== undefined) query.valid = valid === "1";

    // Only filter if source is provided
    if (source) query.source = source;

    // Fetch servers sorted by lastSeen descending
    const servers = await Server.find(query).sort({ lastSeen: -1 });

    res.status(200).json({ success: true, servers });
  } catch (error) {
    console.error("API /servers error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}
