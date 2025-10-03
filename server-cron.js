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

// 🔹 Fetch endpoint with retry
async function runTask(endpoint, retries = 1, delay = 10000) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, { method: "GET", headers: { "Content-Type": "application/json" } });
    if (!res.ok) throw new Error(`Failed ${endpoint}: ${res.status} ${res.statusText}`);

    const data = await res.json();
    console.log(new Date().toISOString(), `✅ ${endpoint} completed:`, { count: data.count ?? data.links?.length ?? 0 });
    return data;
  } catch (err) {
    console.error(new Date().toISOString(), `❌ Error in ${endpoint}:`, err.message);
    if (retries > 0) {
      console.log(`⏳ Retrying ${endpoint} in ${delay / 1000}s...`);
      await new Promise(res => setTimeout(res, delay));
      return runTask(endpoint, retries - 1, delay);
    }
    return null;
  }
}

// 🔹 Run all tasks sequentially
async function runAll() {
  console.log(new Date().toISOString(), "🕒 Running scraper + validator...");
  await runTask("/api/scrape", 2);   // Retry twice if fails
  await runTask("/api/validate", 2); // Retry twice if fails
  console.log(new Date().toISOString(), "✅ Cycle finished\n");
}

// 🔹 Run immediately on startup
runAll().catch(err => console.error("Startup run failed:", err));

// 🔹 Schedule every 5 minutes
cron.schedule("*/5 * * * *", () => {
  runAll().catch(err => console.error("Scheduled run failed:", err));
});

console.log("✅ Cron scheduler started");

