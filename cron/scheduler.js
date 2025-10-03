// Node.js only
import cron from "node-cron";
import fetch from "node-fetch";

export const startCron = () => {
  cron.schedule("*/5 * * * *", async () => {
    console.log("🕒 Running scraper + validator every 5 min");

    try {
      await fetch("http://localhost:3000/api/scrape");
      await fetch("http://localhost:3000/api/validate");
    } catch (err) {
      console.error("Cron error:", err.message);
    }
  });
};
