 

// import { connectDB } from "../../lib/db.js";
// import { validateAll } from "../../lib/validator.js";
// import Server from "../../models/Server.js";

// // Simple in-memory cache
// let cachedServers = [];
// let lastCacheTime = 0;
// const CACHE_TTL = 15 * 1000; // 15 seconds

// export default async function handler(req, res) {
//   if (req.method !== "GET") {
//     return res.status(405).json({ success: false, message: "Method not allowed" });
//   }

//   try {
//     await connectDB();

//     const now = Date.now();

//     // If cache is expired, refresh in background
//     if (now - lastCacheTime > CACHE_TTL) {
//       lastCacheTime = now;

//       // Run async validation without blocking response
//       validateAll().catch(err => console.error("Background validation error:", err));

//       // Update cache with current top servers from DB
//       cachedServers = await Server.find({ valid: true })
//         .sort({ score: -1, lastSeen: -1 })
//         .limit(50)
//         .select("link host port -_id")
//         .lean();
//     }

//     const totalValid = await Server.countDocuments({ valid: true });

//     res.status(200).json({
//       success: true,
//       totalValid,
//       servers: cachedServers,
//     });

//   } catch (err) {
//     console.error("API error:", err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// }


// import { connectDB } from "../../lib/db.js";
// import { validateAll } from "../../lib/validator.js";
// import Server from "../../models/Server.js";

// // In-memory cache
// let cachedServers = [];
// let lastCacheTime = 0;
// const CACHE_TTL = 15 * 1000;

// export default async function handler(req, res) {
//   if (req.method !== "GET") {
//     return res.status(405).json({ success: false, message: "Method not allowed" });
//   }

//   try {
//     await connectDB();
//     const now = Date.now();

//     if (now - lastCacheTime > CACHE_TTL) {
//       lastCacheTime = now;
//       validateAll().catch(err => console.error("Background validation error:", err));

//       const allServers = await Server.find({ valid: true }).lean();

//       // Organize by country
//       const byCountry = {};
//       allServers.forEach(s => {
//         const key = s.country || "Unknown";
//         if (!byCountry[key]) byCountry[key] = [];
//         byCountry[key].push(s);
//       });

//       cachedServers = Object.entries(byCountry).map(([country, servers]) => ({
//         country,
//         emoji: country === "Unknown" ? "🏳️" : countryToEmoji(country),
//         servers,
//       }));
//     }

//     const totalValid = await Server.countDocuments({ valid: true });

//     res.status(200).json({
//       success: true,
//       timestamp: new Date(),
//       totalServers: totalValid,
//       byCountry: cachedServers,
//     });

//   } catch (err) {
//     console.error("API error:", err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// }

// // Quick country emoji mapper
// function countryToEmoji(country) {
//   const map = {
//     "Hong Kong": "🇭🇰",
//     "Germany": "🇩🇪",
//     "United States": "🇺🇸",
//     "France": "🇫🇷",
//     "Japan": "🇯🇵",
//   };
//   return map[country] || "🏳️";
// }
import { connectDB } from "../../lib/db.js";
import { validateAll } from "../../lib/validator.js";
import Server from "../../models/Server.js";

// In-memory cache
let cachedServersByCountry = [];
let lastCacheTime = 0;
const CACHE_TTL = 15 * 1000; // 15 seconds

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    await connectDB();
    const now = Date.now();

    // Refresh cache if expired
    if (now - lastCacheTime > CACHE_TTL) {
      lastCacheTime = now;

      // Validate in background
      validateAll().catch(err => console.error("Background validation error:", err));

      // Fetch top 300 valid servers
      const servers = await Server.find({ valid: true })
        .sort({ score: -1, lastSeen: -1 })
        .limit(300)
        .lean();

      // Group by country and limit 10 per country
      const countryMap = {};
      for (const srv of servers) {
        const country = srv.country || "Unknown";
        if (!countryMap[country]) countryMap[country] = [];
        if (countryMap[country].length < 10) countryMap[country].push(srv);
      }

      cachedServersByCountry = Object.entries(countryMap).map(([country, servers]) => ({
        country,
        emoji: countryToEmoji(country),
        servers: servers.map(s => ({
          protocol: s.link.startsWith("vmess://") ? "vmess" : "vless",
          ip: s.host,
          port: s.port,
          responseTime: s.responseTime || "N/A",
          location: s.location || "Unknown",
          netflixRegion: s.netflixRegion || "N/A",
          timezone: s.timezone || "N/A",
          organization: s.organization || "N/A",
          isp: s.isp || "N/A",
          link: s.link,
        }))
      }));
    }

    const totalServers = cachedServersByCountry.reduce((acc, c) => acc + c.servers.length, 0);

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      totalServers,
      byCountry: cachedServersByCountry,
    });

  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// Map country names to emojis
function countryToEmoji(country) {
  const map = {
    "Hong Kong": "🇭🇰",
    "Germany": "🇩🇪",
    "United States": "🇺🇸",
    "France": "🇫🇷",
    "Japan": "🇯🇵",
    "Unknown": "🏳️",
  };
  return map[country] || "🏳️";
}
