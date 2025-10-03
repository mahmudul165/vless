const fs = require('fs');
const path = require('path');

const files = {
  "package.json": `
{
  "name": "next-v2collector",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "mongoose": "^7.5.0",
    "node-fetch": "^3.3.2",
    "node-cron": "^3.0.2",
    "ws": "^8.13.0",
    "telegram": "^1.13.0",
    "input": "^1.0.1"
  }
}
  `,
  ".env.example": `
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/v2collector
TELEGRAM_API_ID=123456
TELEGRAM_API_HASH=abcdef123456
TELEGRAM_PHONE_NUMBER=+8801xxxxxxx
  `,
  "lib/db.js": `
import mongoose from "mongoose";
let isConnected = false;
export const connectDB = async () => {
  if (isConnected) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "v2collector" });
  isConnected = true;
  console.log("✅ MongoDB connected");
};
  `,
  "models/Server.js": `
import mongoose from "mongoose";
const ServerSchema = new mongoose.Schema({
  link: { type: String, unique: true, required: true },
  type: { type: String },
  valid: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  source: { type: String },
});
export default mongoose.models.Server || mongoose.model("Server", ServerSchema);
  `,
  "lib/validator.js": `
import net from "net";
import WebSocket from "ws";
export const validateTCP = (host, port = 443, timeout = 2000) =>
  new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.on("connect", () => { socket.destroy(); resolve(true); });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => resolve(false));
    socket.connect(port, host);
  });
export const validateWS = (url, timeout = 3000) =>
  new Promise((resolve) => {
    const ws = new WebSocket(url, { handshakeTimeout: timeout });
    ws.on("open", () => { ws.terminate(); resolve(true); });
    ws.on("error", () => resolve(false));
    setTimeout(() => resolve(false), timeout);
  });
export const parseLink = (link) => {
  try {
    if (link.startsWith("vless://")) return { type: "vless", host: new URL(link).hostname };
    if (link.startsWith("vmess://")) return { type: "vmess", host: new URL(link).hostname };
  } catch {}
  return { type: "unknown", host: "" };
};
  `,
  "lib/collector.js": `
// Full collector code including Telegram, GitHub, Pastebin
import fetch from "node-fetch";
import Server from "../models/Server";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import input from "input";

export const VLESS_REGEX = /vless:\\/\\/[^\s]+/g;
export const VMESS_REGEX = /vmess:\\/\\/[^\s]+/g;

export const saveLinksToDB = async (links) => {
  for (let { link, source } of links) {
    try {
      await Server.findOneAndUpdate(
        { link },
        { link, source, lastSeen: new Date() },
        { upsert: true }
      );
    } catch (err) { console.error("DB save error:", err.message); }
  }
};

export const fetchFromGitHub = async (urls = []) => {
  let results = [];
  for (let url of urls) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      const links = [...text.matchAll(VLESS_REGEX), ...text.matchAll(VMESS_REGEX)];
      links.forEach(m => results.push({ link: m[0], source: "github" }));
    } catch (err) { console.error("GitHub fetch error:", err.message); }
  }
  return results;
};

export const fetchFromPastebin = async (urls = []) => {
  let results = [];
  for (let url of urls) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      const links = [...text.matchAll(VLESS_REGEX), ...text.matchAll(VMESS_REGEX)];
      links.forEach(m => results.push({ link: m[0], source: "pastebin" }));
    } catch (err) { console.error("Pastebin fetch error:", err.message); }
  }
  return results;
};

export const fetchFromTelegram = async (channels = []) => {
  const results = [];
  if (!process.env.TELEGRAM_API_ID || !process.env.TELEGRAM_API_HASH) return results;

  const apiId = parseInt(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;
  const stringSession = new StringSession("");

  const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
  await client.start({
    phoneNumber: async () => process.env.TELEGRAM_PHONE_NUMBER,
    password: async () => await input.text("Telegram password: "),
    phoneCode: async () => await input.text("Enter code: "),
    onError: (err) => console.error(err),
  });
  console.log("✅ Telegram client started");

  for (let channel of channels) {
    try {
      const entity = await client.getEntity(channel);
      const messages = await client.getMessages(entity, { limit: 50 });
      messages.forEach(msg => {
        if (!msg.message) return;
        [...msg.message.matchAll(VLESS_REGEX), ...msg.message.matchAll(VMESS_REGEX)]
          .forEach(m => results.push({ link: m[0], source: channel }));
      });
    } catch (err) { console.error("Telegram fetch error:", err.message); }
  }

  await saveLinksToDB(results);
  return results;
};
  `,
  "pages/api/scrape.js": `
import { connectDB } from "../../lib/db";
import { fetchFromGitHub, fetchFromPastebin, fetchFromTelegram, saveLinksToDB } from "../../lib/collector";

export default async function handler(req, res) {
  await connectDB();
  const githubUrls = ["https://raw.githubusercontent.com/user/repo/main/config.txt"];
  const pastebinUrls = ["https://pastebin.com/raw/xyz123"];
  const telegramChannels = ["@freev2raychannel"];
  let allLinks = [];
  allLinks.push(...await fetchFromGitHub(githubUrls));
  allLinks.push(...await fetchFromPastebin(pastebinUrls));
  allLinks.push(...await fetchFromTelegram(telegramChannels));
  await saveLinksToDB(allLinks);
  res.status(200).json({ message: "Scraping complete", total: allLinks.length });
}
  `,
  "pages/api/validate.js": `
import { connectDB } from "../../lib/db";
import Server from "../../models/Server";
import { validateTCP, validateWS, parseLink } from "../../lib/validator";

export default async function handler(req, res) {
  await connectDB();
  const pendingLinks = await Server.find({ valid: false });
  for (let server of pendingLinks) {
    const { host, type } = parseLink(server.link);
    let isValid = false;
    try { if (type === "vless") isValid = await validateTCP(host, 443); if (type === "vmess") isValid = await validateWS(server.link); } catch {}
    server.valid = isValid; server.lastSeen = new Date(); await server.save();
  }
  res.status(200).json({ message: "Validation complete" });
}
  `,
  "pages/api/servers.js": `
import { connectDB } from "../../lib/db";
import Server from "../../models/Server";

export default async function handler(req, res) {
  await connectDB();
  const { valid = "1" } = req.query;
  const servers = await Server.find({ valid: valid === "1" }).sort({ lastSeen: -1 });
  res.status(200).json(servers);
}
  `,
  "cron/scheduler.js": `
import cron from "node-cron";
import fetch from "node-fetch";

export const startScheduler = () => {
  cron.schedule("*/5 * * * *", async () => {
    try {
      console.log("⏱️ Scheduler running scrape + validate");
      await fetch("http://localhost:3000/api/scrape");
      await fetch("http://localhost:3000/api/validate");
    } catch (err) { console.error("Scheduler error:", err.message); }
  });
};
  `,
  "pages/_app.js": `
import { startScheduler } from '../cron/scheduler'
if (typeof window === "undefined") startScheduler();
export default function App({ Component, pageProps }) { return <Component {...pageProps} />; }
  `
};

// Create folders
["lib", "models", "pages/api", "cron"].forEach(dir => fs.mkdirSync(dir, { recursive: true }));

// Write files
for (let file in files) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, files[file].trim());
}

console.log("✅ Next.js 15 V2Collector project generated successfully!");
