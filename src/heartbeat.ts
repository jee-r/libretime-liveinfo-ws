import { WebSocketServer, WebSocket } from 'ws';
import { config } from './config.js';
import { log } from './logger.js';

export function startHeartbeat(wss: WebSocketServer): NodeJS.Timeout {
  const alive = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    alive.add(ws);
    ws.on('pong', () => alive.add(ws));
    ws.on('close', () => alive.delete(ws));
  });

  return setInterval(() => {
    let terminated = 0;
    wss.clients.forEach((ws) => {
      if (!alive.has(ws)) {
        ws.terminate();
        terminated++;
        return;
      }
      alive.delete(ws);
      ws.ping();
    });
    if (terminated > 0) {
      log('info', `Heartbeat: terminated ${terminated} unresponsive client(s)`);
    }
  }, config.heartbeatInterval);
}
