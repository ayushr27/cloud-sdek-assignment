import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';

const userSockets = new Map<string, WebSocket>();
let wss: WebSocketServer;

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    let currentUserId: string | null = null;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'join' && data.userId) {
          currentUserId = String(data.userId);
          userSockets.set(currentUserId, ws);
          console.log(`[WS] User ${currentUserId} joined stream.`);
        }
      } catch (err) {
        console.error('WebSocket message parse error', err);
      }
    });

    ws.on('close', () => {
      if (currentUserId) {
        userSockets.delete(currentUserId);
      }
    });
  });
}

export function emitToUser(userId: string, event: string, payload: any) {
  const ws = userSockets.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event, data: payload }));
  }
}
