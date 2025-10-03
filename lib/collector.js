// import fetch from "node-fetch";
// import Server from "../models/Server.js";

// export const VLESS_REGEX = /vless:\/\/[^\s]+/g;
// export const VMESS_REGEX = /vmess:\/\/[^\s]+/g;

// export const scrapeLinks = async () => {
//   // Example: scrape a GitHub raw URL
//   const urls = [
//     "https://raw.githubusercontent.com/barry-far/V2ray-Config/main/Splitted-By-Protocol/vless.txt",
//     // "https://raw.githubusercontent.com/barry-far/V2ray-Config/main/Splitted-By-Protocol/vless.txt",
//     // "https://raw.githubusercontent.com/ebrasha/free-v2ray-public-list/refs/heads/main/all_extracted_configs.txt",
//     // "https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/filtered/subs/vless.txt",
//     // You can add more URLs here
//   ];
  

//   let allLinks = [];

//   for (const url of urls) {
//     try {
//       const res = await fetch(url);
//       const text = await res.text();

//       const vless = text.match(VLESS_REGEX) || [];
//       const vmess = text.match(VMESS_REGEX) || [];

//       allLinks.push(...vless, ...vmess);
//     } catch (err) {
//       console.error("Scrape error:", err.message);
//     }
//   }

//   // Deduplicate
//   allLinks = [...new Set(allLinks)];

//   // Save to MongoDB if not exists
//   for (const link of allLinks) {
//     try {
//       await Server.updateOne(
//         { link },
//         { link, valid: false, lastSeen: new Date() },
//         { upsert: true }
//       );
//     } catch (err) {
//       console.error("MongoDB error:", err.message);
//     }
//   }

//   return allLinks;
// };








// import fetch from "node-fetch";
// import net from "net";
// import Server from "../models/Server.js";

// export const VLESS_REGEX = /vless:\/\/[^\s]+/g;
// export const VMESS_REGEX = /vmess:\/\/[^\s]+/g;

// // 🔹 Basic TCP ping test
// const checkServerAlive = (host, port, timeout = 5000) => {
//   return new Promise((resolve) => {
//     const socket = new net.Socket();

//     socket.setTimeout(timeout);
//     socket.on("connect", () => {
//       socket.destroy();
//       resolve(true);
//     });
//     socket.on("error", () => resolve(false));
//     socket.on("timeout", () => {
//       socket.destroy();
//       resolve(false);
//     });

//     socket.connect(port, host);
//   });
// };

// export const scrapeLinks = async () => {
//   const urls = [
//     "https://raw.githubusercontent.com/barry-far/V2ray-Config/main/Splitted-By-Protocol/vless.txt",
//     "https://raw.githubusercontent.com/M-Mashreghi/Free-V2ray-Collector/main/Splitted-By-Protocol/vless.txt",
//     "https://raw.githubusercontent.com/Epodonios/v2ray-configs/main/All_Configs_Sub.txt",
//   ];

//   let allLinks = [];

//   for (const url of urls) {
//     try {
//       const res = await fetch(url);
//       const text = await res.text();

//       const vless = text.match(VLESS_REGEX) || [];
//       const vmess = text.match(VMESS_REGEX) || [];

//       allLinks.push(...vless, ...vmess);
//     } catch (err) {
//       console.error("Scrape error:", err.message);
//     }
//   }

//   // 🔹 Deduplicate
//   allLinks = [...new Set(allLinks)];

//   // 🔹 Validate each link
//   for (const link of allLinks) {
//     try {
//       const parsed = new URL(link.replace("vless://", "http://").replace("vmess://", "http://"));
//       const host = parsed.hostname;
//       const port = parsed.port || (parsed.protocol.includes("443") ? 443 : 80);

//       const isAlive = await checkServerAlive(host, port);

//       await Server.updateOne(
//         { link },
//         {
//           link,
//           valid: isAlive,
//           lastSeen: new Date(),
//           source: "scraper",
//         },
//         { upsert: true }
//       );

//       console.log(`${isAlive ? "✅" : "❌"} ${host}:${port}`);
//     } catch (err) {
//       console.error("Validation error:", err.message);
//     }
//   }

//   // 🔹 Keep only top 10 valid servers
//   try {
//     const validServers = await Server.find({ valid: true }).sort({ lastSeen: -1 });
//     if (validServers.length > 10) {
//       const toRemove = validServers.slice(10).map((s) => s._id);
//       await Server.deleteMany({ _id: { $in: toRemove } });
//       console.log(`✅ Kept top 10 valid servers, removed ${toRemove.length} old ones`);
//     }
//   } catch (err) {
//     console.error("Cleanup error:", err.message);
//   }

//   return allLinks;
// };




import fetch from "node-fetch"; 
import net from "net";
import Server from "../models/Server.js";

export const VLESS_REGEX = /vless:\/\/[^\s]+/g;
export const VMESS_REGEX = /vmess:\/\/[^\s]+/g;

// 🔹 Basic TCP ping test
const checkServerAlive = (host, port, timeout = 5000) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(timeout);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
};

export const scrapeLinks = async () => {
  const urls = [
    "https://raw.githubusercontent.com/barry-far/V2ray-Config/main/Splitted-By-Protocol/vless.txt",
    "https://raw.githubusercontent.com/M-Mashreghi/Free-V2ray-Collector/main/Splitted-By-Protocol/vless.txt",
    "https://raw.githubusercontent.com/Epodonios/v2ray-configs/main/All_Configs_Sub.txt",
  ];

  let allLinks = [];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      const text = await res.text();

      const vless = text.match(VLESS_REGEX) || [];
      const vmess = text.match(VMESS_REGEX) || [];

      allLinks.push(...vless, ...vmess);
    } catch (err) {
      console.error("Scrape error:", err.message);
    }
  }

  // 🔹 Deduplicate
  allLinks = [...new Set(allLinks)];

  // 🔹 Validate each link
  for (const link of allLinks) {
    try {
      const parsed = new URL(
        link.replace("vless://", "http://").replace("vmess://", "http://")
      );
      const host = parsed.hostname;
      const port = parsed.port || (parsed.protocol.includes("443") ? 443 : 80);

      const isAlive = await checkServerAlive(host, port);

      await Server.updateOne(
        { link },
        {
          link,
          valid: isAlive,
          lastSeen: new Date(),
          source: "scraper",
        },
        { upsert: true }
      );

      console.log(`${isAlive ? "✅" : "❌"} ${host}:${port}`);
    } catch (err) {
      console.error("Validation error:", err.message);
    }
  }

  // 🔹 Keep only top 100 valid servers
  try {
    const validServers = await Server.find({ valid: true }).sort({ lastSeen: -1 });
    if (validServers.length > 100) {
      const toRemove = validServers.slice(100).map((s) => s._id);
      await Server.deleteMany({ _id: { $in: toRemove } });
      console.log(`✅ Kept top 100 valid servers, removed ${toRemove.length} old ones`);
    }
  } catch (err) {
    console.error("Cleanup error:", err.message);
  }

  return allLinks;
};
