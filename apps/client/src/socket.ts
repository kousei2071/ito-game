import { io, Socket } from 'socket.io-client';

const configuredUrl = import.meta.env.VITE_SERVER_URL;
const URL = configuredUrl || (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 800,
      timeout: 10000,
    });
  }
  return socket;
}
