const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
const users = new Map();
const { publisher, subscriber } = require("./redisClient.js");

const handleRegistration = (ws, data) => {
  if (data.type === 'init') {
    const userId = data.userId;
    users.set(userId, ws);
    ws.userId = userId; // store for easy cleanup later
    console.log(`🟢 User connected: ${userId}`);
    ws.send(`Welcome ${userId}!`);
  }
}

const handleMessageTransfer = (ws, data) => {
  if (data.type === 'message') {
    const { to, text } = data;
    const recipient = users.get(to);
    if (recipient && recipient.readyState === WebSocket.OPEN) {
      recipient.send(JSON.stringify({
        from: ws.userId,
        text,
      }));
    } else {
      ws.send(`❌ User ${to} is not connected.`);
    }
  }
}

wss.on('connection', (ws) => {
  console.log('✅ New client connected');

  // When the server receives a message from a client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleRegistration(ws, data);
      handleMessageTransfer(ws, data);
    } catch (err) {
      console.error('Invalid message format', err);
    }
  });

  ws.on('close', () => {
    if (ws.userId) {
      users.delete(ws.userId);
      console.log(`❌ User disconnected: ${ws.userId}`);
    }
  });
});

console.log('🚀 WebSocket server running on ws://localhost:8080');
