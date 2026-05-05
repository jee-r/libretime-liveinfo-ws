# libretime-liveinfo-ws

WebSocket bridge for LibreTime's `/api/live-info-v2`. Runs co-located with LibreTime, polls locally every second, detects track changes, and pushes them to all connected clients — replacing N independent network polls with a single persistent WebSocket connection.

```
[LibreTime server]
  LibreTime :80
       ↑ poll HTTP local (1s)
  libretime-api-ws-bridge :3001
       └── WS /ws/live-info ──────────────→ consumers
```

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | `{ status, clients, lastPoll }` |
| `WS /ws/live-info` | Push JSON on every track change |

New WebSocket clients immediately receive the last known state on connect.

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LIBRETIME_URL` | yes | — | Full URL to `/api/live-info-v2` |
| `PORT` | no | `3001` | HTTP/WS listen port |
| `POLL_INTERVAL` | no | `1000` | Poll interval in ms |
| `LOG_LEVEL` | no | `info` | `debug` \| `info` \| `error` |
| `RETRY_INITIAL_DELAY` | no | `1000` | Initial retry delay in ms on poll failure |
| `RETRY_MAX_DELAY` | no | `30000` | Max retry delay (exponential backoff cap) |
| `FETCH_TIMEOUT_MS` | no | `5000` | Max time to wait for LibreTime to respond |
| `HEARTBEAT_INTERVAL` | no | `30000` | WebSocket ping interval in ms |
| `NORMALIZE_DATES` | no | `false` | Convert station-local timestamps to UTC ISO 8601 |

Copy `.env.sample` to `.env` and set `LIBRETIME_URL`.

## Connection reliability

The server sends a WebSocket **ping** to every connected client every `HEARTBEAT_INTERVAL` ms. Clients that do not respond with a pong within the next interval are terminated.

The native browser `WebSocket` responds to pings automatically. If the server restarts or a client is terminated, **no automatic reconnection happens** — the client must handle it:

```javascript
function connect() {
  const ws = new WebSocket('ws://host/ws/live-info');
  ws.onmessage = (e) => console.log(JSON.parse(e.data));
  ws.onclose = () => setTimeout(connect, 3000);
}
connect();
```

## Running

### Development (pnpm)

```bash
pnpm install
pnpm dev        # tsx watch, hot reload, loads .env automatically
```

### Production (pnpm)

```bash
pnpm install
pnpm build
pnpm start
```

### Production (Podman / Docker)

> **Note:** the build file is named `Containerfile` (Podman convention). Podman detects it automatically. With Docker, pass `-f Containerfile` explicitly.

```bash
# Build
podman build --network host -t libretime-api-ws-bridge .

# Run — adapt network name and hostname to match your LibreTime setup
podman run -d \
  --name libretime-api-ws-bridge \
  --network libretime \
  -p 3001:3001 \
  -e LIBRETIME_URL=http://libretime/api/live-info-v2 \
  libretime-api-ws-bridge

# Systemd unit for auto-restart
podman generate systemd --name libretime-api-ws-bridge \
  > /etc/systemd/system/libretime-api-ws-bridge.service
systemctl enable --now libretime-api-ws-bridge
```

## Testing

**Health check:**

```bash
curl http://localhost:3001/health
```

**WebSocket via curl:**

```bash
curl --include \
     --no-buffer \
     --http1.1 \
     -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
     -H "Sec-WebSocket-Version: 13" \
     http://localhost:3001/ws/live-info
```

**WebSocket — receive all messages (Node.js, no extra install):**

```bash
node -e "
const ws = new (require('ws'))('ws://localhost:3001/ws/live-info');
ws.on('message', d => console.log(JSON.parse(d)));
"
```

**WebSocket — track current song only:**

```bash
node -e "
const ws = new (require('ws'))('ws://localhost:3001/ws/live-info');
ws.on('message', d => console.log(JSON.parse(d).tracks?.current?.name));
"
```
