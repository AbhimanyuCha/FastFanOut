const { createClient } = require("redis");

const publisher = createClient({ url: "redis://localhost:6379" });
const subscriber = createClient({ url: "redis://localhost:6379" });
const store = createClient({ url: "redis://localhost:6379" });

async function initRedis() {
  try {
    await publisher.connect();
    await subscriber.connect();
    console.log("✅ Redis publisher & subscriber connected");
  } catch (err) {
    console.error("❌ Redis connection error:", err);
  }
}

initRedis();

module.exports = { publisher, subscriber, store };