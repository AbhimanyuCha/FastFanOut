const WebSocket = require('ws');
const { publisher, subscriber, store } = require("./redisClient.js");

const SERVER_ID = process.env.SERVER_ID || "ws1";
const PORT = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port: PORT });
const users = new Map(); // userId -> Set<WebSocket>

// Helper: subscribe to friend channels
const subscribeToFriends = async (userId) => {
  const friends = await store.sMembers(`friends:${userId}`);
  for (const friendId of friends) {
    const isOnline = await store.sIsMember("online_users", friendId);
    if (isOnline) {
      await subscriber.subscribe(`user:${friendId}`, (message) => {
        const payload = JSON.parse(message);
        const sockets = users.get(userId);
        if (!sockets) return;
        for (const client of sockets) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(payload));
          }
        }
      });
    }
  }
};

// User registration
const handleRegistration = async (ws, data) => {
  if (data.type === 'init') {
    const userId = data.userId;

    if (!users.has(userId)) users.set(userId, new Set());
    users.get(userId).add(ws);
    ws.userId = userId;

    // mark user online in Redis
    await store.sAdd("online_users", userId);
    await store.set(`user:${userId}:server`, SERVER_ID);

    await subscriber.subscribe(`user:${userId}`, (message) => {
      const payload = JSON.parse(message);
      const sockets = users.get(userId);
      if (!sockets) return;
      for (const client of sockets) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(payload));
        }
      }
    });

    await subscribeToFriends(userId);

    console.log(`🟢 User ${userId} connected on ${SERVER_ID}`);
    ws.send(`Welcome ${userId}! You are on ${SERVER_ID}`);
  }
};

// Send message to another user
const handleMessageTransfer = async (ws, data) => {
  if (data.type === 'message') {
    const { to, text } = data;

    const payload = JSON.stringify({
      from: ws.userId,
      to,
      text,
      ts: Date.now(),
    });

    const receiverServer = await store.get(`user:${to}:server`);

    // Publish to the receiver's Redis channel
    await publisher.publish(`user:${to}`, payload);

    console.log(`📤 ${ws.userId} → ${to} via ${receiverServer}`);
  }
};

// WebSocket lifecycle
wss.on('connection', (ws) => {
  ws.on('message', async (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'init') await handleRegistration(ws, data);
      else if (data.type === 'message') await handleMessageTransfer(ws, data);
    } catch (err) {
      console.error('Invalid message format', err);
    }
  });

  ws.on('close', async () => {
    if (ws.userId && users.has(ws.userId)) {
      const sockets = users.get(ws.userId);
      sockets.delete(ws);
      if (sockets.size === 0) {
        users.delete(ws.userId);
        await store.sRem("online_users", ws.userId);
        await store.del(`user:${ws.userId}:server`);
        await subscriber.unsubscribe(`user:${ws.userId}`);
      }
      console.log(`❌ User disconnected: ${ws.userId}`);
    }
  });
});

console.log(`🚀 ${SERVER_ID} running on ws://localhost:${PORT}`);
