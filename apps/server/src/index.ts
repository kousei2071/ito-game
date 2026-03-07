import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socket.js';

const PORT = Number(process.env.PORT) || 3001;

const app = express();
app.use(cors());
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);
  registerSocketHandlers(io, socket);
  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 ito server listening on http://localhost:${PORT}`);
});
