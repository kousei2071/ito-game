import { io, Socket } from 'socket.io-client';

const configuredUrl = import.meta.env.VITE_SERVER_URL;

function resolveSocketUrl(): string {
  const base = configuredUrl || (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

  if (!import.meta.env.DEV && window.location.protocol === 'https:' && base.startsWith('http://')) {
    return base.replace('http://', 'https://');
  }

  return base;
}

const URL = resolveSocketUrl();

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(URL, {
      autoConnect: true,
      transports: ['polling', 'websocket'],
      tryAllTransports: true,
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
  }
  return socket;
}
