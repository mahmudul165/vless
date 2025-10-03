// import { connectDB } from "../../lib/db.js";
// import Server from "../../models/Server.js";

// export default async function handler(req, res) {
//   try {
//     await connectDB();

//     // Extract query params
//     const { valid, source, limit, skip } = req.query;

//     // Build query object
//     const query = {};
//     if (valid !== undefined) query.valid = valid === "1" || valid === "true";
//     if (source) query.source = source;

//     // Pagination options
//     const options = {
//       sort: { lastSeen: -1 },
//       limit: Math.min(parseInt(limit) || 100, 1000), // max 1000 to prevent huge queries
//       skip: parseInt(skip) || 0,
//     };

//     // Fetch servers
//     const servers = await Server.find(query, null, options).lean();

//     // Count total matching servers
//     const total = await Server.countDocuments(query);

//     res.status(200).json({
//       success: true,
//       total,
//       count: servers.length,
//       servers,
//     });
//   } catch (error) {
//     console.error("API /servers error:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// }



import { connectDB } from "../../lib/db.js";
import Server from "../../models/Server.js";

export default async function handler(req, res) {
  try {
    await connectDB();

    const { valid, source, limit, skip } = req.query;

    const query = {};
    if (valid !== undefined) query.valid = valid === "1" || valid === "true";
    if (source) query.source = source;

    const options = {
      sort: { lastSeen: -1 },
      limit: Math.min(parseInt(limit) || 100, 1000),
      skip: parseInt(skip) || 0,
    };

    const servers = await Server.find(query, null, options).lean();
    const total = await Server.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      count: servers.length,
      servers,
    });
  } catch (error) {
    console.error("API /servers/list error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}
