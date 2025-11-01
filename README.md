⚙️ ## How to Run Two Servers

In two separate terminals:

SERVER_ID=ws1 PORT=8080 node wsServer.js
SERVER_ID=ws2 PORT=8081 node wsServer.js


Redis (same instance) will act as:

- Presence store

- Friend mapping store

- Pub/Sub transport layer

💬 Example Flow

- userA connects to ws1 (PORT 8080)

- userC connects to ws2 (PORT 8081)

- Both mark online and subscribe to their friends

- userA sends message to userC

- ws1 publishes to user:userC → Redis → ws2 receives → pushes to socket of userC

✅ No need for them to be on same server
✅ Scaling horizontally just requires all nodes to share the same Redis

🧠 Improvements for Production
- Feature	How
- Friend presence updates	Publish user:status events for friends to subscribe/unsubscribe dynamically
- Message persistence	Store in DB (MongoDB, Cassandra) before publish
- Offline queueing	Use Redis list to queue messages if receiver offline
- Load balancing	Use L4 (TCP) balancer or sticky sessions