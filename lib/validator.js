 
// // Validate a single server
// import Server from "../models/Server.js";
// import net from "net";

// // 🔹 Configurable constants
// const TIMEOUT = 10000;          // TCP timeout in ms
// const TOP_SERVERS = 120;        // Keep top N servers
// const CONCURRENT_WORKERS = 50;  // Number of servers to check simultaneously

// // 🔹 TCP check function
// const checkTCP = (host, port, timeout = TIMEOUT) => {
//   return new Promise((resolve) => {
//     const socket = new net.Socket();
//     let done = false;

//     socket.setTimeout(timeout);

//     socket.on("connect", () => {
//       if (!done) { done = true; socket.destroy(); resolve(true); }
//     });

//     socket.on("error", () => {
//       if (!done) { done = true; socket.destroy(); resolve(false); }
//     });

//     socket.on("timeout", () => {
//       if (!done) { done = true; socket.destroy(); resolve(false); }
//     });

//     socket.connect(port, host);
//   });
// };

// // 🔹 Validate a single server
// const validateServer = async (link) => {
//   const safeLink = link.replace(/^(vless|vmess):\/\//, "http://");

//   let parsed;
//   try {
//     parsed = new URL(safeLink);
//   } catch {
//     return null;
//   }

//   const host = parsed.hostname;
//   const port = parsed.port ? parseInt(parsed.port) : 443;

//   const alive = await checkTCP(host, port);

//   try {
//     await Server.updateOne(
//       { link },
//       {
//         $set: { link, host, port, valid: alive, lastSeen: new Date(), source: "scraper" },
//         $inc: { score: alive ? 1 : -1, deadCount: alive ? -1 : 1 }
//       },
//       { upsert: true }
//     );

//     // Remove servers dead 3+ times
//     if (!alive) await Server.deleteMany({ link, deadCount: { $gte: 3 } });
//   } catch (err) {
//     console.error(`DB update failed for ${host}:${port} → ${err.message}`);
//   }

//   return alive ? { host, port, link } : null;
// };

// // 🔹 Concurrent validation
// export const validateAll = async () => {
//   const servers = await Server.find({ valid: false });
//   const results = [];
//   let index = 0;

//   const workers = Array.from({ length: CONCURRENT_WORKERS }).map(async () => {
//     while (index < servers.length) {
//       const server = servers[index++];
//       const res = await validateServer(server.link);
//       if (res) results.push(res);
//     }
//   });

//   await Promise.all(workers);

//   // Deduplicate by host:port
//   const seen = new Set();
//   const uniqueServers = results.filter(s => {
//     const key = `${s.host}:${s.port}`;
//     if (seen.has(key)) return false;
//     seen.add(key);
//     return true;
//   });

//   // Keep only top N
//   if (uniqueServers.length > TOP_SERVERS) {
//     const toInvalidate = uniqueServers.slice(TOP_SERVERS).map(s => s.link);
//     await Server.updateMany({ link: { $in: toInvalidate } }, { $set: { valid: false } });
//   }

//   console.log(`✅ Validation completed. Top ${Math.min(uniqueServers.length, TOP_SERVERS)} servers kept.`);
// };
import Server from "../models/Server.js";
import net from "net";
import dns from "dns/promises";
import geoip from "geoip-lite";

// 🔹 Config
const TIMEOUT = 10000;
const TOP_SERVERS = 120;
const CONCURRENT_WORKERS = 50;

// 🔹 TCP check
const checkTCP = (host, port, timeout = TIMEOUT) =>
  new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;

    socket.setTimeout(timeout);
    socket.on("connect", () => { if (!done) { done = true; socket.destroy(); resolve(true); } });
    socket.on("error", () => { if (!done) { done = true; socket.destroy(); resolve(false); } });
    socket.on("timeout", () => { if (!done) { done = true; socket.destroy(); resolve(false); } });

    socket.connect(port, host);
  });

// 🔹 Resolve host → GeoIP
const getGeo = async (host) => {
  try {
    const ip = await dns.lookup(host).then(r => r.address);
    const geo = geoip.lookup(ip) || {};
    return { ip, country: geo.country || "Unknown", region: geo.city || geo.region || "Unknown", timezone: geo.timezone || "Unknown" };
  } catch {
    return { ip: host, country: "Unknown", region: "Unknown", timezone: "Unknown" };
  }
};

// 🔹 Validate a single server
export const validateServer = async (link) => {
  const protocol = link.startsWith("vless://") ? "vless" : "vmess";

  const match = link.match(/@(.*):(\d+)/);
  if (!match) return null;

  const host = match[1];
  const port = parseInt(match[2]);

  const start = Date.now();
  const alive = await checkTCP(host, port);
  const responseTime = alive ? Date.now() - start : 0;

  const geo = await getGeo(host);

  try {
    await Server.updateOne(
      { link },
      {
        $set: {
          link, host, port, valid: alive, lastSeen: new Date(), source: "scraper",
          responseTime, protocol,
          country: geo.country,
          region: geo.region,
          timezone: geo.timezone,
        },
        $inc: { score: alive ? 1 : -1, deadCount: alive ? -1 : 1 },
      },
      { upsert: true }
    );

    if (!alive) await Server.deleteMany({ link, deadCount: { $gte: 3 } });
  } catch (err) {
    console.error(`DB update failed for ${host}:${port} → ${err.message}`);
  }

  return alive ? { link, host, port, protocol, responseTime, country: geo.country, region: geo.region, timezone: geo.timezone } : null;
};

// 🔹 Concurrent validation for all servers
export const validateAll = async () => {
  const servers = await Server.find();
  const results = [];
  let index = 0;

  const workers = Array.from({ length: CONCURRENT_WORKERS }).map(async () => {
    while (index < servers.length) {
      const server = servers[index++];
      const res = await validateServer(server.link);
      if (res) results.push(res);
    }
  });

  await Promise.all(workers);

  // Deduplicate by host:port
  const seen = new Set();
  const uniqueServers = results.filter(s => {
    const key = `${s.host}:${s.port}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (uniqueServers.length > TOP_SERVERS) {
    const toInvalidate = uniqueServers.slice(TOP_SERVERS).map(s => s.link);
    await Server.updateMany({ link: { $in: toInvalidate } }, { $set: { valid: false } });
  }

  console.log(`✅ Validation completed. Top ${Math.min(uniqueServers.length, TOP_SERVERS)} servers kept.`);
};
