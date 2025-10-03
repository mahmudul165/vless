 

// import { TelegramClient } from "telegram";
// import { StringSession } from "telegram/sessions";
// import Server from "../models/Server.js";

// const TELEGRAM_CHANNELS = [
//   "V2Nodes",
//   "V2RayTz",
//   "V2Good",
//   "v2ray_free_conf",
//   "alphaconfigs",
//   "Super_v2ray24",
//   "v2ray_configs_pools",
//   "ConfigMAHSA",
//   "v2raysh",
//   // add more active channels here
// ];

// export async function scrapeTelegram() {
//   const apiId = parseInt(process.env.TELEGRAM_API_ID, 10);
//   const apiHash = process.env.TELEGRAM_API_HASH;
//   const stringSession = new StringSession(process.env.TELEGRAM_SESSION || ""); // persist session if available

//   const client = new TelegramClient(stringSession, apiId, apiHash, {
//     connectionRetries: 5,
//   });

//   await client.start({
//     phoneNumber: async () => process.env.TELEGRAM_PHONE_NUMBER,
//     password: async () => process.env.TELEGRAM_2FA_PASSWORD || "",
//     phoneCode: async () => {
//       console.log("Enter the code sent to your Telegram:");
//       return await new Promise((resolve) => {
//         process.stdin.once("data", (data) => resolve(data.toString().trim()));
//       });
//     },
//     onError: console.error,
//   });

//   console.log("✅ Telegram client started");

//   const allLinks = [];

//   for (const channel of TELEGRAM_CHANNELS) {
//     try {
//       console.log(`📥 Scraping channel: ${channel}`);
//       const messages = await client.getMessages(channel, { limit: 50 });

//       for (const msg of messages) {
//         const text = msg.message || "";
//         const matched = [
//           ...(text.match(/vless:\/\/[^\s]+/g) || []),
//           ...(text.match(/vmess:\/\/[^\s]+/g) || []),
//         ];

//         for (const link of matched) {
//           allLinks.push(link);

//           try {
//             await Server.updateOne(
//               { link },
//               { link, source: "telegram", lastSeen: new Date(), valid: false },
//               { upsert: true }
//             );
//           } catch (err) {
//             console.error("❌ MongoDB error:", err.message);
//           }
//         }
//       }
//     } catch (err) {
//       console.error(`⚠️ Error scraping ${channel}:`, err.message);
//     }
//   }

//   console.log(`✅ Scraped total ${allLinks.length} links`);
//   return [...new Set(allLinks)]; // deduplicate before return
// }




import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import Server from "../models/Server.js";
import fetch from "node-fetch";

const TELEGRAM_CHANNELS = [
  "V2Nodes",
  "V2RayTz",
  "V2Good",
  "v2ray_free_conf",
  "alphaconfigs",
  "Super_v2ray24",
  "v2ray_configs_pools",
  "ConfigMAHSA",
  "v2raysh",
  // add more active channels here
];

// ✅ Simple validator for links
async function validateLink(link) {
  try {
    // Example: try to connect to a test site through proxy (basic validation)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch("https://www.google.com", {
      agent: null, // <-- you can attach socks/http agent if needed
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return res.status === 200;
  } catch {
    return false;
  }
}

export async function scrapeTelegram() {
  const apiId = parseInt(process.env.TELEGRAM_API_ID, 10);
  const apiHash = process.env.TELEGRAM_API_HASH;
  const stringSession = new StringSession(process.env.TELEGRAM_SESSION || "");

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => process.env.TELEGRAM_PHONE_NUMBER,
    password: async () => process.env.TELEGRAM_2FA_PASSWORD || "",
    phoneCode: async () => {
      console.log("Enter the code sent to your Telegram:");
      return await new Promise((resolve) => {
        process.stdin.once("data", (data) => resolve(data.toString().trim()));
      });
    },
    onError: console.error,
  });

  console.log("✅ Telegram client started");

  const allLinks = [];

  for (const channel of TELEGRAM_CHANNELS) {
    try {
      console.log(`📥 Scraping channel: ${channel}`);
      const messages = await client.getMessages(channel, { limit: 50 });

      for (const msg of messages) {
        const text = msg.message || "";
        const matched = [
          ...(text.match(/vless:\/\/[^\s]+/g) || []),
          ...(text.match(/vmess:\/\/[^\s]+/g) || []),
        ];

        for (const link of matched) {
          allLinks.push(link);

          try {
            // Validate server before saving
            const isValid = await validateLink(link);

            await Server.updateOne(
              { link },
              { link, source: "telegram", lastSeen: new Date(), valid: isValid },
              { upsert: true }
            );
          } catch (err) {
            console.error("❌ MongoDB error:", err.message);
          }
        }
      }
    } catch (err) {
      console.error(`⚠️ Error scraping ${channel}:`, err.message);
    }
  }

  console.log(`✅ Scraped total ${allLinks.length} links`);

  // ✅ Keep only 100 recent valid servers
  await Server.deleteMany({ valid: false }); // remove invalid
  const validServers = await Server.find({ valid: true })
    .sort({ lastSeen: -1 })
    .limit(100);

  console.log(`✅ Stored ${validServers.length} valid servers (latest 100)`);

  return validServers;
}
