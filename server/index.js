const WebSocket = require('ws');
const { publisher, subscriber } = require("./redisClient.js");

const wss = new WebSocket.Server({ port: 8080 });
const users = new Map(); // userId -> Set<WebSocket>

// ✅ Handle user registration
const handleRegistration = async (ws, data) => {
  if (data.type === 'init') {
    const userId = data.userId;

    if (!users.has(userId)) users.set(userId, new Set());
    users.get(userId).add(ws);
    ws.userId = userId;

    // ✅ Subscribe to Redis channel with callback directly
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
    console.log(`🟢 User connected: ${userId}`);
    ws.send(`Welcome ${userId}!`);
  }
};

// ✅ Handle direct message (publish via Redis)
const handleMessageTransfer = async (ws, data) => {
  if (data.type === 'message') {
    const { to, text } = data;

    const payload = JSON.stringify({
      from: ws.userId,
      to,
      text,
      ts: Date.now(),
    });

    // Publish message via Redis (so all servers receive it)
    await publisher.publish(`user:${to}`, payload);
  }
};


// ✅ Handle WebSocket lifecycle
wss.on('connection', (ws) => {
  console.log('✅ New client connected');

  ws.on('message', async (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'init') handleRegistration(ws, data);
      else if (data.type === 'message') await handleMessageTransfer(ws, data);
    } catch (err) {
      console.error('Invalid message format', err);
    }
  });

  ws.on('close', () => {
    if (ws.userId && users.has(ws.userId)) {
      const sockets = users.get(ws.userId);
      sockets.delete(ws);
      if (sockets.size === 0) {
        users.delete(ws.userId);
        subscriber.unsubscribe(`user:${ws.userId}`);
      }
      console.log(`❌ User disconnected: ${ws.userId}`);
    }
  });
});

console.log('🚀 WebSocket server running on ws://localhost:8080');