import { config } from './config.js';
import { log } from './logger.js';
import { normalize, comparableSnapshot } from './normalizer.js';
import type { LiveInfo } from './types.js';

export type BroadcastFn = (data: LiveInfo) => void;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

let lastData: LiveInfo | null = null;
let lastSnapshot: string | null = null;
let lastPollTime: string | null = null;

export function getLastData(): LiveInfo | null {
  return lastData;
}

export function getLastPollTime(): string | null {
  return lastPollTime;
}

async function fetchLiveInfo(): Promise<LiveInfo> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.fetchTimeoutMs);
  try {
    const res = await fetch(config.libretimeUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return res.json() as Promise<LiveInfo>;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Fetch timed out after ${config.fetchTimeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function start(broadcast: BroadcastFn): void {
  void pollLoop(broadcast);
}

async function pollLoop(broadcast: BroadcastFn): Promise<void> {
  let retryDelay = config.retryInitialDelay;

  while (true) {
    try {
      const raw = await fetchLiveInfo();
      const data = config.normalizeDates ? normalize(raw) : raw;
      const snapshot = comparableSnapshot(data);

      if (snapshot !== lastSnapshot) {
        lastSnapshot = snapshot;
        lastData = data;
        broadcast(data);
        log('debug', `Track changed: ${data.tracks.current?.name ?? 'unknown'}`);
      }

      lastPollTime = new Date().toISOString();
      retryDelay = config.retryInitialDelay;
      await sleep(config.pollInterval);
    } catch (err) {
      log('error', `Poll failed: ${err instanceof Error ? err.message : String(err)}`);
      await sleep(retryDelay);
      retryDelay = Math.min(retryDelay * 2, config.retryMaxDelay);
    }
  }
}
