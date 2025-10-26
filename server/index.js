const WebSocket = require('ws');
// Create a WebSocket server
const wss = new WebSocket.Server({ port: 8080 });
const users = new Map(); // Map<userId, WebSocket>

wss.on('connection', (ws) => {
  console.log('✅ New client connected');

  // When the server receives a message from a client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Step 1: Register user
      if (data.type === 'init') {
        const userId = data.userId;
        users.set(userId, ws);
        ws.userId = userId; // store for easy cleanup later
        console.log(`🟢 User connected: ${userId}`);
        ws.send(`Welcome ${userId}!`);
      }

      // Step 2: Send message to another user
      else if (data.type === 'message') {
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

    } catch (err) {
      console.error('Invalid message format', err);
    }
  });

  // Step 3: Handle disconnect
  ws.on('close', () => {
    if (ws.userId) {
      users.delete(ws.userId);
      console.log(`❌ User disconnected: ${ws.userId}`);
    }
  });
});

console.log('🚀 WebSocket server running on ws://localhost:8080');
