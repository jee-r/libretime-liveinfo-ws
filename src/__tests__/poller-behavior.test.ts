import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LiveInfo } from '../types.js';

vi.mock('../config.js', () => ({
  config: {
    libretimeUrl: 'http://test/api/live-info',
    pollInterval: 50,
    retryInitialDelay: 100,
    retryMaxDelay: 400,
    normalizeDates: false,
    logLevel: 'error',
  },
}));
vi.mock('../logger.js', () => ({ log: vi.fn() }));

function makeData(schedulerTime: string, trackStarts: string): LiveInfo {
  return {
    station: {
      env: 'production',
      schedulerTime,
      source_enabled: 'Scheduled',
      timezone: 'Europe/Paris',
      AIRTIME_API_VERSION: '1.1',
    },
    tracks: {
      previous: null,
      current: {
        starts: trackStarts,
        ends: '2026-04-27 11:00:00',
        type: 'track',
        name: 'Test Track',
        metadata: {} as never,
      },
      next: null,
    },
    shows: { previous: [], current: null, next: [] },
    sources: { livedj: 'off', masterdj: 'off', scheduledplay: 'on' },
  };
}

function mockResponse(data: LiveInfo): Response {
  return { ok: true, json: async () => data } as unknown as Response;
}

describe('poller behavior', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('calls broadcast with data on first successful fetch', async () => {
    const { start } = await import('../poller.js');
    const data = makeData('10:00:00', '10:00:00');
    fetchMock.mockResolvedValue(mockResponse(data));

    const broadcast = vi.fn();
    start(broadcast);
    await vi.advanceTimersByTimeAsync(0);

    expect(broadcast).toHaveBeenCalledOnce();
    expect(broadcast).toHaveBeenCalledWith(data);
  });

  it('does not broadcast again when only schedulerTime changes', async () => {
    const { start } = await import('../poller.js');
    fetchMock
      .mockResolvedValueOnce(mockResponse(makeData('10:00:00', '10:00:00')))
      .mockResolvedValueOnce(mockResponse(makeData('10:00:01', '10:00:00')));

    const broadcast = vi.fn();
    start(broadcast);

    await vi.advanceTimersByTimeAsync(0);   // first poll
    await vi.advanceTimersByTimeAsync(50);  // wait pollInterval
    await vi.advanceTimersByTimeAsync(0);   // second poll

    expect(broadcast).toHaveBeenCalledOnce();
  });

  it('broadcasts again when track changes', async () => {
    const { start } = await import('../poller.js');
    fetchMock
      .mockResolvedValueOnce(mockResponse(makeData('10:00:00', '10:00:00')))
      .mockResolvedValueOnce(mockResponse(makeData('10:30:01', '10:30:00')));

    const broadcast = vi.fn();
    start(broadcast);

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(50);
    await vi.advanceTimersByTimeAsync(0);

    expect(broadcast).toHaveBeenCalledTimes(2);
  });

  it('does not broadcast on fetch failure', async () => {
    const { start } = await import('../poller.js');
    fetchMock.mockRejectedValue(new Error('Network error'));

    const broadcast = vi.fn();
    start(broadcast);
    await vi.advanceTimersByTimeAsync(0);

    expect(broadcast).not.toHaveBeenCalled();
  });

  it('retries with exponential backoff then broadcasts on success', async () => {
    const { start } = await import('../poller.js');
    const data = makeData('10:00:00', '10:00:00');
    fetchMock
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue(mockResponse(data));

    const broadcast = vi.fn();
    start(broadcast);

    await vi.advanceTimersByTimeAsync(0);    // first fetch fails
    expect(broadcast).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(100);  // retryInitialDelay
    await vi.advanceTimersByTimeAsync(0);    // second fetch fails
    expect(broadcast).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(200);  // retryInitialDelay * 2 (backoff)
    await vi.advanceTimersByTimeAsync(0);    // third fetch succeeds
    expect(broadcast).toHaveBeenCalledOnce();
  });

  it('resets backoff to pollInterval after successful fetch', async () => {
    const { start } = await import('../poller.js');
    fetchMock
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(mockResponse(makeData('10:00:00', '10:00:00')))
      .mockResolvedValueOnce(mockResponse(makeData('10:30:00', '10:30:00')));

    const broadcast = vi.fn();
    start(broadcast);

    // First fetch fails, wait retryInitialDelay (100ms)
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(0);   // second fetch succeeds
    expect(broadcast).toHaveBeenCalledOnce();

    // Next poll should use pollInterval (50ms), not backoff (200ms)
    await vi.advanceTimersByTimeAsync(50);
    await vi.advanceTimersByTimeAsync(0);
    expect(broadcast).toHaveBeenCalledTimes(2);
  });
});
