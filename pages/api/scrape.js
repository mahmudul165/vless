 
// import { connectDB } from "../../lib/db.js";
// import { scrapeLinks } from "../../lib/collector.js";
// import { scrapeTelegram } from "../../lib/telegramCollector.js"; // optional Telegram scraper
// import Server from "../../models/Server.js";

// export default async function handler(req, res) {
//   try {
//     await connectDB();

//     // Run scrapers
//     const webLinks = await scrapeLinks();
//     const tgLinks = await scrapeTelegram(); // comment this if you don’t want Telegram
//     const allLinks = [...new Set([...webLinks, ...tgLinks])];

//     // Fetch from DB to include validation status
//     const servers = await Server.find({ link: { $in: allLinks } })
//       .sort({ lastSeen: -1 })
//       .lean();

//     res.status(200).json({
//       success: true,
//       count: servers.length,
//       servers,
//     });
//   } catch (err) {
//     console.error("❌ API error:", err.message);
//     res.status(500).json({ success: false, error: err.message });
//   }
// }


import { connectDB } from "../../lib/db.js";
import { scrapeLinks } from "../../lib/collector.js";
import { scrapeTelegram } from "../../lib/telegramCollector.js"; 
import Server from "../../models/Server.js";

export default async function handler(req, res) {
  try {
    await connectDB();

    // Scrape
    const webLinks = await scrapeLinks();
    const tgLinks = (await scrapeTelegram()) || [];
    const allLinks = [...new Set([...webLinks, ...tgLinks])];

    console.log(`🟢 Scraped ${webLinks.length} web links, ${tgLinks.length} Telegram links`);
    console.log(`✅ Total unique links: ${allLinks.length}`);

    // Upsert all scraped links (new links are invalid by default)
    await Promise.allSettled(
      allLinks.map(link => 
        Server.updateOne({ link }, { link, valid: false, source: "scraper" }, { upsert: true })
      )
    );

    // Fetch existing valid servers
    let servers = await Server.find({ link: { $in: allLinks }, valid: true })
      .sort({ lastSeen: -1 })
      .lean();

    // Limit to top 100
    if (servers.length > 100) {
      const extraServers = servers.slice(100);
      await Server.updateMany(
        { link: { $in: extraServers.map(s => s.link) } },
        { valid: false }
      );
    }

    const finalServers = await Server.find({ valid: true })
      .sort({ lastSeen: -1 })
      .limit(100)
      .lean();

    console.log(`💾 Final valid servers returned: ${finalServers.length}`);

    res.status(200).json({
      success: true,
      count: finalServers.length,
      servers: finalServers,
    });
  } catch (err) {
    console.error("❌ API error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}
