import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketServer } from 'ws';
import { startHeartbeat } from '../heartbeat.js';

vi.mock('../config.js', () => ({
  config: { heartbeatInterval: 100, logLevel: 'error' },
}));
vi.mock('../logger.js', () => ({ log: vi.fn() }));

type MockClient = {
  ping: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  simulatePong: () => void;
  simulateClose: () => void;
};

function createMockClient(): MockClient {
  const handlers: Record<string, Array<() => void>> = {};
  return {
    ping: vi.fn(),
    terminate: vi.fn(),
    on: vi.fn((event: string, handler: () => void) => {
      (handlers[event] ??= []).push(handler);
    }),
    simulatePong: () => handlers['pong']?.forEach(h => h()),
    simulateClose: () => handlers['close']?.forEach(h => h()),
  };
}

describe('heartbeat', () => {
  let wss: WebSocketServer;

  beforeEach(() => {
    vi.useFakeTimers();
    wss = new WebSocketServer({ noServer: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    wss.close();
  });

  function addClient(mock: MockClient): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (wss as any).clients.add(mock);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wss.emit('connection', mock as any);
  }

  it('pings all connected clients on each interval tick', () => {
    const interval = startHeartbeat(wss);
    const mock = createMockClient();
    addClient(mock);

    vi.advanceTimersByTime(100);

    expect(mock.ping).toHaveBeenCalledOnce();
    clearInterval(interval);
  });

  it('terminates clients that do not respond to ping', () => {
    const interval = startHeartbeat(wss);
    const mock = createMockClient();
    addClient(mock);

    vi.advanceTimersByTime(100);
    expect(mock.ping).toHaveBeenCalledOnce();
    expect(mock.terminate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(mock.terminate).toHaveBeenCalledOnce();

    clearInterval(interval);
  });

  it('keeps alive clients that respond with pong', () => {
    const interval = startHeartbeat(wss);
    const mock = createMockClient();
    addClient(mock);

    vi.advanceTimersByTime(100);
    expect(mock.ping).toHaveBeenCalledOnce();

    mock.simulatePong();

    vi.advanceTimersByTime(100);
    expect(mock.terminate).not.toHaveBeenCalled();
    expect(mock.ping).toHaveBeenCalledTimes(2);

    clearInterval(interval);
  });

  it('does not ping clients that have disconnected', () => {
    const interval = startHeartbeat(wss);
    const mock = createMockClient();
    addClient(mock);

    mock.simulateClose();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (wss as any).clients.delete(mock);

    vi.advanceTimersByTime(100);
    expect(mock.ping).not.toHaveBeenCalled();
    expect(mock.terminate).not.toHaveBeenCalled();

    clearInterval(interval);
  });
});
