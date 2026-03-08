import { io, Socket } from 'socket.io-client';

const configuredUrl = import.meta.env.VITE_SERVER_URL;

function resolveRuntimeOverrideUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const searchParams = new URLSearchParams(window.location.search);
  const fromQuery = searchParams.get('server');
  if (fromQuery) {
    const normalized = fromQuery.trim();
    if (normalized) {
      localStorage.setItem('ito_server_url', normalized);
      return normalized;
    }
  }

  const fromStorage = localStorage.getItem('ito_server_url');
  return fromStorage?.trim() || null;
}

function resolveSocketUrl(): string {
  const runtimeOverride = resolveRuntimeOverrideUrl();
  const base = runtimeOverride || configuredUrl || (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

  if (!import.meta.env.DEV && window.location.protocol === 'https:' && base.startsWith('http://')) {
    return base.replace('http://', 'https://');
  }

  return base;
}

export const SOCKET_URL = resolveSocketUrl();

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
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
