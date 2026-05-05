import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from './config.js';
import { log } from './logger.js';
import { start, getLastData, getLastPollTime } from './poller.js';
import { startHeartbeat } from './heartbeat.js';
import type { LiveInfo } from './types.js';

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      clients: wss.clients.size,
      lastPoll: getLastPollTime(),
    }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ noServer: true });
const heartbeatTimer = startHeartbeat(wss);

server.on('upgrade', (req, socket, head) => {
  if (req.url === '/ws/live-info') {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  log('info', `Client connected (total: ${wss.clients.size})`);

  const initial = getLastData();
  if (initial) {
    ws.send(JSON.stringify(initial));
  }

  ws.on('close', () => {
    log('info', `Client disconnected (total: ${wss.clients.size})`);
  });

  ws.on('error', (err) => {
    log('error', `WebSocket client error: ${err.message}`);
  });
});

function broadcast(data: LiveInfo): void {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
  log('debug', `Broadcast to ${wss.clients.size} client(s)`);
}

server.listen(config.port, () => {
  log('info', `Listening on port ${config.port}`);
  log('info', `Polling ${config.libretimeUrl} every ${config.pollInterval}ms`);
  start(broadcast);
});

function shutdown(): void {
  log('info', 'Shutting down...');
  clearInterval(heartbeatTimer);
  wss.clients.forEach((client) => client.close());
  wss.close(() => server.close(() => process.exit(0)));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
