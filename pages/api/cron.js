import cron from "node-cron";
import fetch from "node-fetch";

let started = false;

export default async function handler(req, res) {
  if (!started) {
    cron.schedule("*/5 * * * *", async () => {
      console.log("⏱️ Running scrape + validate...");
      try {
        await fetch("http://localhost:3000/api/scrape");
        await fetch("http://localhost:3000/api/validate");
      } catch (err) {
        console.error("Scheduler error:", err.message);
      }
    });
    started = true;
    console.log("✅ Cron scheduler started");
  }

  res.status(200).json({ message: "Scheduler running" });
}
