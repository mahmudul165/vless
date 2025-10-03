import Server from "../models/Server.js";
import net from "net";

// Configurable options
const TIMEOUT = 10000; // 10s
const TOP_SERVERS = 120; // Keep top 50 servers

// TCP check with detailed logging
const checkServerAlive = (host, port, timeout = TIMEOUT) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);

    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.on("error", (err) => {
      console.log(`${host}:${port} → ❌ Error: ${err.code || err.message}`);
      resolve(false);
    });

    socket.on("timeout", () => {
      console.log(`${host}:${port} → ❌ Timeout`);
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
};

// Validate a single server link
export const validateLink = async (link) => {
  const safeLink = link.replace(/^(vless|vmess):\/\//, "http://");

  let parsed;
  try {
    parsed = new URL(safeLink);
  } catch (err) {
    console.error(`Invalid link: ${link}`);
    return false;
  }

  const host = parsed.hostname;
  const port = parsed.port ? parseInt(parsed.port) : 443;

  const isAlive = await checkServerAlive(host, port);

  await Server.updateOne(
    { link },
    {
      link,
      host,
      port,
      valid: isAlive,
      lastSeen: new Date(),
      source: "scraper",
      $inc: { score: isAlive ? 1 : -1 } // reliability scoring
    },
    { upsert: true }
  );

  console.log(`Checked ${host}:${port} → ${isAlive ? "✅ Alive" : "❌ Dead"}`);
  return isAlive;
};

// Validate all servers and keep top N unique valid servers
export const validateAll = async () => {
  const servers = await Server.find({ valid: false });

  // Validate all in parallel
  await Promise.allSettled(servers.map(s => validateLink(s.link)));

  // Get all valid servers
  let validServers = await Server.find({ valid: true }).sort({ score: -1, lastSeen: -1 });

  // Deduplicate by host:port
  const seen = new Set();
  validServers = validServers.filter(s => {
    const key = `${s.host}:${s.port}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Keep only top N servers
  if (validServers.length > TOP_SERVERS) {
    const toInvalidate = validServers.slice(TOP_SERVERS);
    await Server.updateMany(
      { _id: { $in: toInvalidate.map(s => s._id) } },
      { $set: { valid: false } }
    );
  }

  console.log(`✅ Validation completed. Top ${Math.min(validServers.length, TOP_SERVERS)} servers kept.`);
  console.log(`💡 Current valid servers: ${validServers.map(s => `${s.host}:${s.port}`).join(", ")}`);
};
