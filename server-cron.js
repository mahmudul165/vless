// import cron from "node-cron";
// import fetch from "node-fetch";

// const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// cron.schedule("*/5 * * * *", async () => {
//   console.log("🕒 Running scraper + validator every 5 minutes");

//   try {
//     await fetch(`${BASE_URL}/api/scrape`);
//     await fetch(`${BASE_URL}/api/validate`);
//     console.log("✅ Cron finished successfully");
//   } catch (err) {
//     console.error("Cron error:", err.message);
//   }
// });

// console.log("✅ Cron scheduler started");


import cron from "node-cron";
import fetch from "node-fetch";

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

async function runTask(endpoint, retry = true) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) throw new Error(`Failed ${endpoint}: ${res.status} ${res.statusText}`);

    const data = await res.json();
    console.log(new Date().toISOString(), `✅ ${endpoint} completed:`, { count: data.count || data.links?.length || 0 });
  } catch (err) {
    console.error(new Date().toISOString(), `❌ Error in ${endpoint}:`, err.message);
    if (retry) {
      console.log("⏳ Retrying in 10 seconds...");
      setTimeout(() => runTask(endpoint, false), 10000);
    }
  }
}

async function runAll() {
  console.log(new Date().toISOString(), "🕒 Running scraper + validator...");
  await runTask("/api/scrape");
  await runTask("/api/validate");
  console.log(new Date().toISOString(), "✅ Cycle finished\n");
}

// Run immediately on startup
runAll();

// Schedule every 5 minutes
cron.schedule("*/5 * * * *", runAll);

console.log("✅ Cron scheduler started");
